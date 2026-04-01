-- Hardening RAG manuals_knowledge:
-- - hash contenuto per dedup robusto
-- - indici utili a debug / retrieval fallback

ALTER TABLE public.manuals_knowledge
  ADD COLUMN IF NOT EXISTS content_hash text;

UPDATE public.manuals_knowledge
SET content_hash = md5(content)
WHERE content_hash IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS manuals_knowledge_content_hash_uq
  ON public.manuals_knowledge (content_hash);

CREATE INDEX IF NOT EXISTS manuals_knowledge_source_idx
  ON public.manuals_knowledge ((metadata->>'source'));

