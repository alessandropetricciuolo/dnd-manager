-- Collegamento opzionale voci wiki → missioni (campagne lunghe): filtri GM screen e ordinamento wiki.

ALTER TABLE public.wiki_entities
  ADD COLUMN IF NOT EXISTS linked_mission_id uuid REFERENCES public.campaign_missions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS wiki_entities_linked_mission_id_idx
  ON public.wiki_entities(linked_mission_id)
  WHERE linked_mission_id IS NOT NULL;

COMMENT ON COLUMN public.wiki_entities.linked_mission_id IS 'Missione Long di riferimento (asset/regia GM, ordinamento wiki).';
