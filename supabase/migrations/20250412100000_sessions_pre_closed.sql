-- Flag per sessioni salvate in bozza dal GM Screen (pre-chiusura).
-- Presenze e XP sono stati registrati, ma il debrief narrativo non è ancora completo.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS is_pre_closed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN sessions.is_pre_closed IS
  'Sessione salvata in bozza dal GM Screen: presenze/XP registrati, debrief da completare.';

