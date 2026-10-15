-- The "Popular CamelClocks" strip is gone from the landing, so is_featured has
-- no consumer. Dropping it rather than leaving a curated flag nothing reads.
-- The caption pair stays: the hero still shows one feature per showcase.
alter table public.showcases
  drop column if exists is_featured;
