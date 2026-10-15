-- Quest ladder, simplified to five levels, plus the per-clock boost order.
--
-- 1. clocks.boost_order / showcases.boost_order — a clock's own reveal ladder. Two effects per
--    level reached, so the order is what makes two clocks at the same level reveal different
--    things. It is written once at creation and never rewritten: a ladder that reshuffled on
--    every load would invalidate anything the owner has already equipped.
-- 2. quest_level(bigint) drops from ten thresholds to four, with LEAST(5, ...) as the ceiling.
--    500 stays in the ladder purely so the top rung has a readable "boosts to" number on the
--    JS side; SQL can never actually pass it into a sixth level.
-- 3. Racks are normalised to the new id set and to one effect per category, with Shine added
--    wherever no aura was equipped, because Shine is the free level-1 rung every clock gets.
--
-- Keep the thresholds here in step with QUEST_LEVELS in src/utils/boost.js.

alter table public.clocks
  add column if not exists boost_order jsonb not null default '[]'::jsonb;

alter table public.showcases
  add column if not exists boost_order jsonb not null default '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.quest_level (
  p_boost_count bigint
)
  RETURNS integer
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO 'public'
  AS $function$
  SELECT LEAST(5, (SELECT count(*)::int
                    FROM (VALUES (10), (50), (100), (250), (500)) AS q(boosts)
                    WHERE p_boost_count >= q.boosts) + 1);
$function$;

REVOKE ALL ON FUNCTION "public"."quest_level"(bigint) FROM "anon", "authenticated", "service_role";

GRANT EXECUTE ON FUNCTION "public"."quest_level"(bigint) TO PUBLIC, "postgres";

UPDATE "public"."clocks"
   SET "level" = "public"."quest_level"("boost_count");

-- Repairs an old rack onto the new id set and enforces one effect per category. Old ids that
-- have no new equivalent are dropped; old ids that map onto a surviving effect are mapped
-- (jumping-jacks became jack, aura became shine, glow and ghost became sparkle, frontflip has
-- no successor and goes). Reactive ids (hop, deepflip, legend) are reactions rather than
-- equipment, so they are dropped from the rack entirely.
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
             WHEN 'PRESSUP'       THEN 'PUSHUP'
             WHEN 'JUMPING-JACKS' THEN 'JACK'
             WHEN 'AURA'          THEN 'SHINE'
             WHEN 'GLOW'          THEN 'SPARKLE'
             WHEN 'GHOST'         THEN 'SPARKLE'
             ELSE upper(trim(coalesce(e ->> 'id', '')))
           END AS id
      FROM jsonb_array_elements(coalesce(p_boosts, '[]'::jsonb)) AS e
  ),
  categorised AS (
    SELECT m.id,
           CASE WHEN m.id IN ('PUSHUP', 'JACK') THEN 'exercise'
                WHEN m.id IN ('SHINE', 'SPARKLE', 'FIREWORKS') THEN 'aura'
                WHEN m.id IN ('SUN', 'RAIN', 'SANDSTORM') THEN 'weather'
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
    SELECT 'aura', 'SHINE' WHERE NOT EXISTS (SELECT 1 FROM picked WHERE category = 'aura')
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', id) ORDER BY category), '[]'::jsonb)
    FROM final;
$function$;

-- A clock's reveal order is the gated pool shuffled within each category, then dealt
-- round-robin across the three categories. Dealing round-robin is what guarantees the "two
-- effects from different categories" rule: every entry inside a round is a different category,
-- and the category that closes a round is never the one that opens the next. Ordering the
-- aggregate by (rn - 1) * 3 + lane reproduces exactly that deal.
CREATE OR REPLACE FUNCTION public.random_boost_order ()
  RETURNS jsonb
  LANGUAGE sql
  VOLATILE
  SET search_path TO 'public'
  AS $function$
  WITH pool(id, category, lane) AS (
    VALUES ('pushup',    'exercise', 0),
           ('jack',      'exercise', 0),
           ('sparkle',   'aura',     1),
           ('fireworks', 'aura',     1),
           ('sun',       'weather',  2),
           ('rain',      'weather',  2),
           ('sandstorm', 'weather',  2)
  ),
  ranked AS (
    SELECT id, category, lane,
           row_number() OVER (PARTITION BY category ORDER BY random()) AS rn
      FROM pool
  )
  SELECT coalesce(jsonb_agg(id ORDER BY (rn - 1) * 3 + lane), '[]'::jsonb)
    FROM ranked;
$function$;

REVOKE ALL ON FUNCTION "public"."normalise_boost_rack"(jsonb) FROM "anon";

REVOKE ALL ON FUNCTION "public"."random_boost_order"() FROM "anon";

GRANT EXECUTE ON FUNCTION "public"."normalise_boost_rack"(jsonb) TO "authenticated", "service_role", "postgres";

GRANT EXECUTE ON FUNCTION "public"."random_boost_order"() TO "authenticated", "service_role", "postgres";

UPDATE "public"."clocks"
   SET "boosts" = public.normalise_boost_rack("boosts"),
       "boost_order" = coalesce(nullif("boost_order", '[]'::jsonb), public.random_boost_order());

UPDATE "public"."showcases"
   SET "boosts" = public.normalise_boost_rack("boosts"),
       "boost_order" = coalesce(nullif("boost_order", '[]'::jsonb), public.random_boost_order());

-- The quest ladder tops out at level 5, which is reached at 250 boosts, so a seeded showcase
-- above that can never show a further unlock.
update public.showcases
   set start_boosts = least(greatest(start_boosts, 0), 250);