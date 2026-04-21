CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.campaign_memory_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (
    source_type IN (
      'wiki',
      'character_background',
      'session_summary',
      'session_note',
      'gm_note',
      'secret_whisper'
    )
  ),
  source_id uuid NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0 CHECK (chunk_index >= 0),
  title text NOT NULL DEFAULT '',
  content text NOT NULL,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(384),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_memory_chunks ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_memory_chunks_source_chunk_uq
  ON public.campaign_memory_chunks (campaign_id, source_type, source_id, chunk_index);

CREATE INDEX IF NOT EXISTS campaign_memory_chunks_campaign_idx
  ON public.campaign_memory_chunks (campaign_id, source_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS campaign_memory_chunks_metadata_gin_idx
  ON public.campaign_memory_chunks
  USING gin (metadata);

CREATE INDEX IF NOT EXISTS campaign_memory_chunks_embedding_idx
  ON public.campaign_memory_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

DROP TRIGGER IF EXISTS set_campaign_memory_chunks_updated_at ON public.campaign_memory_chunks;
CREATE TRIGGER set_campaign_memory_chunks_updated_at
  BEFORE UPDATE ON public.campaign_memory_chunks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.match_campaign_memory(
  p_campaign_id uuid,
  query_embedding vector(384),
  match_threshold float DEFAULT 0.2,
  match_count integer DEFAULT 8,
  allowed_source_types text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  campaign_id uuid,
  source_type text,
  source_id uuid,
  chunk_index integer,
  title text,
  content text,
  summary text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    cm.id,
    cm.campaign_id,
    cm.source_type,
    cm.source_id,
    cm.chunk_index,
    cm.title,
    cm.content,
    cm.summary,
    cm.metadata,
    1 - (cm.embedding <=> query_embedding) AS similarity
  FROM public.campaign_memory_chunks cm
  WHERE cm.campaign_id = p_campaign_id
    AND cm.embedding IS NOT NULL
    AND (
      allowed_source_types IS NULL
      OR cm.source_type = ANY (allowed_source_types)
    )
    AND 1 - (cm.embedding <=> query_embedding) > match_threshold
  ORDER BY cm.embedding <=> query_embedding
  LIMIT GREATEST(match_count, 1);
$$;

COMMENT ON TABLE public.campaign_memory_chunks IS
  'Indice interrogabile della memoria narrativa delle campagne long (wiki canoniche, background PG, sessioni, note GM, whispers).';

COMMENT ON FUNCTION public.match_campaign_memory(uuid, vector, float, integer, text[]) IS
  'Ricerca semantica nei chunk di memoria di una campagna tramite pgvector.';

REVOKE ALL ON public.campaign_memory_chunks FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_campaign_memory(uuid, vector, float, integer, text[]) FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_memory_chunks TO service_role;
GRANT EXECUTE ON FUNCTION public.match_campaign_memory(uuid, vector, float, integer, text[]) TO service_role;
