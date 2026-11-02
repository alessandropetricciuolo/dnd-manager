-- Disambiguate the conflict target from the campaign_id output parameter.
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
  ON CONFLICT ON CONSTRAINT campaign_members_campaign_id_player_id_key DO UPDATE
  SET xp_earned = EXCLUDED.xp_earned;

  UPDATE public.campaign_characters
  SET current_xp = v_next_xp
  WHERE id = p_character_id;

  RETURN QUERY
  SELECT v_character.campaign_id, p_character_id, v_next_xp, v_next_xp;
END;
$$;
