-- Level voting. Each level a clock reaches reveals a pair of gated effects, but only one of them
-- joins the show: the (signed-in) community votes for 24 hours and the winner is merged
-- additively into the owner's rack. The loser is re-offered at the next level — a candidate is any
-- revealed gated effect that is neither equipped nor already reserved by an open poll, taken in
-- ladder order, so an unresolved loser simply surfaces again.
--
-- Two tables: clock_polls (one row per clock_id + level, counters on the row so a single realtime
-- subscription carries both lifecycle and live tallies) and clock_poll_votes (one row per
-- poll_id + user_id — the one-vote-per-user guarantee, never readable by clients).
--
-- hydrate_clock is still the only writer of clocks.hydrate_count / level / hydrator_count /
-- owner_hydrate_count; it also opens the polls. finalise_poll merges the winner into clocks.boosts
-- (additively, through normalise_boost_rack) and is the only other writer of that column.

-- 1. The revealed gated ids for an order at a level — the SQL mirror of unlockedBoostIdsFor in
--    src/utils/boost.js. The free level-1 rung (shine) is not part of boost_order, so it is never
--    a poll option and is deliberately absent here. Order [g0,g1,g2,...] → level 2 = g0,g1,
--    level 3 = g0..g3, ... capped at level 5 (MAX_LEVEL).
create or replace function public.revealed_boost_ids (
  p_order jsonb,
  p_level integer
)
  returns text[]
  language sql
  immutable
  set search_path to 'public'
  as $function$
  select coalesce(array_agg(x.id order by x.ord), '{}'::text[])
    from jsonb_array_elements_text(public.normalise_boost_order(p_order))
           with ordinality as x(id, ord)
   where x.ord - 1 < (least(coalesce(p_level, 1), 5) - 1) * 2;
$function$;

revoke all on function public.revealed_boost_ids(jsonb, integer) from anon, authenticated, service_role;
grant execute on function public.revealed_boost_ids(jsonb, integer) to postgres;

-- 2. Polls.
create table if not exists public.clock_polls (
  "id"          uuid        not null default gen_random_uuid(),
  "clock_id"    uuid        not null references public.clocks("id") on delete cascade,
  "level"       integer     not null,
  "option_a"    text        not null,
  "option_b"    text,
  "votes_a"     integer     not null default 0,
  "votes_b"     integer     not null default 0,
  "created_at"  timestamptz not null default now(),
  "closes_at"   timestamptz not null,
  "resolved_at" timestamptz,
  "winner"      text,
  constraint "clock_polls_pkey" primary key ("id"),
  constraint "clock_polls_clock_level_key" unique ("clock_id", "level")
);

create index if not exists "clock_polls_clock_idx" on public.clock_polls ("clock_id");

alter table public.clock_polls enable row level security;

-- Readable exactly when the clock itself is readable (live, or the viewer owns it). Options and
-- counters are the only public shape; there is no write policy — writes go through the RPCs only.
drop policy if exists "clock_polls_select_visible" on public.clock_polls;
create policy "clock_polls_select_visible" on public.clock_polls
  for select
  using (
    exists (
      select 1
        from public.clocks c
       where c."id" = clock_id
         and (c."status" = 'live' or c."user_id" = auth.uid())
    )
  );

-- 3. Votes. RLS on with no policies at all: clients can never read or write this table directly,
--    only the security-definer RPCs touch it.
create table if not exists public.clock_poll_votes (
  "poll_id"    uuid        not null references public.clock_polls("id") on delete cascade,
  "user_id"    uuid        not null,
  "choice"     text        not null,
  "created_at" timestamptz not null default now(),
  constraint "clock_poll_votes_pkey" primary key ("poll_id", "user_id"),
  constraint "clock_poll_votes_choice_check" check ("choice" in ('a', 'b'))
);

alter table public.clock_poll_votes enable row level security;

-- 3b. Realtime: the counters live on the poll row, so one subscription carries the tallies and the
--     create/resolve lifecycle. REPLICA IDENTITY FULL is needed so UPDATE payloads carry votes_a/b.
alter publication "supabase_realtime" add table public."clock_polls";
alter table public.clock_polls replica identity full;

-- 4. Cast a vote. Insert-deduped, so a repeat vote is a no-op rather than an error; the counter
--    only moves on a real insert. Returns the fresh tallies and the caller's recorded choice.
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
  v_added boolean := false;
begin
  if v_uid is null then
    raise exception 'Sign in to vote';
  end if;
  if p_choice not in ('a', 'b') then
    raise exception 'Invalid choice';
  end if;

  select * into v_poll from public.clock_polls where "id" = p_poll_id;
  if v_poll."id" is null then
    raise exception 'Poll not found';
  end if;
  if v_poll."resolved_at" is not null or now() >= v_poll."closes_at" then
    raise exception 'This vote has closed';
  end if;
  if p_choice = 'b' and v_poll."option_b" is null then
    raise exception 'Invalid choice';
  end if;

  insert into public.clock_poll_votes ("poll_id", "user_id", "choice")
  values (p_poll_id, v_uid, p_choice)
  on conflict ("poll_id", "user_id") do nothing;
  v_added := found;

  if v_added then
    update public.clock_polls
       set "votes_a" = "votes_a" + case when p_choice = 'a' then 1 else 0 end,
           "votes_b" = "votes_b" + case when p_choice = 'b' then 1 else 0 end
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

-- 5. Resolve one poll. Idempotent and row-locked: a tie is broken at random, a 0-0 poll resolves
--    with no winner (the effect is then eligible for re-offer), and the winner is merged into
--    clocks.boosts through normalise_boost_rack (additive, deduped by id, still guarantees shine).
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
  if now() < v_poll."closes_at" then
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

-- 5b. Resolve every overdue poll for a clock. Called from hydrate_clock (so a clock that keeps
--     being hydrated resolves on schedule) and from get_clock_polls (so a clock nobody touches
--     still resolves the moment someone views it).
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
              and p."resolved_at" is null
              and now() >= p."closes_at"
  loop
    perform public.finalise_poll(r."id");
  end loop;
end;
$function$;

revoke all on function public.finalise_due_polls(uuid) from public, anon, service_role;
grant execute on function public.finalise_due_polls(uuid) to postgres;

-- 5c. Public poll reader. Finalises anything overdue, then returns every poll for a clock (live or
--     owned) with counts and the caller's own choice. Read through useClockPoll.js only.
create or replace function public.get_clock_polls (
  p_clock_id uuid
)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
declare
  v_uid     uuid := auth.uid();
  v_visible boolean;
  v_out     jsonb;
begin
  select (c."status" = 'live' or c."user_id" = v_uid)
    into v_visible
    from public.clocks c
   where c."id" = p_clock_id;

  if coalesce(v_visible, false) is not true then
    return '[]'::jsonb;
  end if;

  perform public.finalise_due_polls(p_clock_id);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id',          p."id",
           'level',       p."level",
           'option_a',    p."option_a",
           'option_b',    p."option_b",
           'votes_a',     p."votes_a",
           'votes_b',     p."votes_b",
           'created_at',  p."created_at",
           'closes_at',   p."closes_at",
           'resolved_at', p."resolved_at",
           'winner',      p."winner",
           'my_choice',   (select v."choice" from public.clock_poll_votes v
                            where v."poll_id" = p."id" and v."user_id" = v_uid)
         ) order by p."level"), '[]'::jsonb)
    into v_out
    from public.clock_polls p
   where p."clock_id" = p_clock_id;

  return v_out;
end;
$function$;

revoke all on function public.get_clock_polls(uuid) from anon, authenticated, service_role;
grant execute on function public.get_clock_polls(uuid) to public, postgres;

-- 6. Backfill open polls for clocks that are already past level 1, so the feature doesn't start
--    cold. Options are the next two revealed-but-not-equipped, not-yet-reserved gated effects in
--    ladder order — exactly the deal hydrate_clock uses. A level that has nothing left to offer
--    (everything already equipped) simply gets no poll.
do $$
declare
  c            record;
  lvl          integer;
  v_candidates text[];
begin
  for c in select cl."id", cl."level", cl."boost_order", cl."boosts"
             from public.clocks cl
            where cl."level" >= 2
  loop
    for lvl in 2 .. least(c."level", 5) loop
      select array_agg(x.id order by x.ord)
        into v_candidates
        from unnest(public.revealed_boost_ids(c."boost_order", lvl))
               with ordinality as x(id, ord)
       where x.id <> all (
               select coalesce(e.value ->> 'id', '')
                 from jsonb_array_elements(coalesce(c."boosts", '[]'::jsonb)) as e(value)
             )
         and x.id not in (
               select p."option_a" from public.clock_polls p
                where p."clock_id" = c."id" and p."resolved_at" is null and p."option_a" is not null
               union
               select p."option_b" from public.clock_polls p
                where p."clock_id" = c."id" and p."resolved_at" is null and p."option_b" is not null
             );

      if v_candidates is not null and array_length(v_candidates, 1) >= 1 then
        insert into public.clock_polls ("clock_id", "level", "option_a", "option_b", "closes_at")
        values (
          c."id",
          lvl,
          v_candidates[1],
          case when array_length(v_candidates, 1) >= 2 then v_candidates[2] else null end,
          now() + interval '24 hours'
        )
        on conflict ("clock_id", "level") do nothing;
      end if;
    end loop;
  end loop;
end $$;

-- 7. The hydration writer, unchanged except for opening polls when a level is crossed. Captures the
--    pre-update level / order / rack so a single call that jumps several levels creates one poll per
--    crossed level; each iteration's reservation is re-read, so the pairs never overlap.
create or replace function public.hydrate_clock (
  target uuid,
  amount integer
)
  returns json
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
declare
  v_hydrate_count    bigint;
  v_level            integer;
  v_amount           integer := 0;
  v_prev_hydrate     bigint;
  v_becomes_hydrator boolean := false;
  v_is_owner         boolean;
  v_prev_level       integer;
  v_boost_order      jsonb;
  v_equipped         jsonb;
  v_lvl              integer;
  v_candidates       text[];
  v_drop_today       date := (now() at time zone 'UTC')::date;
  v_drop_stored      date;
  v_quota            integer := 10 + (((floor(extract(epoch from (now() at time zone 'UTC')::date) / 86400)::bigint % 11) + 11) % 11);
  v_drop_used        integer := 0;
  v_missed           integer := 0;
begin
  select c."user_id" = auth.uid(), c."level", c."boost_order", c."boosts"
    into v_is_owner, v_prev_level, v_boost_order, v_equipped
    from public.clocks c
   where c."id" = target
     for update;

  if v_is_owner is null then
    raise exception 'Clock not found';
  end if;

  select b."drop_day", b."drop_used", b."missed"
    into v_drop_stored, v_drop_used, v_missed
    from public.clock_hydrates b
   where b."clock_id" = target;

  -- SELECT ... INTO assigns NULL to every target when no row matches; a brand-new clock has no
  -- clock_hydrates row yet. A tally stored on an earlier day belongs to that day and must not be
  -- charged against today's quota. Mirrors computeDropLeft() in src/utils/boost.js.
  v_missed    := coalesce(v_missed, 0);
  v_drop_used := case when v_drop_stored is null or v_drop_stored < v_drop_today
                      then 0
                      else coalesce(v_drop_used, 0)
                 end;

  if v_is_owner then
    v_amount    := least(greatest(coalesce(amount, 0), 0), greatest(v_quota - v_drop_used, 0));
    v_drop_used := v_drop_used + v_amount;
  else
    -- Visitors hydrate one at a time; the app only ever sends 1. Clamped here so a tampered
    -- client cannot inflate a clock by calling the RPC with a large amount.
    v_amount := least(greatest(coalesce(amount, 0), 0), 1);
  end if;

  -- A zero-amount call is a no-op: no follows row, no donation spent, no counter movement.
  if v_amount > 0 then
    if not v_is_owner and v_missed > 0 then
      v_missed := v_missed - 1;
    end if;

    select f."hydrate_count"
      into v_prev_hydrate
      from public.follows f
     where f."user_id" = auth.uid()
       and f."clock_id" = target;

    -- First hydrate, or the first real hydrate on a legacy 0-count row.
    v_becomes_hydrator := (v_prev_hydrate is null)
                          or (coalesce(v_prev_hydrate, 0) <= 0);

    insert into public.follows ("user_id", "clock_id", "hydrate_count")
    values (auth.uid(), target, v_amount)
    on conflict ("user_id", "clock_id")
    do update set "hydrate_count" = public.follows."hydrate_count" + excluded."hydrate_count";

    update public.clocks
       set "hydrate_count"       = "hydrate_count" + v_amount,
           "level"               = public.quest_level("hydrate_count" + v_amount),
           "hydrator_count"      = "hydrator_count" + case when v_becomes_hydrator then 1 else 0 end,
           "owner_hydrate_count" = "owner_hydrate_count" + case when v_is_owner then v_amount else 0 end
     where "id" = target
     returning "hydrate_count", "level" into v_hydrate_count, v_level;
  else
    -- Report the untouched current state so the client's re-sync still works.
    select c."hydrate_count", c."level"
      into v_hydrate_count, v_level
      from public.clocks c
     where c."id" = target;
  end if;

  -- Resolve anything overdue, then deal a poll for every level this call crossed. Options are the
  -- first two revealed gated effects that are neither equipped nor reserved by an open poll; a
  -- level with only one candidate gets a one-option poll.
  if v_amount > 0 and v_level > coalesce(v_prev_level, 1) then
    perform public.finalise_due_polls(target);
    -- finalise_due_polls may have just merged a winner into clocks.boosts, so re-read the rack:
    -- a fresh winner must count as equipped and cannot be re-offered as a candidate below.
    select c."boosts" into v_equipped from public.clocks c where c."id" = target;
    for v_lvl in (coalesce(v_prev_level, 1) + 1) .. v_level loop
      select array_agg(x.id order by x.ord)
        into v_candidates
        from unnest(public.revealed_boost_ids(v_boost_order, v_lvl))
               with ordinality as x(id, ord)
       where x.id <> all (
               select coalesce(e.value ->> 'id', '')
                 from jsonb_array_elements(coalesce(v_equipped, '[]'::jsonb)) as e(value)
             )
         and x.id not in (
               select p."option_a" from public.clock_polls p
                where p."clock_id" = target and p."resolved_at" is null and p."option_a" is not null
               union
               select p."option_b" from public.clock_polls p
                where p."clock_id" = target and p."resolved_at" is null and p."option_b" is not null
             );

      if v_candidates is not null and array_length(v_candidates, 1) >= 1 then
        insert into public.clock_polls ("clock_id", "level", "option_a", "option_b", "closes_at")
        values (
          target,
          v_lvl,
          v_candidates[1],
          case when array_length(v_candidates, 1) >= 2 then v_candidates[2] else null end,
          now() + interval '24 hours'
        )
        on conflict ("clock_id", "level") do nothing;
      end if;
    end loop;
  end if;

  insert into public.clock_hydrates ("clock_id", "drop_day", "drop_used", "missed")
  values (target, v_drop_today, v_drop_used, v_missed)
  on conflict ("clock_id")
  do update set "drop_day"  = excluded."drop_day",
                "drop_used" = excluded."drop_used",
                "missed"    = excluded."missed";

  return json_build_object(
    'hydrate_count', v_hydrate_count,
    'level',         v_level,
    'drop_day',      to_char(v_drop_today, 'YYYY-MM-DD'),
    'drop_used',     v_drop_used,
    'missed',        v_missed
  );
end;
$function$;

revoke all on function public.hydrate_clock(uuid, integer) from public, anon, service_role;
grant execute on function public.hydrate_clock(uuid, integer) to authenticated, postgres;
