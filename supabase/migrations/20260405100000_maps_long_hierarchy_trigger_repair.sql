-- Ripristina la validazione città→continente se la migration precedente è stata applicata
-- con la funzione ancora vecchia (gli UPDATE fallivano con "collegata a una regione").
-- Idempotente: solo sostituisce maps_validate_long_parent_hierarchy.

CREATE OR REPLACE FUNCTION public.maps_validate_long_parent_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  c_type text;
  p_type text;
  p_campaign uuid;
BEGIN
  SELECT type::text INTO c_type FROM public.campaigns WHERE id = NEW.campaign_id;

  IF c_type IS DISTINCT FROM 'long' THEN
    IF NEW.parent_map_id IS NOT NULL THEN
      RAISE EXCEPTION 'La mappa genitore è disponibile solo per campagne di tipo lunga.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.map_type = 'world' THEN
    IF NEW.parent_map_id IS NOT NULL THEN
      RAISE EXCEPTION 'La mappa del mondo non può avere un genitore.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.map_type IN ('continent', 'city') AND NEW.parent_map_id IS NULL THEN
    RAISE EXCEPTION 'Per campagne lunghe, % richiede una mappa genitore.', NEW.map_type;
  END IF;

  IF NEW.parent_map_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_map_id = NEW.id THEN
    RAISE EXCEPTION 'Una mappa non può essere genitore di se stessa.';
  END IF;

  SELECT map_type, campaign_id INTO p_type, p_campaign
  FROM public.maps
  WHERE id = NEW.parent_map_id;

  IF p_type IS NULL OR p_campaign IS NULL OR p_campaign <> NEW.campaign_id THEN
    RAISE EXCEPTION 'La mappa genitore deve esistere e appartenere alla stessa campagna.';
  END IF;

  IF NEW.map_type = 'continent' AND p_type <> 'world' THEN
    RAISE EXCEPTION 'Un continente deve essere collegato alla mappa del mondo.';
  END IF;
  IF NEW.map_type = 'city' AND p_type <> 'continent' THEN
    RAISE EXCEPTION 'Una città deve essere collegata a un continente.';
  END IF;

  RETURN NEW;
END;
$$;
