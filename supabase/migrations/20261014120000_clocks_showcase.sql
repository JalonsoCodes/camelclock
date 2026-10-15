-- Move showcases into clocks
alter table public.clocks
  add column if not exists is_showcase boolean not null default false,
  add column if not exists showcase_order integer not null default 0;

create index if not exists clocks_showcase_order_idx
  on public.clocks (showcase_order)
  where is_showcase;

-- Migrate existing showcases
insert into public.clocks (
  title,
  target_at,
  intro_text,
  celebration_message,
  celebration_type,
  primary_colour,
  secondary_colour,
  wearables,
  boosts,
  boost_order,
  hydrate_count,
  level,
  status,
  user_id,
  is_showcase,
  showcase_order,
  viewer_hydrates,
  allow_embed
)
select
  s.title,
  s.target_at,
  coalesce(s.intro_text, 'in'),
  coalesce(s.celebration_message, 'TIME IS UP!'),
  coalesce(s.celebration_type, 'spit'),
  coalesce(s.primary_colour, '#DBB279'),
  coalesce(s.secondary_colour, '#8E652C'),
  coalesce(s.wearables, '[]'::jsonb),
  coalesce(s.boosts, '[]'::jsonb),
  coalesce(s.boost_order, '[]'::jsonb),
  coalesce(s.start_hydrates, 0),
  public.quest_level(coalesce(s.start_hydrates, 0)),
  'live',
  null,
  true,
  s.sort_order,
  false,
  true
from public.showcases s;

drop table if exists public.showcases cascade;

-- Admin RPCs
create or replace function public.set_clock_showcase(
  p_clock_id uuid,
  p_is_showcase boolean,
  p_showcase_order integer
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ok boolean;
begin
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  ) into v_ok;

  if not coalesce(v_ok, false) then
    raise exception 'Forbidden';
  end if;

  update public.clocks
     set is_showcase = p_is_showcase,
         showcase_order = p_showcase_order
   where id = p_clock_id
     and status = 'live';

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.set_clock_showcase(uuid, boolean, integer) from anon, public;
grant execute on function public.set_clock_showcase(uuid, boolean, integer) to authenticated;

create or replace function public.reorder_showcases(p_ids uuid[])
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ok boolean;
  i integer;
begin
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  ) into v_ok;

  if not coalesce(v_ok, false) then
    raise exception 'Forbidden';
  end if;

  for i in 1..coalesce(array_length(p_ids, 1), 0) loop
    update public.clocks
       set showcase_order = i
     where id = p_ids[i];
  end loop;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.reorder_showcases(uuid[]) from anon, public;
grant execute on function public.reorder_showcases(uuid[]) to authenticated;