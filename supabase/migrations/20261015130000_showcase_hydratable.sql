-- A showcased clock is always hydratable, so its viewing page offers HYDRATE.
update public.clocks
   set viewer_hydrates = true
 where is_showcase = true;

create or replace function public.enforce_showcase_hydrates()
returns trigger
language plpgsql
as $$
begin
  if new.is_showcase then
    new.viewer_hydrates := true;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_showcase_hydrates on public.clocks;
create trigger enforce_showcase_hydrates
  before insert or update on public.clocks
  for each row execute function public.enforce_showcase_hydrates();
