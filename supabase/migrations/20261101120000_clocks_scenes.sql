-- Per-clock background scenes (Pro tier).
-- scene is null on free clocks; Pro owners may pick desert or forest.
alter table public.clocks
  add column if not exists scene text;

alter table public.clocks
  add constraint clocks_scene_check
  check (scene is null or scene in ('desert', 'forest'));

comment on column public.clocks.scene is 'Background scene id (desert, forest, or null). Pro-only; client cannot self-grant is_pro so scenes stay gated until Stripe sets the flag.';
