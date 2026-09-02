-- La preview AI cerca sempre entro una sola campagna, tipicamente poche
-- centinaia di chunk. Lo scan esatto evita i falsi negativi dell'indice
-- IVFFlat globale quando i candidati ANN vengono filtrati per campaign_id.
CREATE OR REPLACE FUNCTION public.match_campaign_memory_preview(
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
LANGUAGE plpgsql
VOLATILE
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Impedisce al planner di usare l'indice ANN globale per questa query
  -- filtrata; il risultato resta esatto nel perimetro della campagna.
  PERFORM set_config('enable_indexscan', 'off', true);
  PERFORM set_config('enable_bitmapscan', 'off', true);

  RETURN QUERY
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
END;
$$;

REVOKE ALL ON FUNCTION public.match_campaign_memory_preview(uuid, vector, float, integer, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_campaign_memory_preview(uuid, vector, float, integer, text[]) TO service_role;

COMMENT ON FUNCTION public.match_campaign_memory_preview(uuid, vector, float, integer, text[]) IS
  'Ricerca esatta nei chunk di una singola campagna per la preview AI; evita falsi negativi dell indice IVFFlat globale dopo il filtro campaign_id.';
