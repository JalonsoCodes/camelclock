-- Boost count integrity.
--
-- Four defects fixed here, all in one transaction so no boost can interleave with the
-- one-shot backfills:
--
--   1. follows upsert wrote boost_count = 0 on the INSERT branch, so a user's first-ever
--      boost on a clock recorded 0 and stayed permanently one behind. Both
--      get_clock_boost_stats and count_clock_boosters filter on boost_count > 0, so that
--      booster was also invisible in BOOSTERS and TOP BOOSTERS until they boosted again.
--   2. The owner's daily quota was clamped against drop_used read from storage without
--      checking drop_day, so a day-old tally was charged against today's quota. The app's
--      computeDropLeft() already reset correctly, so the two disagreed and owners got
--      blocked early.
--   3. distinct boosters was computed with a live COUNT(DISTINCT) over follows on every read
--      and needed a SECURITY DEFINER RPC for the dashboard. It is now a maintained column.
--   4. get_clock_boost_stats held clocks.boost_count (bigint) in an integer, so the count
--      would have overflowed past 2147483647.
--
-- The owner is deliberately kept in TOP BOOSTERS and in booster_count: claiming a daily
-- drop is a real boost of your own clock.

ALTER TABLE "public"."clocks"
  ADD COLUMN IF NOT EXISTS "booster_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "owner_boost_count" bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN "public"."clocks"."booster_count" IS 'Distinct users who have boosted this clock (follows rows with boost_count > 0). Maintained by boost_clock().';
COMMENT ON COLUMN "public"."clocks"."owner_boost_count" IS 'Lifetime boosts this clock received from its own owner claiming daily drops. Maintained by boost_clock().';

-- Repair the follows rows the buggy upsert shorted, before the fixed upsert starts writing
-- correct values.
--
-- A blanket "+1 on every row" is NOT safe: rows created by the pre-boost_clock follow system
-- are not short. Such a row is only repaired when its clock carries the exact signature of
-- the bug -- clocks.boost_count equal to the sum of the clock's follows rows plus one per row
-- -- meaning every row on that clock is short by exactly one. Clocks that mix legacy and new
-- rows fail the test and are left untouched, which under-corrects rather than over-counts.
-- The test is self-invalidating, so a re-run is a no-op.
UPDATE "public"."follows" f
   SET "boost_count" = f."boost_count" + 1
  FROM "public"."clocks" c
 WHERE c."id" = f."clock_id"
   AND c."boost_count" = (SELECT COALESCE(sum(f2."boost_count"), 0) + count(*)
                            FROM "public"."follows" f2
                           WHERE f2."clock_id" = c."id");

-- Seed the new columns from the repaired follows data.
UPDATE "public"."clocks" c
   SET "booster_count" = COALESCE(s.n, 0)
  FROM (SELECT "clock_id", count(*)::int AS n
          FROM "public"."follows"
         WHERE "boost_count" > 0
         GROUP BY "clock_id") s
 WHERE s."clock_id" = c."id";

UPDATE "public"."clocks" c
   SET "owner_boost_count" = COALESCE(s.n, 0)
  FROM (SELECT f."clock_id", sum(f."boost_count")::bigint AS n
          FROM "public"."follows" f
          JOIN "public"."clocks" c2 ON c2."id" = f."clock_id"
         WHERE f."user_id" = c2."user_id"
         GROUP BY f."clock_id") s
 WHERE s."clock_id" = c."id";

CREATE OR REPLACE FUNCTION public.boost_clock (
  target uuid,
  amount integer
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_boost_count bigint;
  v_level       integer;
  v_amount      integer := 0;
  v_is_new      boolean := false;
  v_is_owner    boolean;
  v_drop_today  date := (now() at time zone 'UTC')::date;
  v_drop_stored date;
  v_quota       integer := 10 + (((floor(extract(epoch from (now() at time zone 'UTC')::date) / 86400)::bigint % 11) + 11) % 11);
  v_drop_used   integer := 0;
  v_missed      integer := 0;
BEGIN
  -- Lock the clock row up front so concurrent boosts on the same clock serialise here
  -- rather than racing on the clock_boosts read below.
  SELECT c."user_id" = auth.uid()
    INTO v_is_owner
    FROM public.clocks c
   WHERE c."id" = target
     FOR UPDATE;

  IF v_is_owner IS NULL THEN
    RAISE EXCEPTION 'Clock not found';
  END IF;

  SELECT b."drop_day", b."drop_used", b."missed"
    INTO v_drop_stored, v_drop_used, v_missed
    FROM public.clock_boosts b
   WHERE b."clock_id" = target;

  v_missed := COALESCE(v_missed, 0);

  -- The stored tally belongs to v_drop_stored. Anything older than today starts from zero.
  IF v_drop_stored IS NOT NULL AND v_drop_stored >= v_drop_today THEN
    v_drop_used := COALESCE(v_drop_used, 0);
  END IF;

  IF v_is_owner THEN
    v_amount    := LEAST(GREATEST(COALESCE(amount, 0), 0), GREATEST(v_quota - v_drop_used, 0));
    v_drop_used := v_drop_used + v_amount;
  ELSE
    -- Visitors boost one at a time; the app only ever sends 1. Clamped here so a tampered
    -- client cannot inflate a clock by calling the RPC with a large amount.
    v_amount := LEAST(GREATEST(COALESCE(amount, 0), 0), 1);
    IF v_missed > 0 THEN
      v_missed := v_missed - 1;
    END IF;
  END IF;

  INSERT INTO public.follows ("user_id", "clock_id", "boost_count")
  VALUES (auth.uid(), target, v_amount)
  ON CONFLICT ("user_id", "clock_id")
  DO UPDATE SET "boost_count" = public.follows."boost_count" + excluded."boost_count"
  -- xmax = 0 is true only on the INSERT branch, so booster_count ticks once per user.
  RETURNING "boost_count", (xmax = 0) INTO v_boost_count, v_is_new;

  UPDATE public.clocks
     SET "boost_count"       = "boost_count" + v_amount,
         "level"             = public.quest_level("boost_count" + v_amount),
         "booster_count"     = "booster_count" + CASE WHEN v_is_new THEN 1 ELSE 0 END,
         "owner_boost_count" = "owner_boost_count" + CASE WHEN v_is_owner THEN v_amount ELSE 0 END
   WHERE "id" = target
  RETURNING "boost_count", "level" INTO v_boost_count, v_level;

  INSERT INTO public.clock_boosts ("clock_id", "drop_day", "drop_used", "missed")
  VALUES (target, v_drop_today, v_drop_used, v_missed)
  ON CONFLICT ("clock_id")
  DO UPDATE SET "drop_day"  = excluded."drop_day",
                "drop_used" = excluded."drop_used",
                "missed"    = excluded."missed";

  RETURN json_build_object(
    'boost_count', v_boost_count,
    'level',       v_level,
    'drop_day',    to_char(v_drop_today, 'YYYY-MM-DD'),
    'drop_used',   v_drop_used,
    'missed',      v_missed
  );
END;
$function$;

-- Output keys are unchanged; only the internals and the boosters source differ.
CREATE OR REPLACE FUNCTION public.get_clock_boost_stats (
  clock_id  uuid,
  top_limit integer DEFAULT 5
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
  AS $function$
declare
    v_clid uuid := clock_id;
    v_tlim integer := coalesce(top_limit, 5);
    v_owner uuid;
    v_count bigint;
    v_level integer;
    v_boosters integer;
    v_owner_boosts bigint;
    v_cb record;
    v_top jsonb;
begin
    select c."user_id", c."boost_count", c."level", c."booster_count", c."owner_boost_count"
      into v_owner, v_count, v_level, v_boosters, v_owner_boosts
      from clocks c
     where c."id" = v_clid;

    if v_owner is null then
        return null;
    end if;

    select * into v_cb from clock_boosts cb where cb."clock_id" = v_clid;

    select coalesce(jsonb_agg(t), '[]'::jsonb) into v_top
    from (
        select coalesce(fp."username", 'CAMELCLOCK MEMBER') as username,
               f."boost_count" as count,
               coalesce(f."user_id" = auth.uid(), false) as is_you
          from follows f
          join profiles fp on fp."id" = f."user_id"
         where f."clock_id" = v_clid
           and f."boost_count" > 0
           and (fp."username" is not null or f."user_id" = auth.uid())
         order by f."boost_count" desc, fp."username" asc nulls last, is_you desc
         limit greatest(0, v_tlim)
    ) t;

    return jsonb_build_object(
        'boost_count', coalesce(v_count, 0),
        'level', coalesce(v_level, 1),
        'distinct_boosters', coalesce(v_boosters, 0),
        'owner_boost_count', coalesce(v_owner_boosts, 0),
        'missed', coalesce(v_cb."missed", 0),
        'drop_day', to_char(coalesce(v_cb."drop_day", (now() at time zone 'UTC')::date), 'YYYY-MM-DD'),
        'drop_used', coalesce(v_cb."drop_used", 0),
        'top', v_top
    );
end;
$function$;

-- booster_count is now a maintained column on clocks, readable under the existing clocks
-- SELECT policies, so the dashboard no longer needs this RPC.
DROP FUNCTION IF EXISTS "public"."count_clock_boosters"(uuid[]);
