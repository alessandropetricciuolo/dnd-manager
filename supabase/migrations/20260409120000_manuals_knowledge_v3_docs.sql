-- manuals_knowledge: supporto ingest v3 (metadati in jsonb, nessuna colonna obbligatoria nuova).
-- Dopo aver applicato questa migration su Supabase, esegui **una tantum** prima del re-import:

-- 1) Svuota la tabella (rimuove chunk vecchi v2; gli embedding verranno rigenerati all’ingest).
--    Nota: esegui solo se nessun altro schema dipende da righe puntate a manuals_knowledge.
--
--    TRUNCATE TABLE public.manuals_knowledge RESTART IDENTITY CASCADE;
--
--    In alternativa, cancella solo i chunk vecchi:
--    DELETE FROM public.manuals_knowledge WHERE COALESCE(metadata->>'ingestion_version','') <> 'v3-structured';
--    (dopo il primo ingest v3 tutti avranno ingestion_version = v3-structured)

-- 2) Rigenera gli indici (opzionale se TRUNCATE: già puliti).
-- 3) Dall’app admin: "Elabora tutti i manuali .txt" (o file per file).

-- Indice utile per filtri / debug su versione ingest
CREATE INDEX IF NOT EXISTS manuals_knowledge_ingestion_version_idx
  ON public.manuals_knowledge ((metadata->>'ingestion_version'))
  WHERE metadata ? 'ingestion_version';

CREATE INDEX IF NOT EXISTS manuals_knowledge_chapter_idx
  ON public.manuals_knowledge ((metadata->>'chapter'))
  WHERE metadata ? 'chapter';

COMMENT ON INDEX public.manuals_knowledge_ingestion_version_idx IS
  'Filtra chunk per ingestion_version (es. v3-structured).';
