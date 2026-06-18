-- Voto coerenza campagna nel benchmark immagini

ALTER TABLE public.image_benchmark_scores
  ADD COLUMN IF NOT EXISTS campaign_coherence_score int
    CHECK (campaign_coherence_score BETWEEN 1 AND 5);
