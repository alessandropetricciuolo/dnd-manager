-- GM Area: note testuali e allegati (bucket privato)
-- Solo GM/Admin possono accedere (verifica anche in server actions).
-- Migration idempotente: sicura da rieseguire se le tabelle esistono già.

-- ============================================
-- GM_NOTES
-- ============================================
CREATE TABLE IF NOT EXISTS gm_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gm_notes_campaign ON gm_notes(campaign_id);

DROP TRIGGER IF EXISTS gm_notes_updated_at ON gm_notes;
CREATE TRIGGER gm_notes_updated_at
  BEFORE UPDATE ON gm_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE gm_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "GM and admin can manage gm_notes" ON gm_notes;
CREATE POLICY "GM and admin can manage gm_notes"
  ON gm_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = gm_notes.campaign_id AND c.gm_id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = gm_notes.campaign_id AND c.gm_id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- ============================================
-- GM_ATTACHMENTS (metadati file nel bucket)
-- ============================================
CREATE TABLE IF NOT EXISTS gm_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gm_attachments_campaign ON gm_attachments(campaign_id);

ALTER TABLE gm_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "GM and admin can manage gm_attachments" ON gm_attachments;
CREATE POLICY "GM and admin can manage gm_attachments"
  ON gm_attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = gm_attachments.campaign_id AND c.gm_id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = gm_attachments.campaign_id AND c.gm_id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- ============================================
-- BUCKET gm_files (privato)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('gm_files', 'gm_files', false)
ON CONFLICT (id) DO NOTHING;

-- Solo GM della campagna o admin possono caricare (path: campaign_id/xxx)
DROP POLICY IF EXISTS "GM and admin can upload to gm_files" ON storage.objects;
CREATE POLICY "GM and admin can upload to gm_files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gm_files'
    AND (
      EXISTS (
        SELECT 1 FROM campaigns c
        WHERE c.gm_id = auth.uid() AND (storage.foldername(name))[1] = c.id::text
      )
      OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    )
  );

-- Solo GM della campagna o admin possono leggere (per signed URL)
DROP POLICY IF EXISTS "GM and admin can read gm_files" ON storage.objects;
CREATE POLICY "GM and admin can read gm_files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'gm_files'
    AND (
      EXISTS (
        SELECT 1 FROM campaigns c
        WHERE c.gm_id = auth.uid() AND (storage.foldername(name))[1] = c.id::text
      )
      OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    )
  );

-- Solo GM della campagna o admin possono eliminare
DROP POLICY IF EXISTS "GM and admin can delete gm_files" ON storage.objects;
CREATE POLICY "GM and admin can delete gm_files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'gm_files'
    AND (
      EXISTS (
        SELECT 1 FROM campaigns c
        WHERE c.gm_id = auth.uid() AND (storage.foldername(name))[1] = c.id::text
      )
      OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    )
  );
