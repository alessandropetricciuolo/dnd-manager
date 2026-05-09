-- Keep optional FoW map mission links inside the same campaign.

CREATE OR REPLACE FUNCTION public.validate_exploration_map_mission_campaign()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.linked_mission_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.campaign_missions mission
    WHERE mission.id = NEW.linked_mission_id
      AND mission.campaign_id = NEW.campaign_id
  ) THEN
    RAISE EXCEPTION 'Exploration map mission link must belong to the same campaign';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_exploration_map_mission_campaign
  ON public.campaign_exploration_maps;

CREATE TRIGGER validate_exploration_map_mission_campaign
  BEFORE INSERT OR UPDATE OF campaign_id, linked_mission_id
  ON public.campaign_exploration_maps
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_exploration_map_mission_campaign();
