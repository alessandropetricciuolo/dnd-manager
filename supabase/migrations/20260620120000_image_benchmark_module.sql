-- Benchmark modelli generativi immagini (admin only, OpenRouter)

CREATE OR REPLACE FUNCTION public.image_benchmark_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE TABLE public.image_benchmark_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX image_benchmark_runs_created_at_idx ON public.image_benchmark_runs (created_at DESC);

CREATE TABLE public.image_benchmark_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.image_benchmark_runs(id) ON DELETE CASCADE,
  category text NOT NULL,
  prompt text NOT NULL,
  aspect_ratio text NOT NULL DEFAULT '1:1',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX image_benchmark_prompts_run_idx ON public.image_benchmark_prompts (run_id, sort_order);

CREATE TABLE public.image_benchmark_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.image_benchmark_runs(id) ON DELETE CASCADE,
  prompt_id uuid NOT NULL REFERENCES public.image_benchmark_prompts(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'openrouter',
  model text NOT NULL,
  prompt text NOT NULL,
  aspect_ratio text NOT NULL,
  image_url text,
  image_base64 text,
  raw_response jsonb,
  duration_ms int,
  estimated_cost_usd numeric,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX image_benchmark_results_run_idx ON public.image_benchmark_results (run_id, created_at DESC);
CREATE INDEX image_benchmark_results_prompt_idx ON public.image_benchmark_results (prompt_id);
CREATE INDEX image_benchmark_results_status_idx ON public.image_benchmark_results (status);

CREATE TABLE public.image_benchmark_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL UNIQUE REFERENCES public.image_benchmark_results(id) ON DELETE CASCADE,
  aesthetic_score int CHECK (aesthetic_score BETWEEN 1 AND 5),
  prompt_adherence_score int CHECK (prompt_adherence_score BETWEEN 1 AND 5),
  text_rendering_score int CHECK (text_rendering_score BETWEEN 1 AND 5),
  fantasy_usefulness_score int CHECK (fantasy_usefulness_score BETWEEN 1 AND 5),
  production_ready_score int CHECK (production_ready_score BETWEEN 1 AND 5),
  notes text,
  scored_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.image_benchmark_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_benchmark_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_benchmark_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_benchmark_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "image_benchmark_runs_admin_all"
  ON public.image_benchmark_runs FOR ALL
  USING (public.image_benchmark_user_is_admin())
  WITH CHECK (public.image_benchmark_user_is_admin());

CREATE POLICY "image_benchmark_prompts_admin_all"
  ON public.image_benchmark_prompts FOR ALL
  USING (public.image_benchmark_user_is_admin())
  WITH CHECK (public.image_benchmark_user_is_admin());

CREATE POLICY "image_benchmark_results_admin_all"
  ON public.image_benchmark_results FOR ALL
  USING (public.image_benchmark_user_is_admin())
  WITH CHECK (public.image_benchmark_user_is_admin());

CREATE POLICY "image_benchmark_scores_admin_all"
  ON public.image_benchmark_scores FOR ALL
  USING (public.image_benchmark_user_is_admin())
  WITH CHECK (public.image_benchmark_user_is_admin());
