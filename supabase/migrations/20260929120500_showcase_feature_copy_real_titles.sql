-- 20260929120000 seeded feature copy against placeholder titles, so it matched
-- no rows. This seeds the real showcase titles instead, and closes the columns
-- to NOT NULL with defaults so a newly added row is never blank on the landing.
alter table public.showcases
  alter column feature_title set default 'MAKE IT YOURS',
  alter column feature_body set default 'Two colours, a date, and a camel that counts it down.';

update public.showcases set
  feature_title = 'BOOSTS',
  feature_body = 'Let visitors tap the camel to boost it. Every 10 boosts levels it up and unlocks more.',
  is_featured = true
where title = 'World Camel Day';

update public.showcases set
  feature_title = 'WEARABLES',
  feature_body = 'Pop a hat, a scarf or shades on the camel. One per head, neck and feet slot.',
  is_featured = true
where title = 'Liam & Ana Wedding';

update public.showcases set
  feature_title = 'COLOUR THEMING',
  feature_body = 'Any two hex colours you like. Camel, humps, title and label all follow along.',
  is_featured = true
where title = 'Merch Drop';

update public.showcases set
  feature_title = 'COMPLETION MODE',
  feature_body = 'When it hits zero the camel celebrates and your message lands centre screen.',
  is_featured = false
where title = 'Christmas Day';

update public.showcases set
  feature_title = 'LIVE HUMPS',
  feature_body = 'The countdown is drawn as camel humps, so the digits are the artwork.',
  is_featured = false
where title = 'My CamelClock';

update public.showcases set
  feature_title = coalesce(nullif(feature_title, ''), 'MAKE IT YOURS'),
  feature_body = coalesce(nullif(feature_body, ''), 'Two colours, a date, and a camel that counts it down.')
where feature_title is null or feature_body is null
   or feature_title = '' or feature_body = '';

alter table public.showcases
  alter column feature_title set not null,
  alter column feature_body set not null;
