-- normalise_boost_rack shipped uppercase ids ('SHINE', 'PUSHUP', ...) while the app's BOOSTS
-- defs and every boosted clock are keyed on lowercase ids. So every rack the previous migration
-- wrote back resolved to nothing at runtime: no equipped effect on the camel, and no tick in the
-- viewer's level panel. This redefines the function with the same mapping but lowercase output,
-- then re-runs the backfill to repair the rows that were already normalised wrong.
--
-- The input side still folds through upper(), so this is safe to apply to a mixed table: legacy
-- ids, the uppercase ids the last migration wrote, and correct lowercase ids all land the same.
CREATE OR REPLACE FUNCTION public.normalise_boost_rack (
  p_boosts jsonb
)
  RETURNS jsonb
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO 'public'
  AS $function$
  WITH mapped AS (
    SELECT CASE upper(trim(coalesce(e ->> 'id', '')))
             WHEN 'PRESSUP'       THEN 'pushup'
             WHEN 'JUMPING-JACKS' THEN 'jack'
             WHEN 'AURA'          THEN 'shine'
             WHEN 'GLOW'          THEN 'sparkle'
             WHEN 'GHOST'         THEN 'sparkle'
             ELSE lower(trim(coalesce(e ->> 'id', '')))
           END AS id
      FROM jsonb_array_elements(coalesce(p_boosts, '[]'::jsonb)) AS e
  ),
  categorised AS (
    SELECT m.id,
           CASE WHEN m.id IN ('pushup', 'jack') THEN 'exercise'
                WHEN m.id IN ('shine', 'sparkle', 'fireworks') THEN 'aura'
                WHEN m.id IN ('sun', 'rain', 'sandstorm') THEN 'weather'
           END AS category
      FROM mapped m
  ),
  ranked AS (
    SELECT category, id,
           row_number() OVER (PARTITION BY category ORDER BY id) AS rn
      FROM categorised
     WHERE category IS NOT NULL
  ),
  picked AS (
    SELECT category, id FROM ranked WHERE rn = 1
  ),
  final AS (
    SELECT category, id FROM picked
    UNION ALL
    SELECT 'aura', 'shine' WHERE NOT EXISTS (SELECT 1 FROM picked WHERE category = 'aura')
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', id) ORDER BY category), '[]'::jsonb)
    FROM final;
$function$;

-- Guarded so only genuinely mis-normalised rows are written: clocks has a BEFORE UPDATE trigger
-- that stamps updated_at, and an unguarded UPDATE would touch every row on the table.
UPDATE "public"."clocks"
   SET "boosts" = public.normalise_boost_rack("boosts")
 WHERE "boosts" IS DISTINCT FROM public.normalise_boost_rack("boosts");

UPDATE "public"."showcases"
   SET "boosts" = public.normalise_boost_rack("boosts")
 WHERE "boosts" IS DISTINCT FROM public.normalise_boost_rack("boosts");

-- A clock's reveal order is matched by id in unlockedBoostIdsFor, so an order carrying a retired
-- or wrongly-cased id quietly shrinks that clock's ladder instead of erroring. This mirrors
-- normaliseBoostOrder in src/utils/boost.js: keep whatever is usable, keep its order, and only a
-- wholly empty result gets re-dealt. random_boost_order() already emits the right ids, so this is
-- a no-op for rows dealt by it.
CREATE OR REPLACE FUNCTION public.normalise_boost_order (
  p_order jsonb
)
  RETURNS jsonb
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO 'public'
  AS $function$
  WITH cleaned AS (
    SELECT lower(trim(CASE jsonb_typeof(x.elem)
                        WHEN 'string' THEN x.elem #>> '{}'
                        ELSE coalesce(x.elem ->> 'id', '')
                      END)) AS id,
           x.ord
      FROM jsonb_array_elements(coalesce(p_order, '[]'::jsonb)) WITH ORDINALITY AS x(elem, ord)
  ),
  kept AS (
    SELECT id, ord
      FROM cleaned
     WHERE id IN ('pushup', 'jack', 'sparkle', 'fireworks', 'sun', 'rain', 'sandstorm')
  ),
  deduped AS (
    SELECT id, min(ord) AS ord FROM kept GROUP BY id
  )
  SELECT coalesce(jsonb_agg(id ORDER BY ord), '[]'::jsonb) FROM deduped;
$function$;

REVOKE ALL ON FUNCTION "public"."normalise_boost_order"(jsonb) FROM "anon";

GRANT EXECUTE ON FUNCTION "public"."normalise_boost_order"(jsonb) TO "authenticated", "service_role", "postgres";

-- The desired value is computed once per row in a CTE, because random_boost_order() is VOLATILE:
-- evaluating it in both the SET and the WHERE would compare one deal against a different one.
WITH desired AS (
  SELECT "id",
         coalesce(nullif(public.normalise_boost_order("boost_order"), '[]'::jsonb), public.random_boost_order()) AS "order_value"
    FROM "public"."clocks"
)
UPDATE "public"."clocks" AS c
   SET "boost_order" = d."order_value"
  FROM desired AS d
 WHERE d."id" = c."id"
   AND c."boost_order" IS DISTINCT FROM d."order_value";

WITH desired AS (
  SELECT "id",
         coalesce(nullif(public.normalise_boost_order("boost_order"), '[]'::jsonb), public.random_boost_order()) AS "order_value"
    FROM "public"."showcases"
)
UPDATE "public"."showcases" AS s
   SET "boost_order" = d."order_value"
  FROM desired AS d
 WHERE d."id" = s."id"
   AND s."boost_order" IS DISTINCT FROM d."order_value";