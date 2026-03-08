-- Aggiunge session_id a gm_notes: NULL = nota globale (pinned), altrimenti nota di sessione.
ALTER TABLE gm_notes
  ADD COLUMN IF NOT EXISTS session_id UUID NULL REFERENCES sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gm_notes_campaign_session ON gm_notes(campaign_id, session_id);

COMMENT ON COLUMN gm_notes.session_id IS 'NULL = nota globale visibile ovunque; valorizzato = nota della sessione indicata.';
