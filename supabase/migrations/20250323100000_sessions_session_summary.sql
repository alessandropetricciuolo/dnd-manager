-- Riassunto narrativo (debriefing) salvato alla chiusura sessione dal GM Screen.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS session_summary TEXT;

COMMENT ON COLUMN sessions.session_summary IS 'Riassunto narrativo della sessione compilato dal GM in chiusura (debriefing).';
