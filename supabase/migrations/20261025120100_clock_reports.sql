create table if not exists public.clock_reports (
    "id" uuid not null default gen_random_uuid(),
    "clock_id" uuid not null references public.clocks("id") on delete cascade,
    "reporter_id" uuid not null references auth.users("id") on delete cascade,
    "reason" text not null,
    "status" text not null default 'open',
    "created_at" timestamptz not null default now(),
    "resolved_at" timestamptz,
    "resolved_by" uuid references auth.users("id") on delete set null,
    constraint "clock_reports_pkey" primary key ("id"),
    constraint "clock_reports_status_check" check ("status" in ('open', 'resolved', 'dismissed')),
    constraint "clock_reports_reason_check" check (char_length(btrim("reason", E' \t\n\r')) between 1 and 500),
    constraint "clock_reports_clock_reporter_key" unique ("clock_id", "reporter_id")
);

create index if not exists clock_reports_status_created_idx
    on public.clock_reports ("status", "created_at");

create index if not exists clock_reports_reporter_idx
    on public.clock_reports ("reporter_id");

alter table public.clock_reports enable row level security;

drop policy if exists "clock_reports_insert_own" on public.clock_reports;
create policy "clock_reports_insert_own" on public.clock_reports
    for insert
    to authenticated
    with check (
        "reporter_id" = auth.uid()
        and "status" = 'open'
        and "resolved_at" is null
        and "resolved_by" is null
        and exists (
            select 1
            from public.clocks c
            where c."id" = "clock_id"
                and c."status" = 'live'
                and c."user_id" <> auth.uid()
        )
    );

revoke all on table public.clock_reports from anon, authenticated;
grant insert ("clock_id", "reporter_id", "reason") on table public.clock_reports to authenticated;
grant all on table public.clock_reports to service_role;

create or replace function public.get_clock_reports()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  ) into v_is_admin;

  if not coalesce(v_is_admin, false) then
    raise exception 'Forbidden';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'clock_id', r.clock_id,
        'clock_title', c.title,
        'clock_status', c.status,
        'reporter_handle', p.username,
        'reason', r.reason,
        'created_at', r.created_at
      )
      order by r.created_at asc
    )
    from public.clock_reports r
    left join public.clocks c on c.id = r.clock_id
    left join public.profiles p on p.id = r.reporter_id
    where r.status = 'open'
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_clock_reports() from anon, public;
grant execute on function public.get_clock_reports() to authenticated;

create or replace function public.resolve_clock_report(
  p_report_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  ) into v_is_admin;

  if not coalesce(v_is_admin, false) then
    raise exception 'Forbidden';
  end if;

  if p_status is null or p_status not in ('resolved', 'dismissed') then
    raise exception 'Invalid report status';
  end if;

  update public.clock_reports
     set status = p_status,
         resolved_at = now(),
         resolved_by = auth.uid()
   where id = p_report_id
     and status = 'open';
end;
$$;

revoke all on function public.resolve_clock_report(uuid, text) from anon, public;
grant execute on function public.resolve_clock_report(uuid, text) to authenticated;
