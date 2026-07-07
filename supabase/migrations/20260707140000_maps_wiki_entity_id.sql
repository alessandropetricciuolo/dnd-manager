-- Collegamento 1:1 tra mappa interattiva e scheda wiki «luogo».
ALTER TABLE public.maps
  ADD COLUMN IF NOT EXISTS wiki_entity_id UUID REFERENCES public.wiki_entities(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS maps_wiki_entity_id_unique
  ON public.maps(wiki_entity_id)
  WHERE wiki_entity_id IS NOT NULL;

COMMENT ON COLUMN public.maps.wiki_entity_id IS
  'Scheda wiki luogo associata: stesso concetto narrativo, mappa interattiva + lore wiki.';
