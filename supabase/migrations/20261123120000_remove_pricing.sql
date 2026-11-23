-- CamelClock is free and unlimited: remove the waitlist funnel and the Pro tier.
-- Forward-only cleanup; earlier migrations are left untouched.

drop trigger if exists waitlist_rate_limit on public.waitlist;
drop function if exists public.enforce_waitlist_rate_limit();
drop policy if exists "waitlist_public_insert" on public.waitlist;
drop table if exists public.waitlist;

drop trigger if exists enforce_live_clock_limit on public.clocks;
drop function if exists public.enforce_live_clock_limit();
drop function if exists public.count_my_live_clocks();

alter table public.profiles
  drop column if exists is_pro;

comment on column public.clocks.background is 'Background id (red, orange, yellow, green, blue, indigo, violet, or null).';
