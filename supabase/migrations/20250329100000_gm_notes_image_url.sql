-- Immagine opzionale per le note GM (URL dopo upload su Telegram o link esterno).
ALTER TABLE gm_notes
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN gm_notes.image_url IS 'URL immagine (es. /api/tg-image/xxx o link esterno). Opzionale.';
