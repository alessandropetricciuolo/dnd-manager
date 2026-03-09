-- Note segrete GM sulla sessione: restituite solo a GM/Admin (gestione lato applicazione).
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS gm_private_notes TEXT;

COMMENT ON COLUMN sessions.gm_private_notes IS 'Note private del GM. Restituite solo a GM/Admin nelle query.';

-- Associazione giocatore -> gruppo (per campagne Long): chi può vedere il riassunto di quali sessioni.
ALTER TABLE campaign_members
  ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES campaign_parties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_members_party ON campaign_members(party_id);

COMMENT ON COLUMN campaign_members.party_id IS 'Gruppo del giocatore in campagne Long. Usato per visibilità riassunti sessioni (solo sessioni del proprio gruppo).';
