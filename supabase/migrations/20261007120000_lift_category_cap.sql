-- The one-effect-per-category cap is lifted: a clock may now run any number of
-- equipped boosts at once (the engine schedules one per category and queues the
-- rest). normalise_boost_rack previously enforced the cap by keeping only rn = 1
-- per category, which silently dropped the second id of a same-category pair.
-- This redefines it to dedupe by id only (still folding legacy uppercase ids
-- through upper(), and still ensuring a rack never ships without an aura — shine
-- remains the free level-1 rung).
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
  deduped AS (
    SELECT id
      FROM mapped
     WHERE id IN ('pushup', 'jack', 'shine', 'sparkle', 'fireworks', 'sun', 'rain', 'sandstorm')
     GROUP BY id
  ),
  final AS (
    SELECT id FROM deduped
    UNION ALL
    SELECT 'shine' WHERE NOT EXISTS (SELECT 1 FROM deduped WHERE id = 'shine')
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', id) ORDER BY id), '[]'::jsonb)
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