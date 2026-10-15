-- The daily hydration drop becomes a PER-USER pool shared across every clock the owner has,
-- instead of a tally kept per clock. On top of that, the "missed hydrations" donation feature is
-- removed outright: its counter was only ever decremented by visitor hydrations and never
-- incremented anywhere, so it was dead (always 0) and is not worth carrying.
--
-- 1. New table user_hydrates (one row per user): the pool. Owner-read only; the only writer is
--    hydrate_clock (security definer), exactly like clock_hydrates was.
-- 2. hydrate_clock now locks the CALLER's user_hydrates row (after the clocks row, so lock order
--    stays clocks -> user_hydrates) and clamps the owner's spend against the shared quota.
-- 3. get_clock_hydrate_stats returns the CALLER's pool so the owner's spend reconciles, and no
--    longer reports missed.
-- 4. clock_hydrates is dropped — with the drop moved to the user pool and missed gone it holds
--    nothing, and nothing else in the schema reads it.
--
-- Quota 15-25: KEEP IN SYNC with dailyDropQuota() in src/utils/boost.js.

-- 1. The per-user daily pool.
create table if not exists public.user_hydrates (
  "user_id"   uuid    not null,
  "drop_day"  date,
  "drop_used" integer not null default 0,
  constraint "user_hydrates_pkey" primary key ("user_id"),
  constraint "user_hydrates_user_id_fkey" foreign key ("user_id")
    references auth.users("id") on delete cascade
);

alter table public.user_hydrates enable row level security;

-- Owner-read only. There is deliberately no write policy: hydrate_clock is the sole writer.
drop policy if exists "user_hydrates_select_own" on public.user_hydrates;
create policy "user_hydrates_select_own" on public.user_hydrates
  for select
  using (auth.uid() = "user_id");

-- 2. The hydration writer. Same shape as before, except the owner's drop lives on the user row and
--    a brand-new clock no longer needs a per-clock tally row.
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
begin
  select c."user_id" = v_uid, c."level", c."boost_order", c."boosts"
    into v_is_owner, v_prev_level, v_boost_order, v_equipped
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

    -- A tally stored on an earlier day belongs to that day and must not be charged against today.
    -- Mirrors computeDropLeft() in src/utils/boost.js.
    select case when u."drop_day" = v_drop_today then u."drop_used" else 0 end
      into v_drop_used
      from public.user_hydrates u
     where u."user_id" = v_uid
       for update;

    v_drop_used := coalesce(v_drop_used, 0);
    v_amount    := least(greatest(coalesce(amount, 0), 0), greatest(v_quota - v_drop_used, 0));
    v_drop_used := v_drop_used + v_amount;
  else
    -- Visitors hydrate one at a time; the app only ever sends 1. Clamped here so a tampered
    -- client cannot inflate a clock by calling the RPC with a large amount.
    v_amount := least(greatest(coalesce(amount, 0), 0), 1);
  end if;

  -- A zero-amount call is a no-op: no follows row, no pool spend, no counter movement.
  if v_amount > 0 then
    select f."hydrate_count"
      into v_prev_hydrate
      from public.follows f
     where f."user_id" = v_uid
       and f."clock_id" = target;

    -- First hydrate, or the first real hydrate on a legacy 0-count row.
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
    -- Report the untouched current state so the client's re-sync still works.
    select c."hydrate_count", c."level"
      into v_hydrate_count, v_level
      from public.clocks c
     where c."id" = target;
  end if;

  -- Resolve anything overdue, then deal a poll for every level this call crossed. Options are the
  -- first two revealed gated effects that are neither equipped nor reserved by an open poll; a
  -- level with only one candidate gets a one-option poll.
  if v_amount > 0 and v_level > coalesce(v_prev_level, 1) then
    perform public.finalise_due_polls(target);
    -- finalise_due_polls may have just merged a winner into clocks.boosts, so re-read the rack:
    -- a fresh winner must count as equipped and cannot be re-offered as a candidate below.
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
        insert into public.clock_polls ("clock_id", "level", "option_a", "option_b", "closes_at")
        values (
          target,
          v_lvl,
          v_candidates[1],
          case when array_length(v_candidates, 1) >= 2 then v_candidates[2] else null end,
          now() + interval '24 hours'
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

-- 3. The public stats reader. Same output as before minus 'missed'; drop_day/drop_used now come
--    from the CALLER's own pool (the owner's entitlements) rather than the clock's row.
create or replace function public.get_clock_hydrate_stats (
  clock_id  uuid,
  top_limit integer default 5
)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public', 'auth'
  as $function$
declare
    v_clid uuid := clock_id;
    v_tlim integer := coalesce(top_limit, 5);
    v_owner uuid;
    v_count bigint;
    v_level integer;
    v_hydrators integer;
    v_owner_hydrates bigint;
    v_drop_day date;
    v_drop_used integer;
    v_top jsonb;
begin
    select c."user_id", c."hydrate_count", c."level", c."hydrator_count", c."owner_hydrate_count"
      into v_owner, v_count, v_level, v_hydrators, v_owner_hydrates
      from clocks c
     where c."id" = v_clid;

    if v_owner is null then
        return null;
    end if;

    select u."drop_day",
           case when u."drop_day" = (now() at time zone 'UTC')::date then u."drop_used" else 0 end
      into v_drop_day, v_drop_used
      from public.user_hydrates u
     where u."user_id" = auth.uid();

    select coalesce(jsonb_agg(t), '[]'::jsonb) into v_top
    from (
        select coalesce(fp."username", 'CAMELCLOCK MEMBER') as username,
               f."hydrate_count" as count,
               coalesce(f."user_id" = auth.uid(), false) as is_you
          from follows f
          join profiles fp on fp."id" = f."user_id"
         where f."clock_id" = v_clid
           and f."hydrate_count" > 0
           and (fp."username" is not null or f."user_id" = auth.uid())
         order by f."hydrate_count" desc, fp."username" asc nulls last, is_you desc
         limit greatest(0, v_tlim)
    ) t;

    return jsonb_build_object(
        'hydrate_count', coalesce(v_count, 0),
        'level', coalesce(v_level, 1),
        'distinct_hydrators', coalesce(v_hydrators, 0),
        'owner_hydrate_count', coalesce(v_owner_hydrates, 0),
        'drop_day', to_char(coalesce(v_drop_day, (now() at time zone 'UTC')::date), 'YYYY-MM-DD'),
        'drop_used', coalesce(v_drop_used, 0),
        'top', v_top
    );
end;
$function$;

revoke all on function public.get_clock_hydrate_stats(uuid, integer) from anon, authenticated, service_role;
grant execute on function public.get_clock_hydrate_stats(uuid, integer) to public, postgres;

-- 4. The old per-clock drop table is now unused by the schema.
drop table if exists public.clock_hydrates;
