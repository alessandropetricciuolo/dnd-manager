create table if not exists public.ai_assistant_threads (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade, mode text not null default 'v2_pilot',
  status text not null default 'active' check (status in ('active','archived')), state_version integer not null default 1,
  summary text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id, owner_user_id)
);
create table if not exists public.ai_assistant_turns (
  id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.ai_assistant_threads(id) on delete cascade,
  sequence integer not null, role text not null check (role in ('user','assistant')), content text not null,
  intent text, artifact_ids uuid[] not null default '{}', created_at timestamptz not null default now(), unique(thread_id, sequence)
);
create table if not exists public.ai_assistant_artifacts (
  id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.ai_assistant_threads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade, kind text not null, status text not null,
  revision integer not null default 1, parent_artifact_id uuid references public.ai_assistant_artifacts(id), payload jsonb not null default '{}',
  source_refs jsonb not null default '[]', policy_version text, saved_entity jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id, revision)
);
create index if not exists ai_assistant_threads_owner_updated on public.ai_assistant_threads(owner_user_id, updated_at desc);
create index if not exists ai_assistant_threads_campaign_updated on public.ai_assistant_threads(campaign_id, updated_at desc);
create index if not exists ai_assistant_turns_thread_sequence on public.ai_assistant_turns(thread_id, sequence desc);
create index if not exists ai_assistant_artifacts_thread_status on public.ai_assistant_artifacts(thread_id, status);
-- Each draft revision is a new immutable row. Two concurrent edits of the
-- same parent cannot silently overwrite one another.
create unique index if not exists ai_assistant_artifacts_parent_revision_unique
  on public.ai_assistant_artifacts(parent_artifact_id, revision)
  where parent_artifact_id is not null;
alter table public.ai_assistant_artifacts add column if not exists parent_revision_id uuid references public.ai_assistant_artifacts(id);
alter table public.ai_assistant_threads enable row level security;
alter table public.ai_assistant_turns enable row level security;
alter table public.ai_assistant_artifacts enable row level security;
-- Defense in depth: players cannot create or inspect AI state by calling the
-- Data API directly. Campaign authorization is enforced again by Server
-- Actions before retrieval, providers, or canonical writes.
drop policy if exists ai_assistant_threads_owner on public.ai_assistant_threads;
drop policy if exists ai_assistant_turns_owner on public.ai_assistant_turns;
drop policy if exists ai_assistant_artifacts_owner on public.ai_assistant_artifacts;
drop policy if exists ai_assistant_threads_gm_owner on public.ai_assistant_threads;
drop policy if exists ai_assistant_turns_gm_owner on public.ai_assistant_turns;
drop policy if exists ai_assistant_artifacts_gm_owner on public.ai_assistant_artifacts;
create policy ai_assistant_threads_gm_owner on public.ai_assistant_threads for all to authenticated using ((select auth.uid()) = owner_user_id and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('gm', 'admin'))) with check ((select auth.uid()) = owner_user_id and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('gm', 'admin')));
create policy ai_assistant_turns_gm_owner on public.ai_assistant_turns for all to authenticated using (exists (select 1 from public.ai_assistant_threads t join public.profiles p on p.id = t.owner_user_id where t.id = thread_id and t.owner_user_id = (select auth.uid()) and p.role in ('gm', 'admin'))) with check (exists (select 1 from public.ai_assistant_threads t join public.profiles p on p.id = t.owner_user_id where t.id = thread_id and t.owner_user_id = (select auth.uid()) and p.role in ('gm', 'admin')));
create policy ai_assistant_artifacts_gm_owner on public.ai_assistant_artifacts for all to authenticated using (exists (select 1 from public.ai_assistant_threads t join public.profiles p on p.id = t.owner_user_id where t.id = thread_id and t.owner_user_id = (select auth.uid()) and p.role in ('gm', 'admin'))) with check (exists (select 1 from public.ai_assistant_threads t join public.profiles p on p.id = t.owner_user_id where t.id = thread_id and t.owner_user_id = (select auth.uid()) and p.role in ('gm', 'admin')));
create or replace function public.ai_assistant_touch_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists ai_assistant_threads_touch on public.ai_assistant_threads;
drop trigger if exists ai_assistant_artifacts_touch on public.ai_assistant_artifacts;
create trigger ai_assistant_threads_touch before update on public.ai_assistant_threads for each row execute function public.ai_assistant_touch_updated_at();
create trigger ai_assistant_artifacts_touch before update on public.ai_assistant_artifacts for each row execute function public.ai_assistant_touch_updated_at();
