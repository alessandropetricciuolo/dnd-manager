-- Profilo giocatore avanzato e gamification (Hall of Fame / Classifica)
-- profiles: nickname (univoco), avatar_url (già presente in schema iniziale), is_player_public, fame_score

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS is_player_public BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fame_score INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.nickname IS 'Nome pubblico per Classifica Eroi (univoco).';
COMMENT ON COLUMN profiles.is_player_public IS 'Se true, il profilo appare nella Classifica Eroi (Hall of Fame).';
COMMENT ON COLUMN profiles.fame_score IS 'Punteggio totale gamification (somma punti achievement sbloccati).';

-- Unicità nickname (case-insensitive, trim)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_lower_key
  ON profiles (LOWER(TRIM(nickname)))
  WHERE nickname IS NOT NULL AND TRIM(nickname) <> '';

-- ============================================
-- ACHIEVEMENTS (catalogo medaglie)
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon_name TEXT NOT NULL DEFAULT 'Award',
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE achievements IS 'Catalogo achievement/trofei sbloccabili dai giocatori.';

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are readable by everyone"
  ON achievements FOR SELECT
  USING (true);

-- Solo admin può gestire il catalogo (insert/update/delete)
CREATE POLICY "Admins can manage achievements"
  ON achievements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- PLAYER_ACHIEVEMENTS (trofei sbloccati)
-- ============================================
CREATE TABLE IF NOT EXISTS player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_player_achievements_player
  ON player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_achievement
  ON player_achievements(achievement_id);

ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;

-- Chiunque può leggere (per bacheca pubblica in classifica)
CREATE POLICY "Player achievements are readable by everyone"
  ON player_achievements FOR SELECT
  USING (true);

-- Solo admin può inserire/aggiornare (sblocco badge; in futuro si potrà automatizzare)
CREATE POLICY "Admins can manage player_achievements"
  ON player_achievements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- Policy: profili in classifica leggibili da tutti
-- (per Hall of Fame: nickname, avatar_url, fame_score, is_player_public)
-- La policy "Users can view own profile" già permette di leggere il proprio.
-- Aggiungiamo policy per lettura pubblica dei profili in classifica.
-- ============================================
DROP POLICY IF EXISTS "Public player profiles for leaderboard" ON profiles;
CREATE POLICY "Public player profiles for leaderboard"
  ON profiles FOR SELECT
  USING (is_player_public = true);

-- Achievement di esempio (Battesimo del Fuoco)
INSERT INTO achievements (id, title, description, icon_name, points)
VALUES (
  'a0000001-0001-4000-8000-000000000001',
  'Battesimo del Fuoco',
  'Hai completato la tua prima sessione.',
  'Flame',
  10
)
ON CONFLICT (id) DO NOTHING;
