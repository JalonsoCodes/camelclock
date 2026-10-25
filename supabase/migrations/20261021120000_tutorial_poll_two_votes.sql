-- The tutorial poll no longer runs against a 20-second clock. It now needs 2 votes, so the owner
-- casts one and must share the CamelClock to bring in a second voter. The 24-hour window is only a
-- fallback: if nobody else votes, the poll settles normally and the owner's single vote wins.
--
-- poll_tutorial_window_secs / poll_tutorial_quorum / poll_tutorial_min_open_secs are KEEP IN SYNC
-- with POLL_TUTORIAL_WINDOW_MS / POLL_TUTORIAL_QUORUM / POLL_TUTORIAL_MIN_OPEN_MS in
-- src/utils/polls.js (presentation only there).
create or replace function public.poll_tutorial_window_secs ()
  returns integer
  language sql
  immutable
  set search_path to 'public'
  as $function$
  select 86400;
$function$;
revoke all on function public.poll_tutorial_window_secs() from public, anon, authenticated, service_role;
grant execute on function public.poll_tutorial_window_secs() to postgres;
create or replace function public.poll_tutorial_quorum ()
  returns integer
  language sql
  immutable
  set search_path to 'public'
  as $function$
  select 2;
$function$;
revoke all on function public.poll_tutorial_quorum() from public, anon, authenticated, service_role;
grant execute on function public.poll_tutorial_quorum() to postgres;
create or replace function public.poll_tutorial_min_open_secs ()
  returns integer
  language sql
  immutable
  set search_path to 'public'
  as $function$
  select 0;
$function$;
revoke all on function public.poll_tutorial_min_open_secs() from public, anon, authenticated, service_role;
grant execute on function public.poll_tutorial_min_open_secs() to postgres;
