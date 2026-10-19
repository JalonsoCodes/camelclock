-- Pre-marketing hardening: per-user clock creation rate limit, a DB-only Pro flag, and the
-- waitlist interest signal.
--
-- 1. clocks had NO insert rate limit (waitlist did, clocks did not), so an authenticated account
--    could insert drafts in an unbounded loop. Drafts are free and intentionally uncapped in
--    count, so the only sane guard is a burst limit: 5 inserts per user per minute, which a human
--    never reaches and a script hits immediately.
-- 2. profiles.is_pro is the DB half of the Pro tier. It is server-write-only (profiles UPDATE is
--    column-gated to username), so it can only be set outside the app. The live-clock trigger,
--    which is the hard backstop the Data API cannot bypass, must honour it.
-- 3. waitlist gains a feature column so the three Pro entry points can record WHICH feature drove
--    the signup. Read via the Supabase table editor only; there is still no SELECT policy.

-- 1. Per-user clock creation rate limit.
create or replace function public.enforce_clock_rate_limit()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
declare
    recent integer;
begin
    -- Only the owner's own inserts are limited. auth.uid() is null for service-role writes
    -- (deleteAccount's cleanup, migrations), and those must never be throttled.
    if auth.uid() is null then
        return new;
    end if;

    select count(*) into recent
    from public.clocks c
    where c.user_id = auth.uid()
      and c.created_at > now() - interval '1 minute';

    if recent >= 5 then
        raise exception 'Slow down — too many clocks created at once. Please try again in a minute.';
    end if;

    return new;
end;
$function$;

revoke all on function public.enforce_clock_rate_limit() from anon, authenticated, service_role;
grant execute on function public.enforce_clock_rate_limit() to public, postgres;

drop trigger if exists clock_rate_limit on public.clocks;
create trigger clock_rate_limit
  before insert on public.clocks
  for each row
  execute function public.enforce_clock_rate_limit();

-- 2. The Pro flag.
alter table public.profiles
  add column if not exists is_pro boolean not null default false;

-- The live-clock trigger now honours is_pro exactly as it honours is_admin. is_pro is written only
-- outside the app, so a client cannot grant itself unlimited clocks through the Data API.
create or replace function public.enforce_live_clock_limit()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
declare
    live_count integer;
    is_exempt boolean;
begin
    if new.status <> 'live' or coalesce(old.status, 'draft') = 'live' then
        return new;
    end if;

    select coalesce(p.is_admin, false) or coalesce(p.is_pro, false) into is_exempt
    from public.profiles p
    where p.id = auth.uid();

    if coalesce(is_exempt, false) then
        return new;
    end if;

    select count(*) into live_count
    from public.clocks c
    where c.user_id = auth.uid()
      and c.status = 'live'
      and c.id <> new.id;

    if live_count >= 3 then
        raise exception 'Live clock limit reached (3)';
    end if;

    return new;
end;
$function$;

revoke all on function public.enforce_live_clock_limit() from anon, authenticated, service_role;
grant execute on function public.enforce_live_clock_limit() to public, postgres;

-- 3. Waitlist interest signal.
alter table public.waitlist
  add column if not exists feature text;
