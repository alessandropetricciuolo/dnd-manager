-- Sessione live torneo (una attiva per campagna) + initiative per incontro in DB.

CREATE TABLE IF NOT EXISTS public.torneo_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
  remote_session_public_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_torneo_live_one_active_per_campaign
  ON public.torneo_live_sessions(campaign_id)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS idx_torneo_live_sessions_public_id
  ON public.torneo_live_sessions(public_id);

COMMENT ON TABLE public.torneo_live_sessions IS 'Sessione live GM torneo: telecomandi e PC operatore condividono public_id.';

ALTER TABLE public.gm_remote_sessions
  ADD COLUMN IF NOT EXISTS torneo_live_session_id UUID REFERENCES public.torneo_live_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gm_remote_sessions_torneo_live
  ON public.gm_remote_sessions(torneo_live_session_id);

ALTER TABLE public.torneo_matches
  ADD COLUMN IF NOT EXISTS match_kind TEXT NOT NULL DEFAULT 'bracket'
    CHECK (match_kind IN ('bracket', 'triello')),
  ADD COLUMN IF NOT EXISTS bracket_round SMALLINT,
  ADD COLUMN IF NOT EXISTS bracket_slot SMALLINT,
  ADD COLUMN IF NOT EXISTS advances_to_match_id UUID REFERENCES public.torneo_matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS advances_to_slot TEXT CHECK (advances_to_slot IS NULL OR advances_to_slot IN ('a', 'b')),
  ADD COLUMN IF NOT EXISTS initiative_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS initiative_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timer_round_label TEXT,
  ADD COLUMN IF NOT EXISTS timer_duration_sec INTEGER,
  ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timer_paused_at TIMESTAMPTZ;

COMMENT ON COLUMN public.torneo_matches.initiative_snapshot IS 'Stato initiative tracker serializzato (sync multi-PC).';
COMMENT ON COLUMN public.torneo_matches.match_kind IS 'bracket = eliminazione diretta; triello = finale interna squadra vincitrice.';

ALTER TABLE public.torneo_live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "torneo_live_sessions_select"
  ON public.torneo_live_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo_live_sessions.campaign_id
        AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  );

CREATE POLICY "torneo_live_sessions_gm_write"
  ON public.torneo_live_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo_live_sessions.campaign_id
        AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo_live_sessions.campaign_id
        AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'torneo_matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.torneo_matches;
  END IF;
END $$;
