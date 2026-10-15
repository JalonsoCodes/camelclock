-- Rename the boost ACTION to "hydrate" across the schema.
--
-- The product now distinguishes the two words: "boosts" are the unlockable effects an owner
-- equips (still stored in clocks.boosts / clocks.boost_order, and still named boost in every
-- helper — normalise_boost_rack, random_boost_order, normalise_boost_order, BOOSTS), while the
-- act of feeding the clock and the people/counts around it are "hydrations" and "hydrators".
-- This migration moves only the action/count/people half of the vocabulary; the effect rack and
-- the effect ladder deliberately keep the word "boost".
--
-- The app already reads the new names (hydrate_count, hydrator_count, owner_hydrate_count,
-- viewer_hydrates, follows.hydrate_count, showcases.start_hydrates) and calls hydrate_clock /
-- get_clock_hydrate_stats, so this migration and the app ship together.
--
-- Everything below runs in one transaction: a column rename would break the PL/pgSQL bodies that
-- still spell the old names, so the functions are redefined in the same migration.

-- 1. Columns. A rename keeps defaults, NOT NULL, comments and grants with the column.
alter table public.clocks  rename column boost_count       to hydrate_count;
alter table public.clocks  rename column booster_count     to hydrator_count;
alter table public.clocks  rename column owner_boost_count to owner_hydrate_count;
alter table public.clocks  rename column viewer_boosts     to viewer_hydrates;
alter table public.follows rename column boost_count       to hydrate_count;
alter table public.showcases rename column start_boosts    to start_hydrates;

comment on column public.clocks.hydrator_count is
  'Distinct users who have hydrated this clock (follows rows with hydrate_count > 0). Maintained by hydrate_clock().';
comment on column public.clocks.owner_hydrate_count is
  'Lifetime hydrations this clock received from its own owner claiming daily drops. Maintained by hydrate_clock().';

-- 2. Per-clock daily-drop state table. Renaming a table preserves its RLS flag, policies,
--    indexes, foreign keys and grants (they are attached by OID, not by name); only the
--    human-readable names need re-pointing.
alter table public.clock_boosts rename to clock_hydrates;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'clock_boosts_pkey') then
    alter table public.clock_hydrates rename constraint clock_boosts_pkey to clock_hydrates_pkey;
  end if;
  if exists (select 1 from pg_constraint where conname = 'clock_boosts_clock_id_fkey') then
    alter table public.clock_hydrates rename constraint clock_boosts_clock_id_fkey to clock_hydrates_clock_id_fkey;
  end if;
  if exists (select 1 from pg_constraint where conname = 'showcases_start_boosts_check') then
    alter table public.showcases rename constraint showcases_start_boosts_check to showcases_start_hydrates_check;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'clock_hydrates' and policyname = 'clock_boosts_select_own') then
    alter policy clock_boosts_select_own on public.clock_hydrates rename to clock_hydrates_select_own;
  end if;
end $$;

-- 3. Quest ladder. Renaming an input parameter is not allowed under CREATE OR REPLACE, so the
--    function is dropped and recreated. Thresholds are unchanged and still mirror QUEST_LEVELS
--    in src/utils/boost.js (L1 at 0, then 10/50/100/250, with 500 the un-passable top rung).
drop function if exists public.quest_level(bigint);

create function public.quest_level (
  p_hydrate_count bigint
)
  returns integer
  language sql
  immutable
  set search_path to 'public'
  as $function$
  select least(5, (select count(*)::int
                    from (values (10), (50), (100), (250), (500)) as q(hydrations)
                    where p_hydrate_count >= q.hydrations) + 1);
$function$;

revoke all on function public.quest_level(bigint) from anon, authenticated, service_role;
grant execute on function public.quest_level(bigint) to public, postgres;

update public.clocks set level = public.quest_level(hydrate_count);

-- 4. The hydration writer. Same body as boost_clock, with the action renamed. It row-locks the
--    clock up front; only this function writes clocks.hydrate_count / level / hydrator_count /
--    owner_hydrate_count. Output keys hydrate_count / level / drop_day / drop_used / missed are
--    what useHydrate.js reads.
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
  v_hydrate_count    bigint;
  v_level            integer;
  v_amount           integer := 0;
  v_prev_hydrate     bigint;
  v_becomes_hydrator boolean := false;
  v_is_owner         boolean;
  v_drop_today       date := (now() at time zone 'UTC')::date;
  v_drop_stored      date;
  v_quota            integer := 10 + (((floor(extract(epoch from (now() at time zone 'UTC')::date) / 86400)::bigint % 11) + 11) % 11);
  v_drop_used        integer := 0;
  v_missed           integer := 0;
begin
  select c."user_id" = auth.uid()
    into v_is_owner
    from public.clocks c
   where c."id" = target
     for update;

  if v_is_owner is null then
    raise exception 'Clock not found';
  end if;

  select b."drop_day", b."drop_used", b."missed"
    into v_drop_stored, v_drop_used, v_missed
    from public.clock_hydrates b
   where b."clock_id" = target;

  -- SELECT ... INTO assigns NULL to every target when no row matches; a brand-new clock has no
  -- clock_hydrates row yet. A tally stored on an earlier day belongs to that day and must not be
  -- charged against today's quota. Mirrors computeDropLeft() in src/utils/boost.js.
  v_missed    := coalesce(v_missed, 0);
  v_drop_used := case when v_drop_stored is null or v_drop_stored < v_drop_today
                      then 0
                      else coalesce(v_drop_used, 0)
                 end;

  if v_is_owner then
    v_amount    := least(greatest(coalesce(amount, 0), 0), greatest(v_quota - v_drop_used, 0));
    v_drop_used := v_drop_used + v_amount;
  else
    -- Visitors hydrate one at a time; the app only ever sends 1. Clamped here so a tampered
    -- client cannot inflate a clock by calling the RPC with a large amount.
    v_amount := least(greatest(coalesce(amount, 0), 0), 1);
  end if;

  -- A zero-amount call is a no-op: no follows row, no donation spent, no counter movement.
  if v_amount > 0 then
    if not v_is_owner and v_missed > 0 then
      v_missed := v_missed - 1;
    end if;

    select f."hydrate_count"
      into v_prev_hydrate
      from public.follows f
     where f."user_id" = auth.uid()
       and f."clock_id" = target;

    -- First hydrate, or the first real hydrate on a legacy 0-count row.
    v_becomes_hydrator := (v_prev_hydrate is null)
                          or (coalesce(v_prev_hydrate, 0) <= 0);

    insert into public.follows ("user_id", "clock_id", "hydrate_count")
    values (auth.uid(), target, v_amount)
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

  insert into public.clock_hydrates ("clock_id", "drop_day", "drop_used", "missed")
  values (target, v_drop_today, v_drop_used, v_missed)
  on conflict ("clock_id")
  do update set "drop_day"  = excluded."drop_day",
                "drop_used" = excluded."drop_used",
                "missed"    = excluded."missed";

  return json_build_object(
    'hydrate_count', v_hydrate_count,
    'level',         v_level,
    'drop_day',      to_char(v_drop_today, 'YYYY-MM-DD'),
    'drop_used',     v_drop_used,
    'missed',        v_missed
  );
end;
$function$;

revoke all on function public.hydrate_clock(uuid, integer) from public, anon, service_role;
grant execute on function public.hydrate_clock(uuid, integer) to authenticated, postgres;

drop function if exists public.boost_clock(uuid, integer);

-- 5. The public stats reader. Output keys rename to hydrate_count / distinct_hydrators /
--    owner_hydrate_count; the top list is unchanged. Read only through useHydrateStats.js.
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
    v_cb record;
    v_top jsonb;
begin
    select c."user_id", c."hydrate_count", c."level", c."hydrator_count", c."owner_hydrate_count"
      into v_owner, v_count, v_level, v_hydrators, v_owner_hydrates
      from clocks c
     where c."id" = v_clid;

    if v_owner is null then
        return null;
    end if;

    select * into v_cb from clock_hydrates cb where cb."clock_id" = v_clid;

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
        'missed', coalesce(v_cb."missed", 0),
        'drop_day', to_char(coalesce(v_cb."drop_day", (now() at time zone 'UTC')::date), 'YYYY-MM-DD'),
        'drop_used', coalesce(v_cb."drop_used", 0),
        'top', v_top
    );
end;
$function$;

revoke all on function public.get_clock_hydrate_stats(uuid, integer) from anon, authenticated, service_role;
grant execute on function public.get_clock_hydrate_stats(uuid, integer) to public, postgres;

drop function if exists public.get_clock_boost_stats(uuid, integer);
