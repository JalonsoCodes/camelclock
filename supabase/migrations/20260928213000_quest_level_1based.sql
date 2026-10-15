-- Quest ladder alignment.
--
-- The previous quest_level(bigint) returned "thresholds passed" (0 at 0 boosts, 1 at 10,
-- ...) while the app's ladder in src/utils/boost.js is "thresholds passed + 1" (level 1 at
-- 0 boosts, level 2 at 10, ...). Because boost_clock() writes clocks.level on every boost,
-- every stored level sat one below what the app rendered.
--
-- This replaces the function with the 1-based form, drops the unused multi-signal overload
-- (nothing called it and boost_events was never written, so its w48/w72 inputs did not exist),
-- and repairs the stored values. The clocks.level backfill MUST run after the CREATE OR
-- REPLACE in this same transaction.

CREATE OR REPLACE FUNCTION public.quest_level (
  p_boost_count bigint
)
  RETURNS integer
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO 'public'
  AS $function$
  SELECT LEAST(10, (SELECT count(*)::int
                    FROM (VALUES (10), (25), (45), (75), (115),
                                 (165), (225), (300), (390), (500)) AS q(boosts)
                    WHERE p_boost_count >= q.boosts) + 1);
$function$;

REVOKE ALL ON FUNCTION "public"."quest_level"(bigint) FROM "anon", "authenticated", "service_role";

GRANT EXECUTE ON FUNCTION "public"."quest_level"(bigint) TO PUBLIC, "postgres";

DROP FUNCTION IF EXISTS "public"."quest_level"(integer, integer, integer, integer);

UPDATE "public"."clocks"
   SET "level" = "public"."quest_level"("boost_count");
