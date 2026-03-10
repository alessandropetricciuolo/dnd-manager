-- XP D&D 5e: base per PE dei mostri e progressione PG.

-- Mostri (wiki_entities): valore PE per singolo mostro.
ALTER TABLE wiki_entities
  ADD COLUMN IF NOT EXISTS xp_value INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN wiki_entities.xp_value IS 'Punti Esperienza (PE) assegnati quando il mostro viene sconfitto.';

-- Personaggi di campagna: XP correnti e livello (1-20).
ALTER TABLE campaign_characters
  ADD COLUMN IF NOT EXISTS current_xp INTEGER NOT NULL DEFAULT 0;

ALTER TABLE campaign_characters
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN campaign_characters.current_xp IS 'Punti Esperienza (PE) correnti del personaggio.';
COMMENT ON COLUMN campaign_characters.level IS 'Livello attuale del personaggio (1-20).';

