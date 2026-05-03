-- Apply long-campaign economy changes in one database transaction.
--
-- The application calls this through the service-role client after checking the
-- current user is a GM/Admin. Execute is withheld from public/authenticated roles
-- so clients cannot bypass server-side authorization by calling the RPC directly.

CREATE OR REPLACE FUNCTION public.apply_campaign_economy_atomic(
  p_campaign_id uuid,
  p_mission_id uuid DEFAULT NULL,
  p_allocations jsonb DEFAULT '[]'::jsonb,
  p_deltas jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_character_id uuid;
  v_add_gp integer;
  v_add_sp integer;
  v_add_cp integer;
  v_delta_gp integer;
  v_delta_sp integer;
  v_delta_cp integer;
  v_sum_gp integer := 0;
  v_sum_sp integer := 0;
  v_sum_cp integer := 0;
  v_rows integer;
  v_mission record;
  v_character_ids uuid[] := ARRAY[]::uuid[];
  v_balances jsonb := '{}'::jsonb;
BEGIN
  p_allocations := COALESCE(p_allocations, '[]'::jsonb);
  p_deltas := COALESCE(p_deltas, '[]'::jsonb);

  IF jsonb_typeof(p_allocations) <> 'array' THEN
    RAISE EXCEPTION 'Allocazioni tesoretto non valide.';
  END IF;

  IF jsonb_typeof(p_deltas) <> 'array' THEN
    RAISE EXCEPTION 'Variazioni monete non valide.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id = p_campaign_id AND type = 'long'
  ) THEN
    RAISE EXCEPTION 'Economia disponibile solo per campagne lunghe.';
  END IF;

  IF p_mission_id IS NOT NULL THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_allocations)
    LOOP
      IF v_item->>'characterId' IS NULL THEN
        RAISE EXCEPTION 'Personaggio non trovato per la distribuzione.';
      END IF;
      v_add_gp := GREATEST(0, COALESCE(FLOOR((v_item->>'coins_gp')::numeric), 0))::integer;
      v_add_sp := GREATEST(0, COALESCE(FLOOR((v_item->>'coins_sp')::numeric), 0))::integer;
      v_add_cp := GREATEST(0, COALESCE(FLOOR((v_item->>'coins_cp')::numeric), 0))::integer;
      v_sum_gp := v_sum_gp + v_add_gp;
      v_sum_sp := v_sum_sp + v_add_sp;
      v_sum_cp := v_sum_cp + v_add_cp;
    END LOOP;

    IF v_sum_gp > 0 OR v_sum_sp > 0 OR v_sum_cp > 0 THEN
      SELECT id, campaign_id, status, treasure_gp, treasure_sp, treasure_cp
      INTO v_mission
      FROM public.campaign_missions
      WHERE id = p_mission_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Missione tesoretto non trovata.';
      END IF;

      IF v_mission.campaign_id <> p_campaign_id THEN
        RAISE EXCEPTION 'Missione non appartenente alla campagna.';
      END IF;

      IF v_mission.status <> 'completed' THEN
        RAISE EXCEPTION 'La missione non è completata: non puoi prelevare dal tesoretto.';
      END IF;

      IF v_sum_gp > v_mission.treasure_gp
        OR v_sum_sp > v_mission.treasure_sp
        OR v_sum_cp > v_mission.treasure_cp
      THEN
        RAISE EXCEPTION 'Tesoretto insufficiente per la distribuzione indicata (oro/argento/rame).';
      END IF;

      UPDATE public.campaign_missions
      SET
        treasure_gp = treasure_gp - v_sum_gp,
        treasure_sp = treasure_sp - v_sum_sp,
        treasure_cp = treasure_cp - v_sum_cp,
        updated_at = now()
      WHERE id = p_mission_id;

      FOR v_item IN SELECT value FROM jsonb_array_elements(p_allocations)
      LOOP
        IF v_item->>'characterId' IS NULL THEN
          RAISE EXCEPTION 'Personaggio non trovato per la distribuzione.';
        END IF;
        v_character_id := (v_item->>'characterId')::uuid;
        v_add_gp := GREATEST(0, COALESCE(FLOOR((v_item->>'coins_gp')::numeric), 0))::integer;
        v_add_sp := GREATEST(0, COALESCE(FLOOR((v_item->>'coins_sp')::numeric), 0))::integer;
        v_add_cp := GREATEST(0, COALESCE(FLOOR((v_item->>'coins_cp')::numeric), 0))::integer;

        IF v_add_gp = 0 AND v_add_sp = 0 AND v_add_cp = 0 THEN
          CONTINUE;
        END IF;

        v_character_ids := array_append(v_character_ids, v_character_id);

        UPDATE public.campaign_characters
        SET
          coins_gp = coins_gp + v_add_gp,
          coins_sp = coins_sp + v_add_sp,
          coins_cp = coins_cp + v_add_cp
        WHERE id = v_character_id
          AND campaign_id = p_campaign_id;

        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 1 THEN
          RAISE EXCEPTION 'Personaggio non trovato per la distribuzione.';
        END IF;
      END LOOP;
    END IF;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_deltas)
  LOOP
    IF v_item->>'characterId' IS NULL THEN
      RAISE EXCEPTION 'Saldo monete insufficiente o personaggio non trovato per la variazione.';
    END IF;
    v_character_id := (v_item->>'characterId')::uuid;
    v_delta_gp := COALESCE(TRUNC((v_item->>'coins_gp')::numeric), 0)::integer;
    v_delta_sp := COALESCE(TRUNC((v_item->>'coins_sp')::numeric), 0)::integer;
    v_delta_cp := COALESCE(TRUNC((v_item->>'coins_cp')::numeric), 0)::integer;

    IF v_delta_gp = 0 AND v_delta_sp = 0 AND v_delta_cp = 0 THEN
      CONTINUE;
    END IF;

    v_character_ids := array_append(v_character_ids, v_character_id);

    UPDATE public.campaign_characters
    SET
      coins_gp = coins_gp + v_delta_gp,
      coins_sp = coins_sp + v_delta_sp,
      coins_cp = coins_cp + v_delta_cp
    WHERE id = v_character_id
      AND campaign_id = p_campaign_id
      AND coins_gp + v_delta_gp >= 0
      AND coins_sp + v_delta_sp >= 0
      AND coins_cp + v_delta_cp >= 0;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
      RAISE EXCEPTION 'Saldo monete insufficiente o personaggio non trovato per la variazione.';
    END IF;
  END LOOP;

  IF cardinality(v_character_ids) > 0 THEN
    SELECT COALESCE(
      jsonb_object_agg(
        id::text,
        jsonb_build_object(
          'coins_gp', coins_gp,
          'coins_sp', coins_sp,
          'coins_cp', coins_cp
        )
      ),
      '{}'::jsonb
    )
    INTO v_balances
    FROM public.campaign_characters
    WHERE campaign_id = p_campaign_id
      AND id = ANY(v_character_ids);
  END IF;

  RETURN jsonb_build_object('success', true, 'balances', v_balances);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_campaign_economy_atomic(uuid, uuid, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_campaign_economy_atomic(uuid, uuid, jsonb, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.apply_campaign_economy_atomic(uuid, uuid, jsonb, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_campaign_economy_atomic(uuid, uuid, jsonb, jsonb) TO service_role;
