ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS xp_draft_state jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS xp_draft_revision bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.save_session_xp_draft(p_session_id uuid,p_actor_id uuid,p_draft jsonb,p_expected_revision bigint DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.sessions%ROWTYPE; next_revision bigint;
BEGIN
  SELECT * INTO s FROM public.sessions WHERE id=p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF NOT public.session_actor_can_manage(p_actor_id,s.campaign_id) THEN RAISE EXCEPTION 'session_close_not_authorized'; END IF;
  IF s.status <> 'scheduled' THEN RAISE EXCEPTION 'session_already_closed'; END IF;
  IF p_expected_revision IS NOT NULL AND s.xp_draft_revision <> p_expected_revision THEN RAISE EXCEPTION 'xp_draft_conflict'; END IF;
  IF p_draft IS NULL OR jsonb_typeof(p_draft) IS DISTINCT FROM 'object' OR jsonb_typeof(p_draft->'attendance') IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_draft->'perPlayerXpAwards') IS DISTINCT FROM 'array'
    OR COALESCE(NOT (p_draft->>'xpGained' ~ '^[0-9]+$'),TRUE) THEN RAISE EXCEPTION 'invalid_xp_draft'; END IF;
  next_revision := s.xp_draft_revision + 1;
  UPDATE public.sessions SET xp_draft_state=p_draft,xp_draft_revision=next_revision,is_pre_closed=true,
    pre_closed_xp_gained=(p_draft->>'xpGained')::integer,pre_closed_xp_awards=p_draft->'perPlayerXpAwards' WHERE id=p_session_id;
  RETURN next_revision;
END; $$;
REVOKE ALL ON FUNCTION public.save_session_xp_draft(uuid,uuid,jsonb,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_session_xp_draft(uuid,uuid,jsonb,bigint) TO service_role;
COMMENT ON COLUMN public.sessions.xp_draft_state IS 'Shared session XP draft. Does not apply XP or attendance counters.';

-- Compatibility path used by MCP: preparing a session never applies attendance or XP.
CREATE OR REPLACE FUNCTION public.save_session_preclose(p_session_id uuid,p_actor_id uuid,p_attendance jsonb,p_xp_gained integer,p_per_player_xp_awards jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  PERFORM public.save_session_xp_draft(p_session_id,p_actor_id,jsonb_build_object(
    'attendance',COALESCE(p_attendance,'{}'::jsonb),
    'xpGained',GREATEST(COALESCE(p_xp_gained,0),0),
    'perPlayerXpAwards',COALESCE(p_per_player_xp_awards,'[]'::jsonb)),NULL);
  RETURN TRUE;
END; $$;
REVOKE ALL ON FUNCTION public.save_session_preclose(uuid,uuid,jsonb,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_session_preclose(uuid,uuid,jsonb,integer,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.close_session_with_reviewed_xp(
 p_session_id uuid,p_actor_id uuid,p_attendance jsonb,p_xp_gained integer,p_per_player_xp_awards jsonb,
 p_summary text,p_gm_private_notes text,p_elapsed_hours integer,p_hour_updates jsonb,p_calendar_config jsonb,p_calendar_base_date jsonb,
 p_expected_revision bigint)
RETURNS TABLE(applied_awards integer,skipped_awards integer) LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.sessions%ROWTYPE;
BEGIN
 SELECT * INTO s FROM public.sessions WHERE id=p_session_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'session_not_found'; END IF;
 IF NOT public.session_actor_can_manage(p_actor_id,s.campaign_id) THEN RAISE EXCEPTION 'session_close_not_authorized'; END IF;
 IF s.status <> 'completed' AND (p_expected_revision IS NULL OR s.xp_draft_revision <> p_expected_revision) THEN RAISE EXCEPTION 'xp_draft_conflict'; END IF;
 RETURN QUERY SELECT * FROM public.close_session_with_xp_and_hours(p_session_id,p_actor_id,p_attendance,p_xp_gained,p_per_player_xp_awards,p_summary,p_gm_private_notes,p_elapsed_hours,p_hour_updates,p_calendar_config,p_calendar_base_date);
END; $$;
REVOKE ALL ON FUNCTION public.close_session_with_reviewed_xp(uuid,uuid,jsonb,integer,jsonb,text,text,integer,jsonb,jsonb,jsonb,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.close_session_with_reviewed_xp(uuid,uuid,jsonb,integer,jsonb,text,text,integer,jsonb,jsonb,jsonb,bigint) TO service_role;
