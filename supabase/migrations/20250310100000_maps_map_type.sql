-- Categorie geografiche per le mappe
ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS map_type TEXT NOT NULL DEFAULT 'region'
  CHECK (map_type IN ('world', 'continent', 'region', 'city', 'dungeon', 'district', 'building'));
