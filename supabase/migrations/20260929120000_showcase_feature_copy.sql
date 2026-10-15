-- The landing hero cycles through the showcases table and, under the camel,
-- explains one feature per showcase instead of rendering a separate features
-- grid. That needs a caption pair on the row, plus an admin-curated flag for
-- the "Popular CamelClocks" strip above the quick-start builder.
--
-- No policy or GRANT changes: showcases_public_read is already USING (true) for
-- anon + authenticated, showcases_admin_write is already admin-gated, and both
-- roles already hold SELECT/UPDATE on the table.
alter table public.showcases
  add column if not exists feature_title text,
  add column if not exists feature_body text,
  add column if not exists is_featured boolean not null default false;

-- Seed the existing rows so the new columns are never blank on first deploy.
-- All of it is editable afterwards at /admin/showcases.
update public.showcases set
  feature_title = 'WEARABLES',
  feature_body = 'Pop a hat, a scarf or shades on the camel. One per head, neck and feet slot.',
  is_featured = true
where title = 'My Amazing Promotion';

update public.showcases set
  feature_title = 'COLOUR THEMING',
  feature_body = 'Any two hex colours you like. Camel, humps, title and label all follow along.',
  is_featured = false
where title = 'Summer Sale';

update public.showcases set
  feature_title = 'LIVE HUMPS',
  feature_body = 'The countdown is drawn as camel humps, so the digits are the artwork.',
  is_featured = true
where title = 'Grand Opening';

update public.showcases set
  feature_title = 'COMPLETION MODE',
  feature_body = 'When it hits zero the camel celebrates and your message lands centre screen.',
  is_featured = false
where title = 'Product Launch';

update public.showcases set
  feature_title = 'BOOSTS',
  feature_body = 'Let visitors tap the camel to boost it. Every 10 boosts levels it up and unlocks more.',
  is_featured = true
where title = 'Flash Sale';

-- Anything added after this migration still needs its caption filled in by hand,
-- so give new rows a safe default rather than NULL.
alter table public.showcases
  alter column feature_title set default 'MAKE IT YOURS',
  alter column feature_body set default 'Two colours, a date, and a camel that counts it down.';
