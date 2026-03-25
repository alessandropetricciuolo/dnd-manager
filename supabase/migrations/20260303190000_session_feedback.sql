create table if not exists public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  session_rating integer not null check (session_rating between 1 and 5),
  campaign_rating integer not null check (campaign_rating between 1 and 5),
  comment text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create index if not exists session_feedback_campaign_idx on public.session_feedback(campaign_id);
create index if not exists session_feedback_player_idx on public.session_feedback(player_id);
create index if not exists session_feedback_session_idx on public.session_feedback(session_id);

drop trigger if exists session_feedback_updated_at on public.session_feedback;
create trigger session_feedback_updated_at
before update on public.session_feedback
for each row execute function public.update_updated_at_column();

alter table public.session_feedback enable row level security;

drop policy if exists "session_feedback_player_select_own" on public.session_feedback;
create policy "session_feedback_player_select_own"
on public.session_feedback
for select
to authenticated
using (player_id = auth.uid());

drop policy if exists "session_feedback_player_insert_attended" on public.session_feedback;
create policy "session_feedback_player_insert_attended"
on public.session_feedback
for insert
to authenticated
with check (
  player_id = auth.uid()
  and exists (
    select 1
    from public.session_signups ss
    where ss.session_id = session_feedback.session_id
      and ss.player_id = auth.uid()
      and ss.status = 'attended'
  )
);

drop policy if exists "session_feedback_player_update_own_attended" on public.session_feedback;
create policy "session_feedback_player_update_own_attended"
on public.session_feedback
for update
to authenticated
using (
  player_id = auth.uid()
  and exists (
    select 1
    from public.session_signups ss
    where ss.session_id = session_feedback.session_id
      and ss.player_id = auth.uid()
      and ss.status = 'attended'
  )
)
with check (
  player_id = auth.uid()
  and exists (
    select 1
    from public.session_signups ss
    where ss.session_id = session_feedback.session_id
      and ss.player_id = auth.uid()
      and ss.status = 'attended'
  )
);

drop policy if exists "session_feedback_admin_all" on public.session_feedback;
create policy "session_feedback_admin_all"
on public.session_feedback
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
