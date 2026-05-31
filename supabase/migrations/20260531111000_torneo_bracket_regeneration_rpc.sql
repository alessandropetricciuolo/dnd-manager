-- Rigenera il tabellone in una singola transazione Postgres.
CREATE OR REPLACE FUNCTION public.regenerate_torneo_bracket_atomic(
  p_campaign_id UUID,
  p_plan JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  slot JSONB;
  inserted_id UUID;
  inserted_ids UUID[] := ARRAY[]::UUID[];
  slot_index INTEGER := 0;
  child_index INTEGER;
  child_id UUID;
  team_a UUID;
  team_b UUID;
  slot_name TEXT;
BEGIN
  IF jsonb_typeof(p_plan) <> 'array' THEN
    RAISE EXCEPTION 'invalid bracket plan';
  END IF;

  DELETE FROM public.torneo_matches
  WHERE campaign_id = p_campaign_id;

  FOR slot IN SELECT value FROM jsonb_array_elements(p_plan)
  LOOP
    team_a := NULLIF(slot->>'teamAId', '')::UUID;
    team_b := NULLIF(slot->>'teamBId', '')::UUID;

    IF team_a IS NULL OR team_b IS NULL THEN
      RAISE EXCEPTION 'invalid team slot';
    END IF;

    INSERT INTO public.torneo_matches (
      campaign_id,
      team_a_id,
      team_b_id,
      label,
      sort_order,
      status,
      match_kind,
      bracket_round,
      bracket_slot
    )
    VALUES (
      p_campaign_id,
      team_a,
      team_b,
      NULLIF(slot->>'label', ''),
      slot_index,
      'pending',
      COALESCE(NULLIF(slot->>'matchKind', ''), 'bracket'),
      (slot->>'round')::SMALLINT,
      (slot->>'slot')::SMALLINT
    )
    RETURNING id INTO inserted_id;

    inserted_ids := array_append(inserted_ids, inserted_id);
    slot_index := slot_index + 1;
  END LOOP;

  slot_index := 0;
  FOR slot IN SELECT value FROM jsonb_array_elements(p_plan)
  LOOP
    IF slot->>'advancesToMatchIndex' IS NOT NULL AND slot->>'advancesToSlot' IS NOT NULL THEN
      child_index := (slot->>'advancesToMatchIndex')::INTEGER + 1;
      child_id := inserted_ids[child_index];
      slot_name := slot->>'advancesToSlot';

      IF child_id IS NULL OR slot_name NOT IN ('a', 'b') THEN
        RAISE EXCEPTION 'invalid advancement slot';
      END IF;

      UPDATE public.torneo_matches
      SET advances_to_match_id = child_id,
          advances_to_slot = slot_name
      WHERE id = inserted_ids[slot_index + 1]
        AND campaign_id = p_campaign_id;
    END IF;

    slot_index := slot_index + 1;
  END LOOP;

  RETURN COALESCE(array_length(inserted_ids, 1), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_torneo_bracket_atomic(UUID, JSONB) TO authenticated;
