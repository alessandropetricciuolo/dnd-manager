-- Aggiunge mime_type (e file_size) a gm_attachments se mancano (errore column does not exist).
-- Utile se la tabella è stata creata da uno schema precedente senza queste colonne.

ALTER TABLE gm_attachments
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

ALTER TABLE gm_attachments
  ADD COLUMN IF NOT EXISTS file_size BIGINT;
