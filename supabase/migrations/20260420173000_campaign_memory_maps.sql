ALTER TABLE public.campaign_memory_chunks
  DROP CONSTRAINT IF EXISTS campaign_memory_chunks_source_type_check;

ALTER TABLE public.campaign_memory_chunks
  ADD CONSTRAINT campaign_memory_chunks_source_type_check
  CHECK (
    source_type IN (
      'wiki',
      'character_background',
      'session_summary',
      'session_note',
      'gm_note',
      'secret_whisper',
      'map_description'
    )
  );

COMMENT ON TABLE public.campaign_memory_chunks IS
  'Indice interrogabile della memoria narrativa delle campagne long (wiki canoniche, background PG, sessioni, note GM, whispers, descrizioni mappe).';
