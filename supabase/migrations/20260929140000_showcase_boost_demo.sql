-- The landing page's showcase camels are made boostable, and one of them becomes
-- the hero.
--
-- `boosts` is the ambient rack in the same shape clocks.boosts uses, so
-- validateBoosts and pickAmbient both read it unchanged. The trigger is left off
-- deliberately: firstTriggerOf resolves it from the def, and validateBoosts skips
-- a null trigger rather than rejecting the row. It now dresses the examples in the
-- grid below the hero — the hero's own rack comes from its build-up script, where
-- it has to be ordered for the ambient budget.
--
-- `start_boosts` is the seed the quest meter starts from. It matters because
-- pickAmbient drops anything above the current unlock level and ambientBudgetForLevel
-- is 1 at level 1 — a boosts column on its own would mean every showcase could
-- only ever show a single Shine.
--
-- `is_hero` picks the single row the landing hero builds up. The partial unique
-- index is the important half: without it, editing the admin sheet could quietly
-- end up with two heroes, and the page would pick one arbitrarily.
--
-- No policy or GRANT changes: showcases_public_read is already USING (true) and
-- showcases_admin_write is already admin-gated, and both roles already hold
-- SELECT/UPDATE on the table.
alter table public.showcases
  add column if not exists boosts jsonb not null default '[]'::jsonb,
  add column if not exists start_boosts integer not null default 0
    check (start_boosts >= 0),
  add column if not exists is_hero boolean not null default false;

-- Exactly one row claims the hero. Indexed on the column itself under a partial
-- predicate, so every entry in the index is `true` and uniqueness means "at most
-- one hero" rather than "at most one of each value".
create unique index if not exists showcases_single_hero
  on public.showcases (is_hero)
  where is_hero;

-- The hero copy grew a lot, so the old 70-character captions and the column
-- default behind them both go.
alter table public.showcases
  alter column feature_title set default 'MAKE IT YOURS',
  alter column feature_body set default 'Build a pixel countdown in seconds: name it, pick a date, pick two colours. Then share it anywhere with a single link.';

update public.showcases set
  feature_title = 'BOOST THE HYPE',
  feature_body = 'Your audience can tap the camel to send a boost the moment the countdown starts. Every burst feeds the quest meter, and the camel throws a fresh animation at every level-up — new moves, new effects, more show for everyone watching.',
  boosts = '[{"id": "shine"}, {"id": "frontflip"}]'::jsonb,
  start_boosts = 25
where title = 'World Camel Day';

update public.showcases set
  feature_title = 'WEARABLES WITH PERSONALITY',
  feature_body = 'Dress your camel for the occasion: top hats, wizard caps, gold chains, scarves, bow ties, halos, medals and boots. One per head, neck and feet slot, and every layer is drawn straight onto the pixel art.',
  boosts = '[{"id": "sparkle"}, {"id": "glow"}]'::jsonb,
  start_boosts = 45
where title = 'Liam & Ana Wedding';

update public.showcases set
  feature_title = 'COLOUR THEMING ON STEROIDS',
  feature_body = 'Pick any two hex colours you like and the whole camel follows — humps, body, title, intro label, boost glow. Randomise until it lands, then lock it in with one click and it stays exactly that colour.',
  boosts = '[{"id": "shine"}, {"id": "sparkle"}]'::jsonb,
  start_boosts = 10
where title = 'Merch Drop';

update public.showcases set
  feature_title = 'THE GRAND FINISH',
  feature_body = 'When zero finally hits, the camel erupts into its celebration animation and your own completion message takes centre stage. Made for product drops, livestreams, exam results and New Years Eve.',
  boosts = '[{"id": "glow"}, {"id": "frontflip"}]'::jsonb,
  start_boosts = 75
where title = 'Christmas Day';

update public.showcases set
  feature_title = 'BUILT TO SHARE',
  feature_body = 'One link to your clock, or embed it straight into your own site in a single iframe. No scripts to maintain, no layout to fight — the camel drops into a page, a post or a stream and just ticks.',
  boosts = '[{"id": "shine"}, {"id": "sparkle"}]'::jsonb,
  start_boosts = 45
where title = 'My CamelClock';

-- Anything added between the column landing and this migration still needs filling
-- in by hand, so close the blanks rather than letting a null reach the hero.
update public.showcases set
  boosts = coalesce(boosts, '[]'::jsonb),
  start_boosts = coalesce(start_boosts, 0),
  feature_title = coalesce(nullif(feature_title, ''), 'MAKE IT YOURS'),
  feature_body = coalesce(nullif(feature_body, ''), 'Build a pixel countdown in seconds: name it, pick a date, pick two colours. Then share it anywhere with a single link.')
where boosts is null
   or start_boosts is null
   or feature_title is null or feature_title = ''
   or feature_body is null or feature_body = '';

alter table public.showcases
  alter column feature_title set not null,
  alter column feature_body set not null;
