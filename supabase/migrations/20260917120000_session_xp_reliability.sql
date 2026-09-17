-- Persistenza e applicazione atomica dell'XP di chiusura sessione.
-- La migration è idempotente per poter allineare installazioni locali già avanzate.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS pre_closed_xp_gained INTEGER,
  ADD COLUMN IF NOT EXISTS pre_closed_xp_awards JSONB;

COMMENT ON COLUMN public.sessions.pre_closed_xp_gained IS
  'XP totale salvato nella pre-chiusura e da applicare alla chiusura definitiva.';
COMMENT ON COLUMN public.sessions.pre_closed_xp_awards IS
  'Assegnazioni XP per giocatore salvate nella pre-chiusura: [{playerId, xp}].';

CREATE TABLE IF NOT EXISTS public.session_xp_awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  character_id UUID REFERENCES public.campaign_characters(id) ON DELETE SET NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  source TEXT NOT NULL DEFAULT 'session_close'
    CHECK (source IN ('session_close', 'manual_adjustment', 'migration')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, player_id)
);

-- Il vincolo esplicito sessione/personaggio è utile anche per i personaggi non
-- assegnati a un player; il vincolo parziale evita che NULL bypassi l'unicità.
CREATE UNIQUE INDEX IF NOT EXISTS session_xp_awards_session_character_uidx
  ON public.session_xp_awards(session_id, character_id)
  WHERE character_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS session_xp_awards_campaign_idx
  ON public.session_xp_awards(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS session_xp_awards_character_idx
  ON public.session_xp_awards(character_id, created_at DESC)
  WHERE character_id IS NOT NULL;

ALTER TABLE public.session_xp_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "GM and Admin can view session XP awards" ON public.session_xp_awards;
CREATE POLICY "GM and Admin can view session XP awards"
  ON public.session_xp_awards FOR SELECT
  TO authenticated
  USING (
    public.is_gm_or_admin()
    OR EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = session_xp_awards.campaign_id
        AND c.gm_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.session_xp_awards FROM anon, authenticated;
GRANT SELECT ON TABLE public.session_xp_awards TO authenticated;

CREATE OR REPLACE FUNCTION public.session_actor_can_manage(
  p_actor_id UUID,
  p_campaign_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.campaigns c ON c.id = p_campaign_id
    WHERE p.id = p_actor_id
      AND (
        p.role = 'admin'
        OR (p.role = 'gm' AND c.gm_id = p_actor_id)
      )
  );
$$;

COMMENT ON FUNCTION public.session_actor_can_manage(UUID, UUID) IS
  'Authorization guard for server-side session close RPCs; actor is validated explicitly because service_role has no auth.uid().';

CREATE OR REPLACE FUNCTION public.save_session_preclose(
  p_session_id UUID,
  p_actor_id UUID,
  p_attendance JSONB,
  p_xp_gained INTEGER,
  p_per_player_xp_awards JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_session public.sessions%ROWTYPE;
  v_signup RECORD;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_session
  FROM public.sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF NOT public.session_actor_can_manage(p_actor_id, v_session.campaign_id) THEN
    RAISE EXCEPTION 'session_close_not_authorized';
  END IF;
  IF v_session.status <> 'scheduled' THEN
    RAISE EXCEPTION 'session_already_closed';
  END IF;

  FOR v_signup IN
    SELECT id, player_id, status
    FROM public.session_signups
    WHERE session_id = p_session_id
      AND lower(status) IN ('approved', 'confirmed', 'attended', 'absent')
    FOR UPDATE
  LOOP
    v_new_status := COALESCE(p_attendance ->> v_signup.player_id::TEXT, 'attended');
    IF v_new_status NOT IN ('attended', 'absent') THEN
      RAISE EXCEPTION 'invalid_attendance_status';
    END IF;

    IF v_signup.status <> v_new_status THEN
      UPDATE public.session_signups
      SET status = v_new_status
      WHERE id = v_signup.id;

      IF v_new_status = 'attended' AND lower(v_signup.status) <> 'attended' THEN
        UPDATE public.profiles
        SET sessions_attended_count = COALESCE(sessions_attended_count, 0) + 1
        WHERE id = v_signup.player_id;

        INSERT INTO public.player_achievements(
          player_id, achievement_id, current_progress, is_unlocked, unlocked_at
        )
        SELECT
          p.id,
          a.id,
          LEAST(COALESCE(a.max_progress, 1), COALESCE(p.sessions_attended_count, 0)),
          COALESCE(p.sessions_attended_count, 0) >= COALESCE(a.max_progress, 1),
          CASE
            WHEN COALESCE(p.sessions_attended_count, 0) >= COALESCE(a.max_progress, 1)
              THEN NOW()
            ELSE NULL
          END
        FROM public.profiles p
        JOIN public.achievements a
          ON a.id = 'b0000002-0002-4000-8000-000000000002'::UUID
        WHERE p.id = v_signup.player_id
        ON CONFLICT (player_id, achievement_id) DO UPDATE
        SET current_progress = EXCLUDED.current_progress,
            is_unlocked = EXCLUDED.is_unlocked,
            unlocked_at = EXCLUDED.unlocked_at;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.sessions
  SET is_pre_closed = TRUE,
      pre_closed_xp_gained = GREATEST(COALESCE(p_xp_gained, 0), 0),
      pre_closed_xp_awards = COALESCE(p_per_player_xp_awards, '[]'::JSONB)
  WHERE id = p_session_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_session_with_xp(
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
  v_session public.sessions%ROWTYPE;
  v_signup RECORD;
  v_character_id UUID;
  v_character_xp INTEGER;
  v_member_id UUID;
  v_member_xp INTEGER;
  v_new_status TEXT;
  v_player_xp INTEGER;
  v_next_xp INTEGER;
  v_award_id UUID;
  v_applied INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  SELECT * INTO v_session
  FROM public.sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF NOT public.session_actor_can_manage(p_actor_id, v_session.campaign_id) THEN
    RAISE EXCEPTION 'session_close_not_authorized';
  END IF;
  IF v_session.status = 'completed' THEN
    SELECT COUNT(*)::INTEGER
    INTO v_applied
    FROM public.session_xp_awards
    WHERE session_id = p_session_id;
    applied_awards := v_applied;
    skipped_awards := 0;
    RETURN NEXT;
    RETURN;
  END IF;
  IF v_session.status <> 'scheduled' THEN
    RAISE EXCEPTION 'session_already_closed';
  END IF;

  FOR v_signup IN
    SELECT id, player_id, status
    FROM public.session_signups
    WHERE session_id = p_session_id
      AND lower(status) IN ('approved', 'confirmed', 'attended', 'absent')
    FOR UPDATE
  LOOP
    v_new_status := COALESCE(p_attendance ->> v_signup.player_id::TEXT, 'attended');
    IF v_new_status NOT IN ('attended', 'absent') THEN
      RAISE EXCEPTION 'invalid_attendance_status';
    END IF;

    IF v_signup.status <> v_new_status THEN
      UPDATE public.session_signups
      SET status = v_new_status
      WHERE id = v_signup.id;

      IF v_new_status = 'attended' AND lower(v_signup.status) <> 'attended' THEN
        UPDATE public.profiles
        SET sessions_attended_count = COALESCE(sessions_attended_count, 0) + 1
        WHERE id = v_signup.player_id;

        INSERT INTO public.player_achievements(
          player_id, achievement_id, current_progress, is_unlocked, unlocked_at
        )
        SELECT
          p.id,
          a.id,
          LEAST(COALESCE(a.max_progress, 1), COALESCE(p.sessions_attended_count, 0)),
          COALESCE(p.sessions_attended_count, 0) >= COALESCE(a.max_progress, 1),
          CASE
            WHEN COALESCE(p.sessions_attended_count, 0) >= COALESCE(a.max_progress, 1)
              THEN NOW()
            ELSE NULL
          END
        FROM public.profiles p
        JOIN public.achievements a
          ON a.id = 'b0000002-0002-4000-8000-000000000002'::UUID
        WHERE p.id = v_signup.player_id
        ON CONFLICT (player_id, achievement_id) DO UPDATE
        SET current_progress = EXCLUDED.current_progress,
            is_unlocked = EXCLUDED.is_unlocked,
            unlocked_at = EXCLUDED.unlocked_at;
      END IF;
    END IF;

    IF v_new_status <> 'attended' THEN
      CONTINUE;
    END IF;

    v_character_id := NULL;
    v_character_xp := 0;
    SELECT id, current_xp
    INTO v_character_id, v_character_xp
    FROM public.campaign_characters
    WHERE campaign_id = v_session.campaign_id
      AND assigned_to = v_signup.player_id
    ORDER BY created_at, id
    LIMIT 1
    FOR UPDATE;

    v_player_xp := COALESCE(
      (
        SELECT CASE
          WHEN (award ->> 'xp') ~ '^[0-9]+$' THEN GREATEST((award ->> 'xp')::INTEGER, 0)
          ELSE 0
        END
        FROM jsonb_array_elements(COALESCE(p_per_player_xp_awards, '[]'::JSONB)) AS award
        WHERE COALESCE(award ->> 'playerId', award ->> 'player_id') = v_signup.player_id::TEXT
        LIMIT 1
      ),
      GREATEST(COALESCE(p_xp_gained, 0), 0)
    );

    v_award_id := NULL;
    INSERT INTO public.session_xp_awards(
      session_id, campaign_id, player_id, character_id, xp_awarded
    )
    VALUES (
      p_session_id, v_session.campaign_id, v_signup.player_id,
      v_character_id, v_player_xp
    )
    ON CONFLICT (session_id, player_id) DO NOTHING
    RETURNING id INTO v_award_id;

    IF v_award_id IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_member_id := NULL;
    v_member_xp := 0;
    SELECT id, xp_earned
    INTO v_member_id, v_member_xp
    FROM public.campaign_members
    WHERE campaign_id = v_session.campaign_id
      AND player_id = v_signup.player_id
    FOR UPDATE;

    -- La scheda personaggio è la fonte canonica quando esiste. Il totale del
    -- membro è solo il fallback compatibile per iscritti privi di personaggio.
    v_next_xp := CASE
      WHEN v_character_id IS NOT NULL THEN GREATEST(COALESCE(v_character_xp, 0), 0)
      ELSE GREATEST(COALESCE(v_member_xp, 0), 0)
    END + v_player_xp;

    IF v_member_id IS NULL THEN
      INSERT INTO public.campaign_members(campaign_id, player_id, xp_earned)
      VALUES (v_session.campaign_id, v_signup.player_id, v_next_xp);
    ELSE
      UPDATE public.campaign_members
      SET xp_earned = v_next_xp
      WHERE id = v_member_id;
    END IF;

    IF v_character_id IS NOT NULL THEN
      UPDATE public.campaign_characters
      SET current_xp = v_next_xp
      WHERE id = v_character_id;
    END IF;

    v_applied := v_applied + 1;
  END LOOP;

  UPDATE public.sessions
  SET status = 'completed',
      session_summary = CASE
        WHEN p_summary IS NULL THEN session_summary
        ELSE NULLIF(BTRIM(p_summary), '')
      END,
      gm_private_notes = CASE
        WHEN p_gm_private_notes IS NULL THEN gm_private_notes
        ELSE NULLIF(BTRIM(p_gm_private_notes), '')
      END,
      is_pre_closed = FALSE,
      pre_closed_xp_gained = NULL,
      pre_closed_xp_awards = NULL
  WHERE id = p_session_id;

  applied_awards := v_applied;
  skipped_awards := v_skipped;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.session_actor_can_manage(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_session_preclose(UUID, UUID, JSONB, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_session_with_xp(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.session_actor_can_manage(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_session_preclose(UUID, UUID, JSONB, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_session_with_xp(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.close_session_with_xp(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT) IS
  'Atomically records attendance, session XP ledger, synchronized member/character XP, and marks a scheduled session completed.';
