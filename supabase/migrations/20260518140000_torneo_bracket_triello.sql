-- Bracket triello: stessa squadra su A/B; vincitore può essere un PG.

ALTER TABLE public.torneo_matches DROP CONSTRAINT IF EXISTS torneo_matches_distinct_teams;

ALTER TABLE public.torneo_matches
  ADD CONSTRAINT torneo_matches_distinct_teams
  CHECK (match_kind = 'triello' OR team_a_id <> team_b_id);

ALTER TABLE public.torneo_matches
  ADD COLUMN IF NOT EXISTS winner_character_id UUID REFERENCES public.campaign_characters(id) ON DELETE SET NULL;

ALTER TABLE public.gm_remote_sessions
  ADD COLUMN IF NOT EXISTS focused_match_id UUID REFERENCES public.torneo_matches(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.torneo_matches.winner_character_id IS 'Vincitore triello (PG), se match_kind = triello.';
