-- Level polls now close early on a decisive quorum instead of always waiting the full 24 hours.
-- A poll resolves when EITHER:
--   * its 24h window elapses (unchanged), OR
--   * it has at least poll_quorum() total votes, the two options are not tied, AND it has been
--     open at least poll_min_open_secs() so a burst of early votes can't close it instantly.
-- A tie at quorum does NOT close early — it keeps waiting for the deadline (or another vote).
-- A quiet clock that never reaches quorum behaves exactly as before.
--
-- poll_ready() is the single predicate every resolver shares, so finalise_poll (the merge),
-- finalise_due_polls (the sweep) and vote_poll (the write guard) can never disagree.
--
-- QUORUM and MIN_OPEN are KEEP IN SYNC with src/utils/polls.js (presentation only there).

create or replace function public.poll_quorum ()
  returns integer
  language sql
  immutable
  set search_path to 'public'
  as $function$
  select 10;
$function$;

revoke all on function public.poll_quorum() from public, anon, authenticated, service_role;
grant execute on function public.poll_quorum() to postgres;

create or replace function public.poll_min_open_secs ()
  returns integer
  language sql
  immutable
  set search_path to 'public'
  as $function$
  select 1800;
$function$;

revoke all on function public.poll_min_open_secs() from public, anon, authenticated, service_role;
grant execute on function public.poll_min_open_secs() to postgres;

-- Is this poll ready to be resolved? Stable, because it reads now().
create or replace function public.poll_ready (
  p public.clock_polls
)
  returns boolean
  language sql
  stable
  set search_path to 'public'
  as $function$
  select p."resolved_at" is null
     and (
          now() >= p."closes_at"
       or (
            (p."votes_a" + p."votes_b") >= public.poll_quorum()
        and p."votes_a" <> p."votes_b"
        and now() >= p."created_at" + make_interval(secs => public.poll_min_open_secs())
          )
     );
$function$;

revoke all on function public.poll_ready(public.clock_polls) from public, anon, authenticated, service_role;
grant execute on function public.poll_ready(public.clock_polls) to postgres;

-- Resolve one poll. Only the readiness gate changed: it now defers to poll_ready(), so a decisive
-- quorum can settle it before closes_at. Everything below (tie-break, merge) is unchanged.
create or replace function public.finalise_poll (
  p_poll_id uuid
)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
declare
  v_poll   public.clock_polls;
  v_winner text;
  v_boosts jsonb;
begin
  select * into v_poll from public.clock_polls where "id" = p_poll_id for update;
  if v_poll."id" is null then
    return null;
  end if;
  if v_poll."resolved_at" is not null then
    return jsonb_build_object('poll_id', v_poll."id", 'winner', v_poll."winner",
                              'resolved_at', v_poll."resolved_at");
  end if;
  if not public.poll_ready(v_poll) then
    return null;
  end if;

  if v_poll."votes_a" = 0 and v_poll."votes_b" = 0 then
    v_winner := null;
  elsif v_poll."votes_a" > v_poll."votes_b" then
    v_winner := v_poll."option_a";
  elsif v_poll."votes_b" > v_poll."votes_a" then
    v_winner := v_poll."option_b";
  else
    v_winner := case when random() < 0.5 then v_poll."option_a"
                     else coalesce(v_poll."option_b", v_poll."option_a") end;
  end if;

  update public.clock_polls
     set "resolved_at" = now(), "winner" = v_winner
   where "id" = p_poll_id;

  if v_winner is not null then
    select c."boosts" into v_boosts from public.clocks c where c."id" = v_poll."clock_id";
    update public.clocks
       set "boosts" = public.normalise_boost_rack(
                        coalesce(v_boosts, '[]'::jsonb)
                        || jsonb_build_array(jsonb_build_object('id', v_winner)))
     where "id" = v_poll."clock_id";
  end if;

  return jsonb_build_object('poll_id', v_poll."id", 'winner', v_winner, 'resolved_at', now());
end;
$function$;

revoke all on function public.finalise_poll(uuid) from public, anon, service_role;
grant execute on function public.finalise_poll(uuid) to postgres;

-- Resolve every ready poll for a clock (deadline OR decisive quorum).
create or replace function public.finalise_due_polls (
  p_clock_id uuid
)
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
declare
  r record;
begin
  for r in select p."id" from public.clock_polls p
            where p."clock_id" = p_clock_id
              and public.poll_ready(p)
  loop
    perform public.finalise_poll(r."id");
  end loop;
end;
$function$;

revoke all on function public.finalise_due_polls(uuid) from public, anon, service_role;
grant execute on function public.finalise_due_polls(uuid) to postgres;

-- Cast a vote. Changeable until the poll is ready: the guard now uses poll_ready() so a decisive
-- quorum closes voting at once, not only at the deadline. Resolution itself still happens in
-- finalise_due_polls (via get_clock_polls) — this function never merges, so lock order stays
-- clocks -> poll rather than poll -> clocks.
create or replace function public.vote_poll (
  p_poll_id uuid,
  p_choice text
)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
declare
  v_uid   uuid := auth.uid();
  v_poll  public.clock_polls;
  v_prev  text;
begin
  if v_uid is null then
    raise exception 'Sign in to vote';
  end if;
  if p_choice not in ('a', 'b') then
    raise exception 'Invalid choice';
  end if;

  select * into v_poll from public.clock_polls where "id" = p_poll_id for update;
  if v_poll."id" is null then
    raise exception 'Poll not found';
  end if;
  if v_poll."resolved_at" is not null or public.poll_ready(v_poll) then
    raise exception 'This vote has closed';
  end if;
  if p_choice = 'b' and v_poll."option_b" is null then
    raise exception 'Invalid choice';
  end if;

  select v."choice" into v_prev
    from public.clock_poll_votes v
   where v."poll_id" = p_poll_id and v."user_id" = v_uid;

  -- Nothing to do when the vote is unchanged (including a first vote for the same option).
  if v_prev is distinct from p_choice then
    insert into public.clock_poll_votes ("poll_id", "user_id", "choice")
    values (p_poll_id, v_uid, p_choice)
    on conflict ("poll_id", "user_id") do update set "choice" = excluded."choice";

    update public.clock_polls
       set "votes_a" = "votes_a"
                       + case when p_choice = 'a' then 1 else 0 end
                       - case when v_prev = 'a' then 1 else 0 end,
           "votes_b" = "votes_b" + case when p_choice = 'b' then 1 else 0 end
                                     - case when v_prev = 'b' then 1 else 0 end
     where "id" = p_poll_id;
  end if;

  select * into v_poll from public.clock_polls where "id" = p_poll_id;

  return jsonb_build_object(
    'poll_id',   v_poll."id",
    'votes_a',   v_poll."votes_a",
    'votes_b',   v_poll."votes_b",
    'my_choice', (select v."choice" from public.clock_poll_votes v
                   where v."poll_id" = p_poll_id and v."user_id" = v_uid),
    'resolved_at', v_poll."resolved_at",
    'winner',    v_poll."winner"
  );
end;
$function$;

revoke all on function public.vote_poll(uuid, text) from public, anon, service_role;
grant execute on function public.vote_poll(uuid, text) to authenticated, postgres;
