-- Profiles: anagrafica (nome, cognome, data nascita, cellulare)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Sessions: luogo
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS location TEXT;
