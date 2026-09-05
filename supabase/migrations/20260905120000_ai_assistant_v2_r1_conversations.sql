-- R1: conversation metadata, safe feedback, and atomic thread sequencing.
alter table public.ai_assistant_threads
  add column if not exists title text;

create index if not exists ai_assistant_threads_campaign_status_updated
  on public.ai_assistant_threads(campaign_id, status, updated_at desc);

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
  on public.ai_assistant_feedback(artifact_id, created_at desc);
create index if not exists ai_assistant_feedback_turn_created
  on public.ai_assistant_feedback(turn_id, created_at desc);

-- Atomic sequence allocation prevents two concurrent tabs from receiving the
-- same turn sequence. The caller must already have passed the server guard.
create or replace function public.ai_assistant_next_turn_sequence(p_thread_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare next_sequence integer;
begin
  perform 1 from public.ai_assistant_threads where id = p_thread_id for update;
  if not found then raise exception 'assistant thread not found'; end if;
  select coalesce(max(sequence), 0) + 1 into next_sequence
    from public.ai_assistant_turns where thread_id = p_thread_id;
  return next_sequence;
end;
$$;

revoke all on function public.ai_assistant_next_turn_sequence(uuid) from public, anon, authenticated;

create or replace function public.ai_assistant_append_turn(
  p_thread_id uuid, p_role text, p_content text, p_intent text, p_artifact_ids uuid[]
)
returns public.ai_assistant_turns
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.ai_assistant_turns;
begin
  perform 1 from public.ai_assistant_threads where id = p_thread_id for update;
  if not found then raise exception 'assistant thread not found'; end if;
  insert into public.ai_assistant_turns(thread_id, sequence, role, content, intent, artifact_ids)
  select p_thread_id, coalesce(max(sequence), 0) + 1, p_role, p_content, p_intent, coalesce(p_artifact_ids, '{}')
  from public.ai_assistant_turns where thread_id = p_thread_id
  returning * into result_row;
  return result_row;
end;
$$;

revoke all on function public.ai_assistant_append_turn(uuid, text, text, text, uuid[]) from public, anon, authenticated;
