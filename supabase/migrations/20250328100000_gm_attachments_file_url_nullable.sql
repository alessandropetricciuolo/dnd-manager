-- Allinea lo schema gm_attachments tra ambienti più vecchi (con file_url NOT NULL)
-- e le nuove versioni che usano file_path + signed URL calcolati lato server.
-- Rende file_url opzionale e la valorizza, se possibile, a partire da file_path.

-- Aggiunge file_url se non esiste.
ALTER TABLE gm_attachments
  ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Rimuove il vincolo NOT NULL se presente.
ALTER TABLE gm_attachments
  ALTER COLUMN file_url DROP NOT NULL;

-- Per le righe esistenti senza file_url, impostalo uguale a file_path (fallback sensato).
UPDATE gm_attachments
SET file_url = file_path
WHERE file_url IS NULL
  AND file_path IS NOT NULL;

