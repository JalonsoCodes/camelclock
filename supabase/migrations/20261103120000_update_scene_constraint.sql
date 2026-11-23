-- Drop old constraint first
alter table public.clocks
  drop constraint if exists clocks_scene_check;

-- Migrate existing desert/forest to new color IDs
-- desert -> orange (sandy), forest -> green
update public.clocks
set scene = case
  when scene = 'desert' then 'orange'
  when scene = 'forest' then 'green'
  else scene
end
where scene in ('desert', 'forest');

-- Add new constraint for 7 rainbow colors
alter table public.clocks
  add constraint clocks_scene_check
  check (scene is null or scene in (
    'red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'
  ));