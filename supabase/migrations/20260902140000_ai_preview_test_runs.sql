-- AI capability preview lab — audit generico per testo, regole e immagini.
-- Non contiene chunk di memoria né payload binari immagine.

CREATE TABLE IF NOT EXISTS public.ai_preview_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('narrative_text', 'official_rules', 'grounded_image')),
  mode text NOT NULL CHECK (char_length(mode) >= 1 AND char_length(mode) <= 120),
  input_normalized text NOT NULL CHECK (char_length(input_normalized) >= 3 AND char_length(input_normalized) <= 2000),
  status text NOT NULL CHECK (status IN ('completed', 'insufficient_evidence', 'failed')),
  classification text NOT NULL CHECK (classification IN ('grounded_proposal', 'grounding_insufficient', 'official_rule_found', 'official_rule_not_found', 'provider_unavailable')),
  output_text text NULL CHECK (output_text IS NULL OR char_length(output_text) <= 8000),
  output_ref jsonb NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  timings_ms jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback_rating text NULL CHECK (feedback_rating IN ('approved', 'needs_review', 'incorrect')),
  feedback_note text NULL CHECK (feedback_note IS NULL OR char_length(feedback_note) <= 2000),
  feedback_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_preview_test_runs_campaign_idx
  ON public.ai_preview_test_runs (campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_preview_test_runs_requested_by_idx
  ON public.ai_preview_test_runs (requested_by, created_at DESC);

ALTER TABLE public.ai_preview_test_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_preview_test_runs_authenticated_select" ON public.ai_preview_test_runs;
DROP POLICY IF EXISTS "ai_preview_test_runs_authenticated_insert" ON public.ai_preview_test_runs;
DROP POLICY IF EXISTS "ai_preview_test_runs_authenticated_update" ON public.ai_preview_test_runs;
DROP POLICY IF EXISTS "ai_preview_test_runs_authenticated_delete" ON public.ai_preview_test_runs;

REVOKE ALL ON public.ai_preview_test_runs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_preview_test_runs TO service_role;

COMMENT ON TABLE public.ai_preview_test_runs IS
  'Audit server-only del laboratorio Admin AI: testo, regole e immagini; nessun chunk o binario immagine.';
COMMENT ON COLUMN public.ai_preview_test_runs.sources IS
  'Riferimenti e metadati delle fonti, mai contenuto dei chunk.';
COMMENT ON COLUMN public.ai_preview_test_runs.output_ref IS
  'Riferimento/metadati sicuri dell output non testuale; mai payload binario o data URL.';
