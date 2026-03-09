-- XP guadagnati per membro campagna (accumulato per sessione chiusa).
ALTER TABLE campaign_members
  ADD COLUMN IF NOT EXISTS xp_earned INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN campaign_members.xp_earned IS 'XP totali guadagnati dal giocatore in questa campagna (incrementato a ogni chiusura sessione per i presenti).';

-- Consenti 'missing' in global_status (campagne Long).
ALTER TABLE wiki_entities
  DROP CONSTRAINT IF EXISTS wiki_entities_global_status_check;

ALTER TABLE wiki_entities
  ADD CONSTRAINT wiki_entities_global_status_check
  CHECK (global_status IN ('alive', 'dead', 'missing'));
