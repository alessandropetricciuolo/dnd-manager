-- Torneo 2.0: tabellone (bracket) a eliminazione con avanzamento automatico.
-- Ogni incontro puo' appartenere a un round del bracket e indicare in quale
-- incontro successivo (e in quale slot a/b) avanza la squadra vincente.

ALTER TABLE public.torneo2_matches
  ADD COLUMN IF NOT EXISTS bracket_round INTEGER,
  ADD COLUMN IF NOT EXISTS bracket_position INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_label TEXT,
  ADD COLUMN IF NOT EXISTS feeds_match_id UUID REFERENCES public.torneo2_matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS feeds_slot TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'torneo2_matches_feeds_slot_check'
  ) THEN
    ALTER TABLE public.torneo2_matches
      ADD CONSTRAINT torneo2_matches_feeds_slot_check
      CHECK (feeds_slot IS NULL OR feeds_slot IN ('a', 'b'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_torneo2_matches_bracket
  ON public.torneo2_matches(campaign_id, bracket_round, bracket_position);

COMMENT ON COLUMN public.torneo2_matches.bracket_round IS 'Indice round del tabellone (0 = primo turno). NULL = fuori dal bracket.';
COMMENT ON COLUMN public.torneo2_matches.feeds_match_id IS 'Incontro successivo in cui avanza la squadra vincente.';
COMMENT ON COLUMN public.torneo2_matches.feeds_slot IS 'Slot a/b riempito dal vincitore; NULL se il target e'' un triello/FFA (si espandono i membri della squadra).';
