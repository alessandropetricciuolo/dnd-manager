-- Dati specifici per tipo (JSONB) e ordine per Lore (capitoli)
ALTER TABLE wiki_entities
  ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}';

ALTER TABLE wiki_entities
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;
