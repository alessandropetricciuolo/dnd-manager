-- Action Registry audit log (Fase 2 Command Center)

CREATE TABLE public.app_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NULL,
  user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'user'
    CHECK (actor_type IN ('user', 'ai', 'system')),
  action_name TEXT NOT NULL,
  entity_type TEXT NULL,
  entity_id UUID NULL,
  before_snapshot JSONB NULL,
  after_snapshot JSONB NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX app_audit_events_created_at_idx ON public.app_audit_events (created_at DESC);
CREATE INDEX app_audit_events_action_name_idx ON public.app_audit_events (action_name, created_at DESC);
CREATE INDEX app_audit_events_user_idx ON public.app_audit_events (user_id, created_at DESC);
CREATE INDEX app_audit_events_entity_idx ON public.app_audit_events (entity_type, entity_id)
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;

COMMENT ON TABLE public.app_audit_events IS 'Audit trail per Action Registry (Command Center / AI Control Plane).';

ALTER TABLE public.app_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_audit_events_gm_admin_select"
  ON public.app_audit_events FOR SELECT
  USING (public.is_gm_or_admin());

CREATE POLICY "app_audit_events_gm_admin_insert"
  ON public.app_audit_events FOR INSERT
  WITH CHECK (public.is_gm_or_admin());
