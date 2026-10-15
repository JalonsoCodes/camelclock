-- Poll votes become changeable. A voter keeps one row per (poll_id, user_id) — the primary key —
-- but may move it between the options any number of times until the poll closes. The tally is
-- adjusted by the delta (old choice -1, new choice +1) inside the same row-locked poll row, so
-- the counters can never double-count a switch or drift from the vote rows.
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
  if v_poll."resolved_at" is not null or now() >= v_poll."closes_at" then
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
