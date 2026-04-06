-- Indice per DELETE/SELECT mirati su metadata.file_name (più manuali nella stessa tabella).
CREATE INDEX IF NOT EXISTS manuals_knowledge_metadata_file_name_idx
  ON public.manuals_knowledge ((metadata->>'file_name'));

COMMENT ON INDEX public.manuals_knowledge_metadata_file_name_idx IS
  'Accelerare rimozione o filtri per file sorgente (es. un solo manuale senza TRUNCATE).';
