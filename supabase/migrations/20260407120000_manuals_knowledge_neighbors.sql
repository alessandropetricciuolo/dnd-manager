-- Finestra di chunk adiacenti (stesso file) per ricostruire testi lunghi (es. incantesimi) dopo hit semantic search.

CREATE OR REPLACE FUNCTION public.manuals_knowledge_neighbors(
  p_file_name text,
  p_center_index integer,
  p_radius integer DEFAULT 2
)
RETURNS TABLE (
  content text,
  chunk_index integer,
  metadata jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mk.content,
    (mk.metadata->>'chunk_index')::integer AS chunk_index,
    mk.metadata
  FROM public.manuals_knowledge mk
  WHERE (mk.metadata->>'file_name') = p_file_name
    AND mk.metadata ? 'chunk_index'
    AND (mk.metadata->>'chunk_index') ~ '^-?[0-9]+$'
    AND (mk.metadata->>'chunk_index')::integer BETWEEN (p_center_index - p_radius) AND (p_center_index + p_radius)
  ORDER BY (mk.metadata->>'chunk_index')::integer ASC;
$$;

COMMENT ON FUNCTION public.manuals_knowledge_neighbors IS
  'Restituisce chunk consecutivi dello stesso manuale per espandere un risultato RAG (es. descrizione incantesimo completa).';

REVOKE ALL ON FUNCTION public.manuals_knowledge_neighbors(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manuals_knowledge_neighbors(text, integer, integer) TO service_role;
