-- Personaggi (PG) di campagna: scheda tecnica PDF privata, avatar pubblico, assegnazione player.
-- GM/Admin vedono tutto e signed URL per PDF; Player vede solo il proprio PG senza link al PDF.

-- ============================================
-- CAMPAIGN_CHARACTERS
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  sheet_file_path TEXT,
  background TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_characters_campaign ON campaign_characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_characters_assigned ON campaign_characters(assigned_to);

DROP TRIGGER IF EXISTS campaign_characters_updated_at ON campaign_characters;
CREATE TRIGGER campaign_characters_updated_at
  BEFORE UPDATE ON campaign_characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE campaign_characters ENABLE ROW LEVEL SECURITY;

-- GM della campagna e Admin: SELECT/INSERT/UPDATE/DELETE
CREATE POLICY "GM and admin can manage campaign_characters"
  ON campaign_characters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_characters.campaign_id AND c.gm_id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_characters.campaign_id AND c.gm_id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Player: può vedere solo il personaggio assegnato a sé (assigned_to = auth.uid())
CREATE POLICY "Players can view own assigned character"
  ON campaign_characters FOR SELECT
  USING (assigned_to = auth.uid());

-- ============================================
-- BUCKET character_sheets (privato, PDF)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('character_sheets', 'character_sheets', false)
ON CONFLICT (id) DO NOTHING;

-- GM della campagna o admin possono caricare (path: campaign_id/xxx.pdf)
DROP POLICY IF EXISTS "GM and admin can upload character_sheets" ON storage.objects;
CREATE POLICY "GM and admin can upload character_sheets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'character_sheets'
    AND (
      EXISTS (
        SELECT 1 FROM campaigns c
        WHERE c.gm_id = auth.uid() AND (storage.foldername(name))[1] = c.id::text
      )
      OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    )
  );

-- GM della campagna o admin possono leggere (per signed URL)
DROP POLICY IF EXISTS "GM and admin can read character_sheets" ON storage.objects;
CREATE POLICY "GM and admin can read character_sheets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'character_sheets'
    AND (
      EXISTS (
        SELECT 1 FROM campaigns c
        WHERE c.gm_id = auth.uid() AND (storage.foldername(name))[1] = c.id::text
      )
      OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    )
  );

-- GM della campagna o admin possono eliminare
DROP POLICY IF EXISTS "GM and admin can delete character_sheets" ON storage.objects;
CREATE POLICY "GM and admin can delete character_sheets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'character_sheets'
    AND (
      EXISTS (
        SELECT 1 FROM campaigns c
        WHERE c.gm_id = auth.uid() AND (storage.foldername(name))[1] = c.id::text
      )
      OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    )
  );
