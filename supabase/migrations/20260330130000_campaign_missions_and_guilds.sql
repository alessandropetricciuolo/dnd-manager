-- Fase 2.1 West Marches: bacheca missioni (Long) + gilde / classifica

CREATE TABLE public.campaign_guilds (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  grade integer NOT NULL DEFAULT 1 CHECK (grade >= 0),
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, name)
);

CREATE INDEX campaign_guilds_campaign_id_idx ON public.campaign_guilds (campaign_id);

CREATE TABLE public.campaign_missions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  grade text NOT NULL,
  title text NOT NULL,
  committente text NOT NULL,
  ubicazione text NOT NULL,
  paga text NOT NULL,
  urgenza text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX campaign_missions_campaign_id_idx ON public.campaign_missions (campaign_id);

ALTER TABLE public.campaign_guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_missions ENABLE ROW LEVEL SECURITY;

-- =========================
-- RLS: Guilds
-- =========================
CREATE POLICY "Guilds visible to campaign members"
  ON public.campaign_guilds FOR SELECT
  USING (
    public.is_gm_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.campaign_members cm
      WHERE cm.campaign_id = campaign_guilds.campaign_id
        AND cm.player_id = auth.uid()
    )
  );

CREATE POLICY "GM and Admin can manage guilds"
  ON public.campaign_guilds FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin());

-- =========================
-- RLS: Missions
-- =========================
CREATE POLICY "Missions visible to campaign members"
  ON public.campaign_missions FOR SELECT
  USING (
    public.is_gm_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.campaign_members cm
      WHERE cm.campaign_id = campaign_missions.campaign_id
        AND cm.player_id = auth.uid()
    )
  );

CREATE POLICY "GM and Admin can manage missions"
  ON public.campaign_missions FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin());

