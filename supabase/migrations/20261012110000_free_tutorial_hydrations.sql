-- Owner hydrations on their OWN clock are free until that clock reaches level 2 (10 hydrations).
-- The shared daily drop (user_hydrates) was introduced so one user's hydrations are capped across
-- every clock, but that also gated the owner's own clock: the first-run tutorial asks the owner to
-- hydrate their new clock 10 times to reach L2, and a user who had already spent their drop on
-- other clocks could never get there. The first 10 owner hydrations on a clock now bypass the pool
-- entirely; only the overflow past L2 spends it. Hydrations still count toward clocks.hydrate_count
-- / level as normal, and the 3-live cap plus "drafts can't be hydrated" keep the freebie bounded to
-- a handful of low-level clocks per user.
--
-- The literal 10 mirrors quest_level()'s first threshold, i.e. QUEST_LEVELS[0].hydrations in
-- src/utils/boost.js. Keep all three in step.

create or replace function public.hydrate_clock (
  target uuid,
  amount integer
)
  returns json
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
declare
  v_uid              uuid := auth.uid();
  v_hydrate_count    bigint;
  v_level            integer;
  v_amount           integer := 0;
  v_prev_hydrate     bigint;
  v_becomes_hydrator boolean := false;
  v_is_owner         boolean;
  v_prev_level       integer;
  v_boost_order      jsonb;
  v_equipped         jsonb;
  v_lvl              integer;
  v_candidates       text[];
  v_drop_today       date := (now() at time zone 'UTC')::date;
  v_quota            integer := 15 + (((floor(extract(epoch from (now() at time zone 'UTC')::date) / 86400)::bigint % 11) + 11) % 11);
  v_drop_used        integer := 0;
  v_clock_toured     boolean := false;
  v_prev_count       bigint := 0;
  v_free             integer := 0;
  v_spend            integer := 0;
begin
  select c."user_id" = v_uid, c."level", c."boost_order", c."boosts", c."tutorial_completed", c."hydrate_count"
    into v_is_owner, v_prev_level, v_boost_order, v_equipped, v_clock_toured, v_prev_count
    from public.clocks c
   where c."id" = target
     for update;

  if v_is_owner is null then
    raise exception 'Clock not found';
  end if;

  if v_is_owner then
    -- Lock the caller's pool AFTER the clocks row. Two of the owner's clocks hydrated at once
    -- therefore queue on the same user row instead of deadlocking on each other's clock row.
    insert into public.user_hydrates ("user_id", "drop_day", "drop_used")
    values (v_uid, v_drop_today, 0)
    on conflict ("user_id") do nothing;

    select case when u."drop_day" = v_drop_today then u."drop_used" else 0 end
      into v_drop_used
      from public.user_hydrates u
     where u."user_id" = v_uid
       for update;

    v_drop_used := coalesce(v_drop_used, 0);
    -- Free allowance: every owner hydration up to the clock's 10th (the 10 needed to reach L2) is
    -- on the house; only the amount beyond that is capped by and charged to the daily pool.
    v_free      := case when coalesce(v_prev_level, 1) < 2
                        then least(greatest(coalesce(amount, 0), 0), greatest(0, 10 - coalesce(v_prev_count, 0)))
                        else 0 end;
    v_spend     := least(greatest(coalesce(amount, 0), 0) - v_free, greatest(v_quota - v_drop_used, 0));
    v_amount    := v_free + v_spend;
    v_drop_used := v_drop_used + v_spend;
  else
    v_amount := least(greatest(coalesce(amount, 0), 0), 1);
  end if;

  if v_amount > 0 then
    select f."hydrate_count"
      into v_prev_hydrate
      from public.follows f
     where f."user_id" = v_uid
       and f."clock_id" = target;

    v_becomes_hydrator := (v_prev_hydrate is null)
                          or (coalesce(v_prev_hydrate, 0) <= 0);

    insert into public.follows ("user_id", "clock_id", "hydrate_count")
    values (v_uid, target, v_amount)
    on conflict ("user_id", "clock_id")
    do update set "hydrate_count" = public.follows."hydrate_count" + excluded."hydrate_count";

    update public.clocks
       set "hydrate_count"       = "hydrate_count" + v_amount,
           "level"               = public.quest_level("hydrate_count" + v_amount),
           "hydrator_count"      = "hydrator_count" + case when v_becomes_hydrator then 1 else 0 end,
           "owner_hydrate_count" = "owner_hydrate_count" + case when v_is_owner then v_amount else 0 end
     where "id" = target
     returning "hydrate_count", "level" into v_hydrate_count, v_level;
  else
    select c."hydrate_count", c."level"
      into v_hydrate_count, v_level
      from public.clocks c
     where c."id" = target;
  end if;

  if v_amount > 0 and v_level > coalesce(v_prev_level, 1) then
    perform public.finalise_due_polls(target);
    select c."boosts" into v_equipped from public.clocks c where c."id" = target;
    for v_lvl in (coalesce(v_prev_level, 1) + 1) .. v_level loop
      select array_agg(x.id order by x.ord)
        into v_candidates
        from unnest(public.revealed_boost_ids(v_boost_order, v_lvl))
               with ordinality as x(id, ord)
       where x.id <> all (
               select coalesce(e.value ->> 'id', '')
                 from jsonb_array_elements(coalesce(v_equipped, '[]'::jsonb)) as e(value)
             )
         and x.id not in (
               select p."option_a" from public.clock_polls p
                where p."clock_id" = target and p."resolved_at" is null and p."option_a" is not null
                union
               select p."option_b" from public.clock_polls p
                where p."clock_id" = target and p."resolved_at" is null and p."option_b" is not null
             );

      if v_candidates is not null and array_length(v_candidates, 1) >= 1 then
        insert into public.clock_polls ("clock_id", "level", "option_a", "option_b", "closes_at", "tutorial")
        values (
          target,
          v_lvl,
          v_candidates[1],
          case when array_length(v_candidates, 1) >= 2 then v_candidates[2] else null end,
          now() + interval '24 hours',
          (v_lvl = 2 and not coalesce(v_clock_toured, false))
        )
        on conflict ("clock_id", "level") do nothing;
      end if;
    end loop;
  end if;

  if v_is_owner then
    insert into public.user_hydrates ("user_id", "drop_day", "drop_used")
    values (v_uid, v_drop_today, v_drop_used)
    on conflict ("user_id")
    do update set "drop_day"  = excluded."drop_day",
                  "drop_used" = excluded."drop_used";
  end if;

  return json_build_object(
    'hydrate_count', v_hydrate_count,
    'level',         v_level,
    'drop_day',      to_char(v_drop_today, 'YYYY-MM-DD'),
    'drop_used',     v_drop_used
  );
end;
$function$;

revoke all on function public.hydrate_clock(uuid, integer) from public, anon, service_role;
grant execute on function public.hydrate_clock(uuid, integer) to authenticated, postgres;
