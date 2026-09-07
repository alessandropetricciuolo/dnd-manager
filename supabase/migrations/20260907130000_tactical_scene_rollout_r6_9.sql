-- R6.9 rollout controls and idempotent backfill ledger.
-- Legacy scene/map tables are deliberately read-only to this migration.

CREATE TABLE public.tactical_scene_rollouts (
  campaign_id UUID PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  legacy_read_only BOOLEAN NOT NULL DEFAULT true CHECK (legacy_read_only),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tactical_scene_backfill_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_scene_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  source_revision_no INTEGER NOT NULL,
  source_checksum TEXT NOT NULL,
  tactical_scene_id UUID REFERENCES public.tactical_scenes(id) ON DELETE SET NULL,
  state TEXT NOT NULL CHECK (state IN ('planned', 'applied', 'blocked', 'rolled_back')),
  report JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(report) = 'object'),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(legacy_scene_id, source_revision_no, source_checksum)
);
CREATE INDEX tactical_scene_backfill_campaign_idx ON public.tactical_scene_backfill_records(campaign_id);

GRANT SELECT, INSERT, UPDATE ON public.tactical_scene_rollouts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tactical_scene_backfill_records TO authenticated;
ALTER TABLE public.tactical_scene_rollouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_scene_backfill_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY tactical_scene_rollouts_gm_admin ON public.tactical_scene_rollouts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('gm', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('gm', 'admin')));
CREATE POLICY tactical_scene_backfill_records_gm_admin ON public.tactical_scene_backfill_records FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('gm', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('gm', 'admin')));

COMMENT ON TABLE public.tactical_scene_rollouts IS 'Per-campaign opt-in for the R6 workspace; legacy routes remain source-of-truth.';
COMMENT ON TABLE public.tactical_scene_backfill_records IS 'Idempotent, auditable legacy conversion ledger. No legacy row is mutated.';
