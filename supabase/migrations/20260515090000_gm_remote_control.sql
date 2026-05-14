-- Telecomando GM: sessione pairing (QR) + coda comandi Realtime verso il browser del GM.

CREATE TABLE IF NOT EXISTS public.gm_remote_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gm_remote_sessions_campaign
  ON public.gm_remote_sessions(campaign_id);

CREATE INDEX IF NOT EXISTS idx_gm_remote_sessions_expires
  ON public.gm_remote_sessions(expires_at);

COMMENT ON TABLE public.gm_remote_sessions IS 'Sessione pairing QR; segreto solo come hash (SHA-256 + pepper lato app).';

CREATE TABLE IF NOT EXISTS public.gm_remote_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_public_id UUID NOT NULL REFERENCES public.gm_remote_sessions(public_id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  command_id UUID NOT NULL,
  seq BIGINT,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'remote' CHECK (source IN ('remote', 'gm_screen')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_public_id, command_id)
);

CREATE INDEX IF NOT EXISTS idx_gm_remote_commands_session_created
  ON public.gm_remote_commands(session_public_id, created_at DESC);

COMMENT ON TABLE public.gm_remote_commands IS 'Comandi versionabili; INSERT da service role (API); dedup su (session_public_id, command_id).';

ALTER TABLE public.gm_remote_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_remote_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gm_remote_sessions_select"
  ON public.gm_remote_sessions FOR SELECT
  TO authenticated
  USING (
    public.is_gm_or_admin()
    AND EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id)
  );

CREATE POLICY "gm_remote_sessions_insert"
  ON public.gm_remote_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_gm_or_admin()
    AND EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "gm_remote_sessions_update"
  ON public.gm_remote_sessions FOR UPDATE
  TO authenticated
  USING (
    public.is_gm_or_admin()
    AND EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id)
  )
  WITH CHECK (
    public.is_gm_or_admin()
    AND EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id)
  );

CREATE POLICY "gm_remote_commands_select"
  ON public.gm_remote_commands FOR SELECT
  TO authenticated
  USING (
    public.is_gm_or_admin()
    AND EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.gm_remote_commands;
