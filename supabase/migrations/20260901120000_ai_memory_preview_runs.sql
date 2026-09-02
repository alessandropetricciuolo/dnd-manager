-- AI Memory Preview — audit runs (M1)
-- Non duplica contenuti chunk; conserva solo riferimenti + metadati.

CREATE TABLE IF NOT EXISTS public.ai_memory_preview_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'preview' CHECK (mode IN ('preview')),
  question text NOT NULL CHECK (char_length(question) >= 3 AND char_length(question) <= 2000),
  status text NOT NULL CHECK (status IN ('answered', 'insufficient_evidence', 'failed')),
  classification text NOT NULL CHECK (classification IN ('fatto_canonico', 'informazione_assente', 'conflitto')),
  answer text NOT NULL,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  retrieval jsonb NOT NULL DEFAULT '{}'::jsonb,
  timings_ms jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback_rating text NULL CHECK (feedback_rating IN ('approved', 'needs_review', 'incorrect')),
  feedback_note text NULL CHECK (feedback_note IS NULL OR char_length(feedback_note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  feedback_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS ai_memory_preview_runs_campaign_idx
  ON public.ai_memory_preview_runs (campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_memory_preview_runs_requested_by_idx
  ON public.ai_memory_preview_runs (requested_by, created_at DESC);

ALTER TABLE public.ai_memory_preview_runs ENABLE ROW LEVEL SECURITY;

-- Audit immutabile per i client: ogni lettura/scrittura passa dalle Server Actions
-- con service_role. Nessuna policy per authenticated.
DROP POLICY IF EXISTS "ai_memory_preview_runs_gm_admin_select" ON public.ai_memory_preview_runs;
DROP POLICY IF EXISTS "ai_memory_preview_runs_gm_admin_insert" ON public.ai_memory_preview_runs;
DROP POLICY IF EXISTS "ai_memory_preview_runs_gm_admin_update" ON public.ai_memory_preview_runs;
DROP POLICY IF EXISTS "ai_memory_preview_runs_gm_admin_delete" ON public.ai_memory_preview_runs;

REVOKE ALL ON public.ai_memory_preview_runs FROM PUBLIC;
GRANT ALL ON public.ai_memory_preview_runs TO service_role;
REVOKE ALL ON public.ai_memory_preview_runs FROM authenticated;

COMMENT ON TABLE public.ai_memory_preview_runs IS 'Audit read-only della preview memoria GM (nessuna scrittura di dominio, solo riferimenti a chunk).';
