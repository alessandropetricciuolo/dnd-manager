-- ============================================
-- CAMPAIGN_PARTIES (Gruppi per campagne Long / West Marches)
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_parties_campaign ON campaign_parties(campaign_id);

DROP TRIGGER IF EXISTS campaign_parties_updated_at ON campaign_parties;
CREATE TRIGGER campaign_parties_updated_at
  BEFORE UPDATE ON campaign_parties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE campaign_parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Campaign parties visible to campaign GM and members" ON campaign_parties;
CREATE POLICY "Campaign parties visible to campaign GM and members"
  ON campaign_parties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_parties.campaign_id
      AND (c.gm_id = auth.uid() OR c.is_public OR EXISTS (
        SELECT 1 FROM campaign_members cm
        WHERE cm.campaign_id = c.id AND cm.player_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "GM can manage campaign parties" ON campaign_parties;
CREATE POLICY "GM can manage campaign parties"
  ON campaign_parties FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_parties.campaign_id AND c.gm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_parties.campaign_id AND c.gm_id = auth.uid()
    )
  );

-- ============================================
-- WIKI_ENTITIES: is_core e global_status (stato vita/morte condiviso in campagne Long)
-- ============================================
ALTER TABLE wiki_entities
  ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE wiki_entities
  ADD COLUMN IF NOT EXISTS global_status TEXT NOT NULL DEFAULT 'alive';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wiki_entities_global_status_check'
  ) THEN
    ALTER TABLE wiki_entities
      ADD CONSTRAINT wiki_entities_global_status_check
      CHECK (global_status IN ('alive', 'dead'));
  END IF;
END $$;

COMMENT ON COLUMN wiki_entities.is_core IS 'Se true (solo campagne Long), lo stato di vita/morte è condiviso globalmente nella campagna.';
COMMENT ON COLUMN wiki_entities.global_status IS 'Stato globale: alive | dead. Usato solo se is_core = true e campagna type = long.';

-- ============================================
-- SESSIONS: party_id e chapter_title
-- ============================================
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES campaign_parties(id) ON DELETE SET NULL;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS chapter_title TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_party ON sessions(party_id);

COMMENT ON COLUMN sessions.party_id IS 'Gruppo assegnato alla sessione. Usato solo per campagne type = long.';
COMMENT ON COLUMN sessions.chapter_title IS 'Titolo capitolo per raggruppare sessioni.';
