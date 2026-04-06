-- Snapshot regole PG (tratti, classe, lista incantesimi ammissibile, background PHB) per tooltip player.
ALTER TABLE public.campaign_characters
  ADD COLUMN IF NOT EXISTS race_slug text,
  ADD COLUMN IF NOT EXISTS subclass_slug text,
  ADD COLUMN IF NOT EXISTS background_slug text,
  ADD COLUMN IF NOT EXISTS rules_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.campaign_characters.race_slug IS
  'Chiave razza (catalogo chiuso), allineata al Manuale del Giocatore.';
COMMENT ON COLUMN public.campaign_characters.subclass_slug IS
  'Sottorazza / sottoclasse (catalogo), opzionale.';
COMMENT ON COLUMN public.campaign_characters.background_slug IS
  'Background PHB (catalogo); testo narrativo resta in background.';
COMMENT ON COLUMN public.campaign_characters.rules_snapshot IS
  'JSON testuale precalcolato dai manuali ingestiti; nessun RAG a runtime in scheda.';
