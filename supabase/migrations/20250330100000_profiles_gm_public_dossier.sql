-- Profilo pubblico GM: username, bio, portrait, visibilità e statistiche
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS portrait_url TEXT,
  ADD COLUMN IF NOT EXISTS is_gm_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stat_combat INTEGER NOT NULL DEFAULT 50 CHECK (stat_combat >= 0 AND stat_combat <= 100),
  ADD COLUMN IF NOT EXISTS stat_roleplay INTEGER NOT NULL DEFAULT 50 CHECK (stat_roleplay >= 0 AND stat_roleplay <= 100),
  ADD COLUMN IF NOT EXISTS stat_lethality TEXT NOT NULL DEFAULT 'Media' CHECK (stat_lethality IN ('Bassa', 'Media', 'Alta', 'Implacabile'));

-- Indice per lookup pubblico per username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON profiles (LOWER(TRIM(username))) WHERE username IS NOT NULL AND TRIM(username) <> '';

-- Policy: chiunque può leggere i profili con is_gm_public = true (per pagina pubblica e albo)
CREATE POLICY "Public GM profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (is_gm_public = true);

-- Storage bucket per ritratti GM (portrait)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portraits',
  'portraits',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policy: utenti autenticati possono caricare il proprio ritratto (path = {user_id}/portrait.*)
CREATE POLICY "Users can upload own portrait"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portraits'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: chiunque può leggere i file in portraits (bucket pubblico)
CREATE POLICY "Portraits are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portraits');

-- Policy: utenti possono aggiornare/eliminare il proprio ritratto
CREATE POLICY "Users can update own portrait"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'portraits'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own portrait"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portraits'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
