-- Slot tabellone senza squadre finché non avanzano i vincitori dei turni precedenti.

ALTER TABLE public.torneo_matches
  ALTER COLUMN team_a_id DROP NOT NULL,
  ALTER COLUMN team_b_id DROP NOT NULL;

ALTER TABLE public.torneo_matches
  ADD COLUMN IF NOT EXISTS team_a_placeholder TEXT,
  ADD COLUMN IF NOT EXISTS team_b_placeholder TEXT;

ALTER TABLE public.torneo_matches DROP CONSTRAINT IF EXISTS torneo_matches_distinct_teams;

ALTER TABLE public.torneo_matches
  ADD CONSTRAINT torneo_matches_distinct_teams
  CHECK (
    match_kind = 'triello'
    OR team_a_id IS NULL
    OR team_b_id IS NULL
    OR team_a_id <> team_b_id
  );

COMMENT ON COLUMN public.torneo_matches.team_a_placeholder IS 'Etichetta slot A finché la squadra non è determinata dal tabellone.';
COMMENT ON COLUMN public.torneo_matches.team_b_placeholder IS 'Etichetta slot B finché la squadra non è determinata dal tabellone.';
