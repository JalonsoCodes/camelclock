-- Scrap the event-hub feature: drop the hub columns added by
-- 20261110120000_clock_type_hub_fields.sql and remove the demo hub showcase
-- clocks seeded by 20261110120100_hub_showcase_demos.sql.

alter table public.clocks
  drop column if exists clock_type,
  drop column if exists location_label,
  drop column if exists location_url,
  drop column if exists event_description,
  drop column if exists event_links;

delete from public.clocks
where id in (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'a1b2c3d4-0003-4000-8000-000000000003'
);
