-- Two bugs in the boost_clock entitlement read, both reported by testing a freshly created
-- clock (its first boost failed with:
--   23502 null value in column "drop_used" of relation "clock_boosts" violates not-null
--   constraint / Failing row contains (8d6ace96-..., 2026-09-28, null, 0)):
--
--   1. A brand-new clock has no clock_boosts row yet, and PL/pgSQL's SELECT ... INTO
--      assigns NULL to EVERY target when the query matches no row. That clobbered the
--      `:= 0` default on v_drop_used, and the COALESCE that was meant to defend it lived
--      inside an IF requiring v_drop_stored IS NOT NULL - false in exactly this case. The
--      NULL then reached INSERT INTO clock_boosts and tripped the NOT NULL constraint, so
--      the whole boost rolled back and the client's optimistic count snapped back. The same
--      read left v_missed defended (it had an unconditional COALESCE) and v_drop_stored
--      harmlessly NULL, which is why only drop_used broke.
--
--   2. The day rollover was never actually implemented. The old block only COALESCEd inside
--      its "is today" branch, so a tally stored on an EARLIER day was never zeroed and got
--      charged against today's quota - the exact opposite of the comment sitting above it.
--      Live example: clock 18fe0e7e held drop_used = 10 from 2026-09-26, and today's quota
--      computes to 10 (20724 % 11 = 0), so GREATEST(10 - 10, 0) = 0 and that owner could not
--      claim at all. Any owner who spends their full quota is silently blocked the next day.
--
-- The CASE below makes the server agree with computeDropLeft() in src/utils/boost.js, which
-- was already correct (it returns the full quota for a missing or stale day): no row -> full
-- quota, stale day -> full quota, today -> quota - used. No data repair is needed, since
-- drop_used is NOT NULL and no stored row can be malformed.
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

  -- SELECT ... INTO assigns NULL to every target when no row matches, which clobbers the
  -- DECLARE defaults above; a brand-new clock has no clock_boosts row yet. Then the day
  -- rollover: a tally stored on an earlier day belongs to that day and must not be charged
  -- against today's quota. Mirrors computeDropLeft() in src/utils/boost.js.
  v_missed    := COALESCE(v_missed, 0);
  v_drop_used := CASE WHEN v_drop_stored IS NULL OR v_drop_stored < v_drop_today
                      THEN 0
                      ELSE COALESCE(v_drop_used, 0)
                 END;

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
