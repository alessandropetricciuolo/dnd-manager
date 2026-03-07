-- Visibilità selettiva: tabella permessi per mappe/wiki e colonna visibility
-- entity_permissions: quale giocatore può vedere quale entità (visibility = 'selective')

CREATE TABLE entity_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('map', 'wiki')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, user_id, entity_type, entity_id)
);

CREATE INDEX idx_entity_permissions_lookup
  ON entity_permissions(campaign_id, entity_type, entity_id);
CREATE INDEX idx_entity_permissions_user
  ON entity_permissions(user_id, entity_type);

ALTER TABLE entity_permissions ENABLE ROW LEVEL SECURITY;

-- GM della campagna può inserire/aggiornare/eliminare
CREATE POLICY "GM can manage entity_permissions"
  ON entity_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = entity_permissions.campaign_id
        AND (c.gm_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = entity_permissions.campaign_id
        AND (c.gm_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

-- L'utente può leggere solo le righe che lo riguardano (per sapere cosa può vedere)
CREATE POLICY "Users can read own entity_permissions"
  ON entity_permissions FOR SELECT
  USING (user_id = auth.uid());

-- Aggiungi visibility a maps (public | secret | selective)
ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'maps' AND column_name = 'is_secret') THEN
    UPDATE maps SET visibility = 'secret' WHERE is_secret = true;
  END IF;
END $$;
UPDATE maps SET visibility = COALESCE(visibility, 'public') WHERE visibility IS NULL;
ALTER TABLE maps ALTER COLUMN visibility SET NOT NULL;
DO $$ BEGIN ALTER TABLE maps ADD CONSTRAINT maps_visibility_check CHECK (visibility IN ('public', 'secret', 'selective')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Aggiungi visibility a wiki_entities
ALTER TABLE wiki_entities
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wiki_entities' AND column_name = 'is_secret') THEN
    UPDATE wiki_entities SET visibility = 'secret' WHERE is_secret = true;
  END IF;
END $$;
UPDATE wiki_entities SET visibility = COALESCE(visibility, 'public') WHERE visibility IS NULL;
ALTER TABLE wiki_entities ALTER COLUMN visibility SET NOT NULL;
DO $$ BEGIN ALTER TABLE wiki_entities ADD CONSTRAINT wiki_entities_visibility_check CHECK (visibility IN ('public', 'secret', 'selective')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
