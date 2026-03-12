-- Gamification: achievement incrementali, progressi giocatore, catalogo avatar
-- (completa 20250404100000_profiles_gamification_and_achievements)

-- ============================================
-- ACHIEVEMENTS: colonne per achievement incrementali
-- ============================================
ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS is_incremental BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_progress INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN achievements.is_incremental IS 'Se true, il giocatore deve raggiungere max_progress per sbloccare.';
COMMENT ON COLUMN achievements.max_progress IS 'Target progressi per sblocco (usato se is_incremental = true).';

-- ============================================
-- PLAYER_ACHIEVEMENTS: progresso e flag sblocco
-- ============================================
ALTER TABLE player_achievements
  ADD COLUMN IF NOT EXISTS current_progress INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE player_achievements
  ALTER COLUMN unlocked_at DROP NOT NULL;

COMMENT ON COLUMN player_achievements.current_progress IS 'Progresso corrente (0 .. achievement.max_progress).';
COMMENT ON COLUMN player_achievements.is_unlocked IS 'True quando current_progress >= achievement.max_progress (o sblocco manuale).';
COMMENT ON COLUMN player_achievements.unlocked_at IS 'Data/ora sblocco; NULL se non ancora sbloccato.';

-- Retrocompat: righe esistenti (solo unlocked_at valorizzato) = considerate sbloccate
UPDATE player_achievements
SET is_unlocked = true, current_progress = 1
WHERE is_unlocked = false AND unlocked_at IS NOT NULL;

-- ============================================
-- AVATARS (catalogo avatar sbloccabili)
-- ============================================
CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  required_achievement_id UUID REFERENCES achievements(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE avatars IS 'Catalogo avatar (gallery) sbloccabili dai giocatori tramite achievement o default.';
COMMENT ON COLUMN avatars.is_default IS 'Se true, tutti i giocatori lo hanno da subito.';
COMMENT ON COLUMN avatars.required_achievement_id IS 'Achievement che sblocca questo avatar; NULL se is_default o sblocco manuale.';

ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avatars are readable by everyone"
  ON avatars FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage avatars"
  ON avatars FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- Bucket per gallery avatar (admin upload)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars_gallery',
  'avatars_gallery',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Solo admin può caricare in avatars_gallery (path: avatars/{user_id}/*)
CREATE POLICY "Admins can upload to avatars_gallery"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars_gallery'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "avatars_gallery publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars_gallery');

CREATE POLICY "Admins can update avatars_gallery"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars_gallery'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete from avatars_gallery"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars_gallery'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
