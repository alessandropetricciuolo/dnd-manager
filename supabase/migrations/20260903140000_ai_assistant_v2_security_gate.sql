-- GM Assistant v2 M5.5: server-only pilot state and explicit pilot entitlement.
-- The Server Actions repeat campaign and pilot authorization before using
-- service_role for retrieval, providers, or these tables.

create table if not exists public.ai_assistant_pilot_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  enabled boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_assistant_pilot_access_global_unique
  on public.ai_assistant_pilot_access (user_id) where campaign_id is null;
create unique index if not exists ai_assistant_pilot_access_campaign_unique
  on public.ai_assistant_pilot_access (user_id, campaign_id) where campaign_id is not null;

alter table public.ai_assistant_pilot_access enable row level security;

-- No browser client may read or mutate pilot state. It is returned only by
-- guarded Server Actions; service_role is the sole writer/reader.
revoke all on table public.ai_assistant_pilot_access from anon, authenticated;
revoke all on table public.ai_assistant_threads from anon, authenticated;
revoke all on table public.ai_assistant_turns from anon, authenticated;
revoke all on table public.ai_assistant_artifacts from anon, authenticated;

-- Remove the permissive policies from the first pilot migration. Revoked
-- grants make these tables inaccessible through the public Data API even if a
-- later policy is accidentally added; the server uses service_role only.
drop policy if exists ai_assistant_threads_gm_owner on public.ai_assistant_threads;
drop policy if exists ai_assistant_turns_gm_owner on public.ai_assistant_turns;
drop policy if exists ai_assistant_artifacts_gm_owner on public.ai_assistant_artifacts;

alter table public.ai_assistant_artifacts
  drop constraint if exists ai_assistant_artifacts_status_check;
alter table public.ai_assistant_artifacts
  add constraint ai_assistant_artifacts_status_check
  check (status in ('draft', 'ready_for_review', 'approved', 'saving', 'saved', 'discarded', 'failed'));
alter table public.ai_assistant_artifacts
  add column if not exists save_action_name text,
  add column if not exists save_started_at timestamptz;

alter table public.ai_assistant_artifacts
  drop constraint if exists ai_assistant_artifacts_kind_check;
alter table public.ai_assistant_artifacts
  add constraint ai_assistant_artifacts_kind_check
  check (kind in ('narrative', 'wiki', 'image', 'rules', 'sheet', 'action'));

create index if not exists ai_assistant_artifacts_campaign_status
  on public.ai_assistant_artifacts (campaign_id, status);

create table if not exists public.ai_assistant_feedback (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid references public.ai_assistant_artifacts(id) on delete cascade,
  turn_id uuid references public.ai_assistant_turns(id) on delete cascade,
  rating text not null check (rating in ('approved', 'needs_review', 'incorrect')),
  note text check (note is null or char_length(note) <= 2000),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (artifact_id is not null or turn_id is not null)
);
alter table public.ai_assistant_feedback enable row level security;
revoke all on table public.ai_assistant_feedback from anon, authenticated;
create index if not exists ai_assistant_feedback_artifact_created
  on public.ai_assistant_feedback (artifact_id, created_at desc);
create index if not exists ai_assistant_feedback_turn_created
  on public.ai_assistant_feedback (turn_id, created_at desc);

-- State reservation happens before executeAction. A retry sees `saving` or
-- `saved` and cannot create a second domain entity.
create index if not exists ai_assistant_artifacts_saving_idx
  on public.ai_assistant_artifacts (id, revision) where status = 'saving';
