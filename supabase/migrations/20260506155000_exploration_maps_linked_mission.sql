-- Collegamento opzionale mappe FoW -> missioni (campagne long)

ALTER TABLE public.campaign_exploration_maps
  ADD COLUMN IF NOT EXISTS linked_mission_id uuid REFERENCES public.campaign_missions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS campaign_exploration_maps_linked_mission_id_idx
  ON public.campaign_exploration_maps(linked_mission_id)
  WHERE linked_mission_id IS NOT NULL;

COMMENT ON COLUMN public.campaign_exploration_maps.linked_mission_id IS
  'Missione long di riferimento per organizzare le mappe FoW nella regia GM.';
