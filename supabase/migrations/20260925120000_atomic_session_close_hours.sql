-- Sessione, presenze, EXP e ore dei PG sono confermate dalla stessa transazione.
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS elapsed_hours INTEGER
  CHECK (elapsed_hours >= 0);

CREATE TABLE IF NOT EXISTS public.session_hour_awards (
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.campaign_characters(id) ON DELETE CASCADE,
  hours_awarded INTEGER NOT NULL CHECK (hours_awarded > 0),
  hours_before INTEGER NOT NULL CHECK (hours_before >= 0),
  hours_after INTEGER NOT NULL CHECK (hours_after >= hours_before),
  calendar_date_after JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, character_id)
);

CREATE INDEX IF NOT EXISTS session_hour_awards_campaign_idx
  ON public.session_hour_awards(campaign_id, created_at DESC);

ALTER TABLE public.session_hour_awards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "GM and Admin can view session hour awards" ON public.session_hour_awards;
CREATE POLICY "GM and Admin can view session hour awards"
  ON public.session_hour_awards FOR SELECT TO authenticated
  USING (
    public.is_gm_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = session_hour_awards.campaign_id AND c.gm_id = auth.uid()
    )
  );
REVOKE ALL ON TABLE public.session_hour_awards FROM anon, authenticated;
GRANT SELECT ON TABLE public.session_hour_awards TO authenticated;

CREATE OR REPLACE FUNCTION public.close_session_with_xp_and_hours(
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
  v_campaign public.campaigns%ROWTYPE;
  v_result RECORD;
  v_update RECORD;
  v_target_count INTEGER;
  v_written INTEGER;
BEGIN
  IF p_elapsed_hours IS NULL OR p_elapsed_hours < 0 OR p_elapsed_hours > 10000
     OR p_hour_updates IS NULL OR jsonb_typeof(p_hour_updates) <> 'array' THEN
    RAISE EXCEPTION 'invalid_session_hour_plan';
  END IF;

  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF NOT public.session_actor_can_manage(p_actor_id, v_session.campaign_id) THEN
    RAISE EXCEPTION 'session_close_not_authorized';
  END IF;
  IF v_session.status = 'completed' THEN
    SELECT COUNT(*)::INTEGER INTO applied_awards
    FROM public.session_xp_awards WHERE session_id = p_session_id;
    skipped_awards := 0;
    RETURN NEXT;
    RETURN;
  END IF;
  IF v_session.status <> 'scheduled' THEN RAISE EXCEPTION 'session_already_closed'; END IF;

  IF p_elapsed_hours > 0 AND jsonb_array_length(p_hour_updates) > 0 THEN
    SELECT * INTO v_campaign FROM public.campaigns
    WHERE id = v_session.campaign_id FOR SHARE;
    IF NOT FOUND OR v_campaign.long_calendar_config IS DISTINCT FROM p_calendar_config
       OR v_campaign.long_calendar_base_date IS DISTINCT FROM p_calendar_base_date THEN
      RAISE EXCEPTION 'session_calendar_changed';
    END IF;
  END IF;

  -- The plan must contain every assigned character of every attending signup,
  -- and no other character. A stale roster aborts the whole closure.
  SELECT COUNT(*)::INTEGER INTO v_target_count
  FROM public.campaign_characters c
  JOIN public.session_signups s ON s.player_id = c.assigned_to
  WHERE c.campaign_id = v_session.campaign_id
    AND s.session_id = p_session_id
    AND lower(s.status) IN ('approved', 'confirmed', 'attended', 'absent')
    AND COALESCE(p_attendance ->> s.player_id::TEXT, 'attended') = 'attended';
  IF p_elapsed_hours = 0 THEN
    IF jsonb_array_length(p_hour_updates) <> 0 THEN RAISE EXCEPTION 'unexpected_session_hour_plan'; END IF;
  ELSIF jsonb_array_length(p_hour_updates) <> v_target_count
    OR EXISTS (
      SELECT 1 FROM public.campaign_characters c
      JOIN public.session_signups s ON s.player_id = c.assigned_to
      WHERE c.campaign_id = v_session.campaign_id
        AND s.session_id = p_session_id
        AND lower(s.status) IN ('approved', 'confirmed', 'attended', 'absent')
        AND COALESCE(p_attendance ->> s.player_id::TEXT, 'attended') = 'attended'
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_to_recordset(p_hour_updates)
            AS u(character_id UUID, expected_hours INTEGER, next_hours INTEGER, calendar_current_date JSONB)
          WHERE u.character_id = c.id
        )
    ) THEN
    RAISE EXCEPTION 'session_hour_roster_changed';
  END IF;

  SELECT * INTO v_result FROM public.close_session_with_xp_persisted(
    p_session_id, p_actor_id, p_attendance, p_xp_gained,
    p_per_player_xp_awards, p_summary, p_gm_private_notes
  );
  UPDATE public.sessions SET elapsed_hours = p_elapsed_hours WHERE id = p_session_id;

  IF p_elapsed_hours > 0 THEN
    FOR v_update IN
      SELECT * FROM jsonb_to_recordset(p_hour_updates)
        AS u(character_id UUID, expected_hours INTEGER, next_hours INTEGER, calendar_current_date JSONB)
    LOOP
      IF v_update.character_id IS NULL OR v_update.expected_hours IS NULL
         OR v_update.next_hours IS NULL OR v_update.calendar_current_date IS NULL
         OR v_update.expected_hours < 0
         OR v_update.next_hours <> v_update.expected_hours + p_elapsed_hours
         OR jsonb_typeof(v_update.calendar_current_date) <> 'object' THEN
        RAISE EXCEPTION 'invalid_session_hour_plan';
      END IF;
      UPDATE public.campaign_characters c
      SET time_offset_hours = v_update.next_hours,
          calendar_current_date = v_update.calendar_current_date
      WHERE c.id = v_update.character_id
        AND c.campaign_id = v_session.campaign_id
        AND COALESCE(c.time_offset_hours, 0) = v_update.expected_hours
        AND EXISTS (
          SELECT 1 FROM public.session_signups s
          WHERE s.session_id = p_session_id AND s.player_id = c.assigned_to
            AND s.status = 'attended'
        );
      GET DIAGNOSTICS v_written = ROW_COUNT;
      IF v_written <> 1 THEN RAISE EXCEPTION 'session_character_hours_changed'; END IF;

      INSERT INTO public.session_hour_awards (
        session_id, campaign_id, character_id, hours_awarded,
        hours_before, hours_after, calendar_date_after
      ) VALUES (
        p_session_id, v_session.campaign_id, v_update.character_id, p_elapsed_hours,
        v_update.expected_hours, v_update.next_hours, v_update.calendar_current_date
      );
    END LOOP;
  END IF;

  applied_awards := v_result.applied_awards;
  skipped_awards := v_result.skipped_awards;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.close_session_with_xp_and_hours(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT, INTEGER, JSONB, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_session_with_xp_and_hours(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT, INTEGER, JSONB, JSONB, JSONB)
  TO service_role;
