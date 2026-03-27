create table if not exists public.admin_communications (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body_html text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_communication_recipients (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.admin_communications(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped_no_email')),
  sent_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (communication_id, player_id)
);

create index if not exists admin_communications_created_at_idx
  on public.admin_communications(created_at desc);

create index if not exists admin_communication_recipients_comm_idx
  on public.admin_communication_recipients(communication_id);

create index if not exists admin_communication_recipients_status_idx
  on public.admin_communication_recipients(status);

drop trigger if exists admin_communications_updated_at on public.admin_communications;
create trigger admin_communications_updated_at
before update on public.admin_communications
for each row execute function public.update_updated_at_column();

drop trigger if exists admin_communication_recipients_updated_at on public.admin_communication_recipients;
create trigger admin_communication_recipients_updated_at
before update on public.admin_communication_recipients
for each row execute function public.update_updated_at_column();

alter table public.admin_communications enable row level security;
alter table public.admin_communication_recipients enable row level security;

drop policy if exists "admin_communications_admin_all" on public.admin_communications;
create policy "admin_communications_admin_all"
on public.admin_communications
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "admin_communication_recipients_admin_all" on public.admin_communication_recipients;
create policy "admin_communication_recipients_admin_all"
on public.admin_communication_recipients
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
