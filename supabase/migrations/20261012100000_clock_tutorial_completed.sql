-- The first-run tour is now PER CLOCK instead of per account: every newly created clock gets the
-- guided tour until THAT clock's owner completes or skips it. Completion is stamped on the clock
-- (clocks.tutorial_completed), not on the profile — so creating a second clock starts the tour
-- again, while a clock the owner has already toured never nags.
--
-- 1. clocks.tutorial_completed — default false, so a new clock is armed. Every EXISTING clock is
--    backfilled to true so the tour never unexpectedly appears on clocks created before this
--    change (the owner already had their chance, under the old per-account gate).
-- 2. complete_tutorial(p_clock_id) — the definer RPC now writes the CLOCK's flag, owner-only. The
--    no-arg profile overload is dropped: it only just shipped and is referenced nowhere once
--    ClockViewer moves to the new signature.
-- 3. hydrate_clock flags the level-2 poll tutorial = true based on THAT clock's flag, not the
--    owner's profile flag, so a brand-new clock always gets the tutorial poll on its owner's L2.
-- 4. profiles.tutorial_completed is left in place as a legacy column, no longer read anywhere.

alter table public.clocks
  add column if not exists "tutorial_completed" boolean not null default false;

-- Backfill: pre-existing clocks must not suddenly run the tour for their owners.
update public.clocks
   set "tutorial_completed" = true
 where not coalesce("tutorial_completed", false);

-- 2. Completion now belongs to the clock. The old profile-level overload that shipped with the
--    first-run tour is dropped — every caller moves to the clock form.
drop function if exists public.complete_tutorial();

create or replace function public.complete_tutorial (
  p_clock_id uuid
)
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
declare
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to continue';
  end if;
  select "user_id" into v_owner from public.clocks where "id" = p_clock_id;
  if v_owner is null then
    raise exception 'Clock not found';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'Not your clock';
  end if;
  update public.clocks
     set "tutorial_completed" = true
   where "id" = p_clock_id;
end;
$function$;

revoke all on function public.complete_tutorial(uuid) from public, anon, service_role;
grant execute on function public.complete_tutorial(uuid) to authenticated, postgres;

-- 3. Hydration writer. Identical to 20261011140000 apart from the tutorial flag now reading the
--    CLOCK's own completion state instead of the owner's profile flag, so every new clock's L2
--    poll is the tutorial poll until that clock has been toured.
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
begin
  select c."user_id" = v_uid, c."level", c."boost_order", c."boosts", c."tutorial_completed"
    into v_is_owner, v_prev_level, v_boost_order, v_equipped, v_clock_toured
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
    v_amount    := least(greatest(coalesce(amount, 0), 0), greatest(v_quota - v_drop_used, 0));
    v_drop_used := v_drop_used + v_amount;
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