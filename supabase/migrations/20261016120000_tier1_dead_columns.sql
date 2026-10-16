-- Tier 1 cleanup: columns nothing reads, a missing foreign key, and one un-pinned search_path.
--
-- 1. profiles.display_name — written once at signup from user metadata the app never sets, and
--    read nowhere in the app or the schema. handle_new_user is redefined to insert the id alone
--    before the column goes.
-- 2. profiles.clocks_created — only ever incremented by the increment_clock_count trigger and
--    read nowhere. The trigger and its function go with it.
-- 3. profiles.tutorial_completed — the legacy per-account tour flag. Completion became per clock
--    (clocks.tutorial_completed) and nothing reads the profile column any more.
-- 4. clocks.title default '' could never satisfy clocks_title_check (1..72), so a bare insert
--    always failed; give it a valid default. The app still supplies a validated title.
-- 5. clock_poll_votes.user_id had no foreign key (clock_polls got one; votes did not). Account
--    deletion never cleaned votes, so any vote by a since-deleted user is an orphan; clear those
--    before the constraint goes on, or adding it would fail on the first one found.
-- 6. count_my_live_clocks is SECURITY DEFINER and was left without a pinned search_path.

-- 1. Stop writing display_name, then drop it.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
begin
  insert into public.profiles ("id")
  values (new.id);
  return new;
end;
$function$;

revoke all on function public.handle_new_user() from anon, authenticated, service_role;
grant execute on function public.handle_new_user() to public, postgres;

alter table public.profiles drop column if exists "display_name";

-- 2. clocks_created + the trigger/function that maintained it.
drop trigger if exists on_clock_insert on public.clocks;
drop function if exists public.increment_clock_count();
alter table public.profiles drop column if exists "clocks_created";

-- 3. Legacy per-account tutorial flag.
alter table public.profiles drop column if exists "tutorial_completed";

-- 4. A default that can actually satisfy the check.
alter table public.clocks alter column "title" set default 'My CamelClock';

-- 5. The missing FK on the votes table.
delete from public.clock_poll_votes v
 where not exists (select 1 from auth.users u where u.id = v."user_id");

alter table public.clock_poll_votes
  add constraint "clock_poll_votes_user_id_fkey" foreign key ("user_id")
    references auth.users("id") on delete cascade;

-- 6. Pin the search_path.
create or replace function public.count_my_live_clocks()
  returns bigint
  language sql
  security definer
  set search_path to 'public'
  as $function$
  select count(*)::bigint from public.clocks
  where user_id = auth.uid()
    and status = 'live';
$function$;

revoke all on function public.count_my_live_clocks() from anon, authenticated, service_role;
grant execute on function public.count_my_live_clocks() to public, postgres;
