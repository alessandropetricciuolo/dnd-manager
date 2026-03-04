-- Aggiunge la colonna file_path a gm_attachments se manca (errore 42703).
-- Necessaria per listGmAttachments e signed URL.

ALTER TABLE gm_attachments
  ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Per righe esistenti senza file_path, imposta un path plausibile (campaign_id/file_name)
UPDATE gm_attachments
SET file_path = campaign_id::text || '/' || file_name
WHERE file_path IS NULL;
