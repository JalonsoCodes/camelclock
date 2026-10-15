-- First-run tutorial support.
--
-- 1. profiles.tutorial_completed — a single boolean gating whether the guided tour still shows for
--    this owner. Written only through complete_tutorial() (profiles has no client write path).
-- 2. clock_polls.tutorial — the level-2 poll a new owner first meets. It resolves on a single vote
--    so the tour can teach the vote mechanic immediately; every later poll uses the normal
--    quorum/24h rules.
-- 3. hydrate_clock flags the level-2 poll as tutorial when the OWNER has not completed the tour,
--    no matter who hydrates the clock.
-- 4. poll_ready treats a tutorial poll as ready at one vote.
-- 5. get_clock_polls exposes the flag so the tour and banner can adapt.

-- 1. Completion flag.
alter table public.profiles
  add column if not exists "tutorial_completed" boolean not null default false;

create or replace function public.complete_tutorial ()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
begin
  if auth.uid() is null then
    raise exception 'Sign in to continue';
  end if;
  update public.profiles
     set "tutorial_completed" = true
   where "id" = auth.uid();
end;
$function$;

revoke all on function public.complete_tutorial() from public, anon, service_role;
grant execute on function public.complete_tutorial() to authenticated, postgres;

-- 2. Tutorial poll marker.
alter table public.clock_polls
  add column if not exists "tutorial" boolean not null default false;

-- 3. Hydration writer. Identical to 20261011120000 apart from the poll insert carrying the
--    tutorial flag: a level-2 poll is the tutorial poll while its owner hasn't finished the tour.
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
  v_owner_id         uuid;
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
  v_owner_incomplete boolean := false;
begin
  select c."user_id", c."user_id" = v_uid, c."level", c."boost_order", c."boosts"
    into v_owner_id, v_is_owner, v_prev_level, v_boost_order, v_equipped
    from public.clocks c
   where c."id" = target
     for update;

  if v_is_owner is null then
    raise exception 'Clock not found';
  end if;

  select (not coalesce(p."tutorial_completed", false))
    into v_owner_incomplete
    from public.profiles p
   where p."id" = v_owner_id;

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
          (v_lvl = 2 and v_owner_incomplete)
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

-- 4. Readiness. A tutorial poll resolves on its first vote; everything else keeps the quorum rules.
create or replace function public.poll_ready (
  p public.clock_polls
)
  returns boolean
  language sql
  stable
  set search_path to 'public'
  as $function$
  select p."resolved_at" is null
     and (
          (p."tutorial" and (p."votes_a" + p."votes_b") >= 1)
       or now() >= p."closes_at"
       or (
            (p."votes_a" + p."votes_b") >= public.poll_quorum()
        and p."votes_a" <> p."votes_b"
        and now() >= p."created_at" + make_interval(secs => public.poll_min_open_secs())
          )
     );
$function$;

revoke all on function public.poll_ready(public.clock_polls) from public, anon, authenticated, service_role;
grant execute on function public.poll_ready(public.clock_polls) to postgres;

-- 5. Public poll reader now carries the tutorial flag.
create or replace function public.get_clock_polls (
  p_clock_id uuid
)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
declare
  v_uid     uuid := auth.uid();
  v_visible boolean;
  v_out     jsonb;
begin
  select (c."status" = 'live' or c."user_id" = v_uid)
    into v_visible
    from public.clocks c
   where c."id" = p_clock_id;

  if coalesce(v_visible, false) is not true then
    return '[]'::jsonb;
  end if;

  perform public.finalise_due_polls(p_clock_id);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id',          p."id",
           'level',       p."level",
           'option_a',    p."option_a",
           'option_b',    p."option_b",
           'votes_a',     p."votes_a",
           'votes_b',     p."votes_b",
           'created_at',  p."created_at",
           'closes_at',   p."closes_at",
           'resolved_at', p."resolved_at",
           'winner',      p."winner",
           'tutorial',    p."tutorial",
           'my_choice',   (select v."choice" from public.clock_poll_votes v
                            where v."poll_id" = p."id" and v."user_id" = v_uid)
         ) order by p."level"), '[]'::jsonb)
    into v_out
    from public.clock_polls p
   where p."clock_id" = p_clock_id;

  return v_out;
end;
$function$;

revoke all on function public.get_clock_polls(uuid) from anon, authenticated, service_role;
grant execute on function public.get_clock_polls(uuid) to public, postgres;
