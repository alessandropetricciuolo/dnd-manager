-- AI Control Plane: proposte action in attesa di conferma (Fase 3+)

CREATE TABLE public.ai_action_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NULL,
  campaign_id UUID NULL REFERENCES public.campaigns(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_input_id UUID NULL REFERENCES public.command_inputs(id) ON DELETE SET NULL,
  note_id UUID NULL REFERENCES public.command_notes(id) ON DELETE SET NULL,
  action_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'approved', 'executed', 'rejected', 'failed')),
  input_payload JSONB NOT NULL DEFAULT '{}',
  preview_payload JSONB NOT NULL DEFAULT '{}',
  result_payload JSONB NULL,
  rationale TEXT NULL,
  error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ NULL,
  executed_at TIMESTAMPTZ NULL
);

CREATE INDEX ai_action_requests_status_idx ON public.ai_action_requests (requested_by, status, created_at DESC);
CREATE INDEX ai_action_requests_campaign_idx ON public.ai_action_requests (campaign_id, created_at DESC)
  WHERE campaign_id IS NOT NULL;

COMMENT ON TABLE public.ai_action_requests IS 'Proposte AI per Action Registry; esecuzione solo dopo approvazione GM.';

ALTER TABLE public.ai_action_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_action_requests_gm_admin"
  ON public.ai_action_requests FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin() AND requested_by = auth.uid());
