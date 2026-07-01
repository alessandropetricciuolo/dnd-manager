-- Command Center / GM Workspace (Fase 1)
-- workspace_id nullable in B&D; obbligatorio in gmflow (futuro).

CREATE TABLE public.command_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NULL,
  campaign_id UUID NULL REFERENCES public.campaigns(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('text', 'voice', 'manual', 'import', 'image', 'file')),
  raw_content TEXT NOT NULL DEFAULT '',
  transcript TEXT NULL,
  language TEXT NOT NULL DEFAULT 'it',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX command_inputs_created_by_idx ON public.command_inputs (created_by, created_at DESC);
CREATE INDEX command_inputs_campaign_idx ON public.command_inputs (campaign_id) WHERE campaign_id IS NOT NULL;

CREATE TABLE public.command_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NULL,
  campaign_id UUID NULL REFERENCES public.campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'inbox'
    CHECK (status IN ('inbox', 'reviewed', 'linked', 'converted', 'archived')),
  source_input_id UUID NULL REFERENCES public.command_inputs(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX command_notes_created_by_idx ON public.command_notes (created_by, updated_at DESC);
CREATE INDEX command_notes_status_idx ON public.command_notes (created_by, status);
CREATE INDEX command_notes_campaign_idx ON public.command_notes (campaign_id) WHERE campaign_id IS NOT NULL;

CREATE TABLE public.command_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NULL,
  note_id UUID NULL REFERENCES public.command_notes(id) ON DELETE CASCADE,
  input_id UUID NULL REFERENCES public.command_inputs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN (
      'campaign', 'session', 'npc', 'location', 'quest', 'faction', 'item', 'lore',
      'wiki_page', 'task', 'monster', 'mission'
    )),
  entity_id UUID NOT NULL,
  confidence REAL NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (note_id IS NOT NULL OR input_id IS NOT NULL)
);

CREATE INDEX command_links_note_idx ON public.command_links (note_id) WHERE note_id IS NOT NULL;
CREATE INDEX command_links_entity_idx ON public.command_links (entity_type, entity_id);

CREATE TABLE public.workspace_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NULL,
  campaign_id UUID NULL REFERENCES public.campaigns(id) ON DELETE SET NULL,
  parent_page_id UUID NULL REFERENCES public.workspace_pages(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  icon TEXT NULL,
  page_type TEXT NOT NULL DEFAULT 'note'
    CHECK (page_type IN ('note', 'doc', 'task_board', 'wiki_draft', 'planning', 'recap', 'idea')),
  content_markdown TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX workspace_pages_created_by_idx ON public.workspace_pages (created_by, updated_at DESC);
CREATE INDEX workspace_pages_campaign_idx ON public.workspace_pages (campaign_id) WHERE campaign_id IS NOT NULL;

CREATE TABLE public.workspace_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NULL,
  campaign_id UUID NULL REFERENCES public.campaigns(id) ON DELETE SET NULL,
  session_id UUID NULL REFERENCES public.sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'doing', 'done', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE NULL,
  assigned_to UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_note_id UUID NULL REFERENCES public.command_notes(id) ON DELETE SET NULL,
  source_action_id UUID NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX workspace_tasks_created_by_idx ON public.workspace_tasks (created_by, status);
CREATE INDEX workspace_tasks_campaign_idx ON public.workspace_tasks (campaign_id) WHERE campaign_id IS NOT NULL;

-- updated_at triggers
DROP TRIGGER IF EXISTS command_notes_updated_at ON public.command_notes;
CREATE TRIGGER command_notes_updated_at
  BEFORE UPDATE ON public.command_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS workspace_pages_updated_at ON public.workspace_pages;
CREATE TRIGGER workspace_pages_updated_at
  BEFORE UPDATE ON public.workspace_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS workspace_tasks_updated_at ON public.workspace_tasks;
CREATE TRIGGER workspace_tasks_updated_at
  BEFORE UPDATE ON public.workspace_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.command_notes IS 'Inbox Command Center; parallelo a gm_notes (tab GM campagna).';
COMMENT ON TABLE public.workspace_tasks IS 'Task GM nel Command Center; distinti da campaign_missions.';

-- RLS: solo GM e Admin
ALTER TABLE public.command_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "command_inputs_gm_admin"
  ON public.command_inputs FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin() AND created_by = auth.uid());

CREATE POLICY "command_notes_gm_admin"
  ON public.command_notes FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin() AND created_by = auth.uid());

CREATE POLICY "command_links_gm_admin"
  ON public.command_links FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin());

CREATE POLICY "workspace_pages_gm_admin"
  ON public.workspace_pages FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin() AND created_by = auth.uid());

CREATE POLICY "workspace_tasks_gm_admin"
  ON public.workspace_tasks FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin() AND created_by = auth.uid());
