-- Counter presenze sessioni per gamification (quest/oneshot) + achievement incrementale

-- ============================================
-- PROFILES: counter sessioni a cui il giocatore ha partecipato (presenza confermata)
-- ============================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sessions_attended_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.sessions_attended_count IS 'Numero di sessioni in cui la presenza del giocatore è stata confermata (attended). Usato per achievement incrementali.';

-- ============================================
-- Achievement incrementale: "Partecipa a N sessioni"
-- ============================================
INSERT INTO achievements (id, title, description, icon_name, points, is_incremental, max_progress)
VALUES (
  'b0000002-0002-4000-8000-000000000002',
  'Veterano del Tavolo',
  'Partecipa a 10 sessioni con presenza confermata.',
  'Users',
  25,
  true,
  10
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  points = EXCLUDED.points,
  is_incremental = EXCLUDED.is_incremental,
  max_progress = EXCLUDED.max_progress;
