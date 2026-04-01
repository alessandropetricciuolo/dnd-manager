-- Memoria IA evolutiva (solo campagne long): il GM sceglie quali voci wiki entrano nel contesto delle generazioni.

ALTER TABLE public.wiki_entities
  ADD COLUMN IF NOT EXISTS include_in_campaign_ai_memory boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.wiki_entities.include_in_campaign_ai_memory IS
  'Campagne long: se true, titolo+contenuto della voce sono inclusi nel prompt IA per nuove generazioni wiki (canon selezionato dal GM).';
