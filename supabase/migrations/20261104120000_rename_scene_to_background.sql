-- Rename clocks.scene column to clocks.background
-- Update constraint name and column comment to match.

alter table public.clocks
  rename column scene to background;

alter table public.clocks
  rename constraint clocks_scene_check to clocks_background_check;

comment on column public.clocks.background is 'Background id (red, orange, yellow, green, blue, indigo, violet, or null). Pro-only; client cannot self-grant is_pro so backgrounds stay gated until Stripe sets the flag.';
