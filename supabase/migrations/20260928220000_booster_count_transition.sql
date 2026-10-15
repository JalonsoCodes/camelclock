-- booster_count must tick when a user goes from 0 to >0, not only when a follows row is
-- first inserted. The 20260928214000 backfill could see the legacy 0-count rows as already
-- counted, so those users were frozen out of booster_count forever: their first real boost
-- took the ON CONFLICT DO UPDATE branch, where `xmax = 0` is false, so the counter never
-- moved. clocks.booster_count is documented as "follows rows with boost_count > 0", so it
-- has to count the transition too.
--
-- Two related holes in the same statement, both reachable only from a direct/tampered RPC
-- call (the app blocks or clamps before it can send these):
--   1. A zero-amount call still ran the INSERT, so a brand-new user got a follows row with
--      boost_count 0 AND xmax = 0, incrementing booster_count for someone who never boosted.
--   2. The missed-drop donation was decremented before the amount was known to be non-zero,
--      so a zero-amount visitor call burned an owner's missed drop for no boost.
--
-- The clock row is already locked FOR UPDATE at the top of the function, and every boost
-- write goes through it, so reading the caller's follows row here is race-free.
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
  v_boost_count  bigint;
  v_level        integer;
  v_amount       integer := 0;
  v_prev_boost   bigint;
  v_becomes_booster boolean := false;
  v_is_owner     boolean;
  v_drop_today   date := (now() at time zone 'UTC')::date;
  v_drop_stored  date;
  v_quota        integer := 10 + (((floor(extract(epoch from (now() at time zone 'UTC')::date) / 86400)::bigint % 11) + 11) % 11);
  v_drop_used    integer := 0;
  v_missed       integer := 0;
BEGIN
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
  END IF;

  -- A zero-amount call is a no-op: no follows row, no donation spent, no counter movement.
  IF v_amount > 0 THEN
    IF NOT v_is_owner AND v_missed > 0 THEN
      v_missed := v_missed - 1;
    END IF;

    SELECT f."boost_count"
      INTO v_prev_boost
      FROM public.follows f
     WHERE f."user_id" = auth.uid()
       AND f."clock_id" = target;

    -- First boost, or the first real boost on a legacy 0-count row.
    v_becomes_booster := (v_prev_boost IS NULL)
                         OR (COALESCE(v_prev_boost, 0) <= 0);

    INSERT INTO public.follows ("user_id", "clock_id", "boost_count")
    VALUES (auth.uid(), target, v_amount)
    ON CONFLICT ("user_id", "clock_id")
    DO UPDATE SET "boost_count" = public.follows."boost_count" + excluded."boost_count";

    UPDATE public.clocks
       SET "boost_count"       = "boost_count" + v_amount,
           "level"             = public.quest_level("boost_count" + v_amount),
           "booster_count"     = "booster_count" + CASE WHEN v_becomes_booster THEN 1 ELSE 0 END,
           "owner_boost_count" = "owner_boost_count" + CASE WHEN v_is_owner THEN v_amount ELSE 0 END
     WHERE "id" = target
     RETURNING "boost_count", "level" INTO v_boost_count, v_level;
  ELSE
    -- Report the untouched current state so the client's re-sync still works.
    SELECT c."boost_count", c."level"
      INTO v_boost_count, v_level
      FROM public.clocks c
     WHERE c."id" = target;
  END IF;

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
