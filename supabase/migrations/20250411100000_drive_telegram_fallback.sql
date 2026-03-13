-- Backup e ridondanza immagini: fallback Telegram per immagini ad alta risoluzione (es. Google Drive).
-- Aggiunge una colonna telegram_fallback_id alle tabelle che usano image_url per contenuti persistenti.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS telegram_fallback_id TEXT;

ALTER TABLE campaign_characters
  ADD COLUMN IF NOT EXISTS telegram_fallback_id TEXT;

ALTER TABLE wiki_entities
  ADD COLUMN IF NOT EXISTS telegram_fallback_id TEXT;

ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS telegram_fallback_id TEXT;

ALTER TABLE gm_notes
  ADD COLUMN IF NOT EXISTS telegram_fallback_id TEXT;

ALTER TABLE avatars
  ADD COLUMN IF NOT EXISTS telegram_fallback_id TEXT;

COMMENT ON COLUMN campaigns.telegram_fallback_id IS 'file_id Telegram usato come fallback immagine se l''URL principale (image_url) fallisce.';
COMMENT ON COLUMN campaign_characters.telegram_fallback_id IS 'file_id Telegram usato come fallback immagine se l''URL principale (image_url) fallisce.';
COMMENT ON COLUMN wiki_entities.telegram_fallback_id IS 'file_id Telegram usato come fallback immagine se l''URL principale (image_url) fallisce.';
COMMENT ON COLUMN maps.telegram_fallback_id IS 'file_id Telegram usato come fallback immagine se l''URL principale (image_url) fallisce.';
COMMENT ON COLUMN gm_notes.telegram_fallback_id IS 'file_id Telegram usato come fallback immagine se l''URL principale (image_url) fallisce.';
COMMENT ON COLUMN avatars.telegram_fallback_id IS 'file_id Telegram usato come fallback immagine se l''URL principale (image_url) fallisce.';

