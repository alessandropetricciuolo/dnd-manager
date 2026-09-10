DROP FUNCTION IF EXISTS public.match_campaign_memory_preview(uuid, vector, float, integer, text[]);
CREATE OR REPLACE FUNCTION public.match_campaign_memory_preview(
  p_campaign_id uuid, query_embedding vector(384), match_threshold float DEFAULT 0.2,
  match_count integer DEFAULT 8, allowed_source_types text[] DEFAULT NULL,
  include_admin_only boolean DEFAULT false
) RETURNS TABLE (id uuid, campaign_id uuid, source_type text, source_id uuid, chunk_index integer, title text, content text, summary text, metadata jsonb, similarity float)
LANGUAGE plpgsql VOLATILE SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM set_config('enable_indexscan', 'off', true);
  PERFORM set_config('enable_bitmapscan', 'off', true);
  RETURN QUERY SELECT cm.id, cm.campaign_id, cm.source_type, cm.source_id, cm.chunk_index, cm.title, cm.content, cm.summary, cm.metadata, 1 - (cm.embedding <=> query_embedding)
  FROM public.campaign_memory_chunks cm WHERE cm.campaign_id = p_campaign_id AND cm.embedding IS NOT NULL
    AND (include_admin_only OR NOT cm.admin_only)
    AND (allowed_source_types IS NULL OR cm.source_type = ANY (allowed_source_types))
    AND 1 - (cm.embedding <=> query_embedding) > match_threshold
  ORDER BY cm.embedding <=> query_embedding LIMIT GREATEST(match_count, 1);
END; $$;
REVOKE ALL ON FUNCTION public.match_campaign_memory_preview(uuid, vector, float, integer, text[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_campaign_memory_preview(uuid, vector, float, integer, text[], boolean) TO service_role;
