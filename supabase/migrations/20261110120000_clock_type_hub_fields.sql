-- Add clock_type and event hub fields to clocks
-- clock_type: 'countdown' (default) or 'hub' — determines whether the clock shows hub features
-- Event hub fields are only meaningful when clock_type = 'hub'

alter table public.clocks
  add column clock_type text not null default 'countdown'
    check (clock_type in ('countdown', 'hub'));

alter table public.clocks
  add column location_label text;

alter table public.clocks
  add column location_url text;

alter table public.clocks
  add column event_description text;

alter table public.clocks
  add column event_links jsonb not null default '[]';

comment on column public.clocks.clock_type is 'Clock mode: countdown (timer only) or hub (event dashboard with location, description, links)';
comment on column public.clocks.location_label is 'Human-readable location label (e.g., "Central Park", "The Village Hall")';
comment on column public.clocks.location_url is 'Optional maps/venue URL (https only)';
comment on column public.clocks.event_description is 'Event description shown in hub view (max 1000 chars)';
comment on column public.clocks.event_links is 'Array of custom buttons: [{label, url}] max 4, https only';