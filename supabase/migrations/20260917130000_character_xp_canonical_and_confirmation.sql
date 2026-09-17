-- Milestone 2: la scheda personaggio è la fonte canonica dell'XP.
-- campaign_members.xp_earned resta un totale compatibile per il profilo campagna,
-- ma non viene più usato per sovrascrivere silenziosamente current_xp.

ALTER TABLE public.session_xp_awards
  ADD COLUMN IF NOT EXISTS xp_after INTEGER;

COMMENT ON COLUMN public.session_xp_awards.xp_after IS
  'Totale XP canonico del personaggio/membro subito dopo questa assegnazione.';

CREATE OR REPLACE FUNCTION public.set_character_xp_canonical(
  p_character_id UUID,
  p_actor_id UUID,
  p_next_xp INTEGER
)
RETURNS TABLE(campaign_id UUID, character_id UUID, current_xp INTEGER, member_xp_earned INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_character public.campaign_characters%ROWTYPE;
  v_next_xp INTEGER := GREATEST(COALESCE(p_next_xp, 0), 0);
BEGIN
  SELECT * INTO v_character
  FROM public.campaign_characters
  WHERE id = p_character_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'character_not_found';
  END IF;
  IF NOT public.session_actor_can_manage(p_actor_id, v_character.campaign_id) THEN
    RAISE EXCEPTION 'character_xp_not_authorized';
  END IF;
  IF v_character.assigned_to IS NULL THEN
    RAISE EXCEPTION 'character_not_assigned';
  END IF;

  INSERT INTO public.campaign_members(campaign_id, player_id, xp_earned)
  VALUES (v_character.campaign_id, v_character.assigned_to, v_next_xp)
  ON CONFLICT (campaign_id, player_id) DO UPDATE
  SET xp_earned = EXCLUDED.xp_earned;

  UPDATE public.campaign_characters
  SET current_xp = v_next_xp
  WHERE id = p_character_id;

  RETURN QUERY
  SELECT v_character.campaign_id, p_character_id, v_next_xp, v_next_xp;
END;
$$;

-- Wrapper transazionale: M1 applica presenze/XP/sessione, poi questa stessa
-- transazione salva nel ledger il totale canonico osservato per la conferma.
CREATE OR REPLACE FUNCTION public.close_session_with_xp_persisted(
  p_session_id UUID,
  p_actor_id UUID,
  p_attendance JSONB,
  p_xp_gained INTEGER,
  p_per_player_xp_awards JSONB,
  p_summary TEXT,
  p_gm_private_notes TEXT
)
RETURNS TABLE(applied_awards INTEGER, skipped_awards INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result
  FROM public.close_session_with_xp(
    p_session_id,
    p_actor_id,
    p_attendance,
    p_xp_gained,
    p_per_player_xp_awards,
    p_summary,
    p_gm_private_notes
  );

  UPDATE public.session_xp_awards a
  SET xp_after = COALESCE(
    (
      SELECT c.current_xp
      FROM public.campaign_characters c
      WHERE c.id = a.character_id
    ),
    (
      SELECT m.xp_earned
      FROM public.campaign_members m
      WHERE m.campaign_id = a.campaign_id
        AND m.player_id = a.player_id
    )
  )
  WHERE a.session_id = p_session_id;

  applied_awards := v_result.applied_awards;
  skipped_awards := v_result.skipped_awards;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.set_character_xp_canonical(UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_session_with_xp_persisted(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_character_xp_canonical(UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_session_with_xp_persisted(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.set_character_xp_canonical(UUID, UUID, INTEGER) IS
  'Explicitly sets canonical character XP and synchronizes the compatibility campaign member total atomically.';
