-- Scala long: solo Mondo → Continente → Città (niente più "regione").

-- 1) Città sotto una regione: collega il gruppo al continente (genitore della regione).
UPDATE public.maps AS child
SET parent_map_id = region.parent_map_id
FROM public.maps AS region
WHERE child.map_type = 'city'
  AND child.parent_map_id = region.id
  AND region.map_type = 'region'
  AND region.parent_map_id IS NOT NULL;

-- 2) Ex-regioni diventano città sullo stesso continente.
UPDATE public.maps
SET map_type = 'city'
WHERE map_type = 'region';

-- 3) Vincolo map_type senza 'region' (nome auto-generato può variare)
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'maps'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%map_type%'
  LIMIT 1;
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.maps DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE public.maps
  ADD CONSTRAINT maps_map_type_check
  CHECK (map_type IN ('world', 'continent', 'city', 'dungeon', 'district', 'building'));

ALTER TABLE public.maps ALTER COLUMN map_type SET DEFAULT 'city';

COMMENT ON COLUMN public.maps.parent_map_id IS
  'Per campagne long: collegamento alla mappa di scala superiore (mondo→continente→città).';

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
