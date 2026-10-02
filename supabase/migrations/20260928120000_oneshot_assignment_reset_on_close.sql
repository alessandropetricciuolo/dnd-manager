-- La scelta del GM libera i personaggi solo dopo una chiusura riuscita,
-- nella medesima transazione di presenze, EXP e ore.
CREATE FUNCTION public.close_oneshot_session_and_reset_assignments(
  p_session_id UUID,
  p_actor_id UUID,
  p_attendance JSONB,
  p_xp_gained INTEGER,
  p_per_player_xp_awards JSONB,
  p_summary TEXT,
  p_gm_private_notes TEXT,
  p_elapsed_hours INTEGER,
  p_hour_updates JSONB,
  p_calendar_config JSONB,
  p_calendar_base_date JSONB
)
RETURNS TABLE(applied_awards INTEGER, skipped_awards INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_session public.sessions%ROWTYPE;
  v_campaign_type TEXT;
BEGIN
  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF NOT public.session_actor_can_manage(p_actor_id, v_session.campaign_id) THEN
    RAISE EXCEPTION 'session_close_not_authorized';
  END IF;
  SELECT type INTO v_campaign_type FROM public.campaigns WHERE id = v_session.campaign_id;
  IF v_campaign_type IS DISTINCT FROM 'oneshot' THEN
    RAISE EXCEPTION 'assignment_reset_requires_oneshot';
  END IF;
  IF v_session.status <> 'scheduled' THEN RAISE EXCEPTION 'session_already_closed'; END IF;

  RETURN QUERY SELECT * FROM public.close_session_with_xp_and_hours(
    p_session_id, p_actor_id, p_attendance, p_xp_gained,
    p_per_player_xp_awards, p_summary, p_gm_private_notes,
    p_elapsed_hours, p_hour_updates, p_calendar_config, p_calendar_base_date
  );

  UPDATE public.campaign_characters
  SET assigned_to = NULL
  WHERE campaign_id = v_session.campaign_id AND assigned_to IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.close_oneshot_session_and_reset_assignments(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT, INTEGER, JSONB, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_oneshot_session_and_reset_assignments(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT, INTEGER, JSONB, JSONB, JSONB)
  TO service_role;
