-- wiki_relationships: supporto bersaglio Mappa (oltre a voce Wiki)
-- source_id = sempre voce Wiki; target = O target_id (Wiki) O target_map_id (Mappa)

ALTER TABLE wiki_relationships
  ADD COLUMN IF NOT EXISTS target_map_id UUID REFERENCES maps(id) ON DELETE CASCADE;

-- Rendi target_id nullable (uno dei due target deve essere valorizzato)
ALTER TABLE wiki_relationships
  ALTER COLUMN target_id DROP NOT NULL;

-- Rimuovi vincoli obsoleti
ALTER TABLE wiki_relationships
  DROP CONSTRAINT IF EXISTS wiki_relationships_no_self;

ALTER TABLE wiki_relationships
  DROP CONSTRAINT IF EXISTS wiki_relationships_unique;

-- Esattamente uno tra target_id e target_map_id deve essere valorizzato
ALTER TABLE wiki_relationships
  ADD CONSTRAINT wiki_relationships_target_xor CHECK (
    (target_id IS NOT NULL AND target_map_id IS NULL)
    OR (target_id IS NULL AND target_map_id IS NOT NULL)
  );

-- Indice per lookup per mappa
CREATE INDEX IF NOT EXISTS idx_wiki_relationships_target_map
  ON wiki_relationships(target_map_id);

-- Unicità: (campaign, source, target_id, label) quando target_id valorizzato
CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_relationships_unique_wiki
  ON wiki_relationships(campaign_id, source_id, target_id, label)
  WHERE target_id IS NOT NULL;

-- Unicità: (campaign, source, target_map_id, label) quando target_map_id valorizzato
CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_relationships_unique_map
  ON wiki_relationships(campaign_id, source_id, target_map_id, label)
  WHERE target_map_id IS NOT NULL;

-- Migra eventuali righe esistenti: target_id già valorizzato, target_map_id resta NULL
-- (nessuna azione necessaria)
