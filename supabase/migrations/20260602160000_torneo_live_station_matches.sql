-- Due tavoli paralleli: associa incontri attivi alla sessione live (megatimer e telecomando distinti).

ALTER TABLE public.torneo_live_sessions
  ADD COLUMN IF NOT EXISTS station1_match_id UUID REFERENCES public.torneo_matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS station2_match_id UUID REFERENCES public.torneo_matches(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.torneo_live_sessions.station1_match_id IS 'Incontro sul tavolo 1 (megatimer / PC operatore dedicati).';
COMMENT ON COLUMN public.torneo_live_sessions.station2_match_id IS 'Incontro sul tavolo 2 (megatimer / PC operatore dedicati).';
