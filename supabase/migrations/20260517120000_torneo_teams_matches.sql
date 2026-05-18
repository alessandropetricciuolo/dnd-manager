-- Squadre e incontri per campagne tipo torneo.

CREATE TABLE IF NOT EXISTS public.torneo_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#f59e0b',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT torneo_teams_name_nonempty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_torneo_teams_campaign ON public.torneo_teams(campaign_id, sort_order);

CREATE TABLE IF NOT EXISTS public.torneo_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.torneo_teams(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.campaign_characters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT torneo_team_members_unique_char UNIQUE (character_id)
);

CREATE INDEX IF NOT EXISTS idx_torneo_team_members_team ON public.torneo_team_members(team_id);

CREATE TABLE IF NOT EXISTS public.torneo_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  team_a_id UUID NOT NULL REFERENCES public.torneo_teams(id) ON DELETE RESTRICT,
  team_b_id UUID NOT NULL REFERENCES public.torneo_teams(id) ON DELETE RESTRICT,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed')),
  winner_team_id UUID REFERENCES public.torneo_teams(id) ON DELETE SET NULL,
  team_a_damage_total INTEGER NOT NULL DEFAULT 0,
  team_b_damage_total INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT torneo_matches_distinct_teams CHECK (team_a_id <> team_b_id),
  CONSTRAINT torneo_matches_damage_nonneg CHECK (team_a_damage_total >= 0 AND team_b_damage_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_torneo_matches_campaign ON public.torneo_matches(campaign_id, sort_order);

COMMENT ON TABLE public.torneo_teams IS 'Squadre PG per torneo (per campaign_id).';
COMMENT ON TABLE public.torneo_team_members IS 'Assegnazione PG a squadra (un PG per campagna torneo).';
COMMENT ON TABLE public.torneo_matches IS 'Incontri tra due squadre; vincitore deciso dal GM.';

DROP TRIGGER IF EXISTS torneo_teams_updated_at ON public.torneo_teams;
CREATE TRIGGER torneo_teams_updated_at
  BEFORE UPDATE ON public.torneo_teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS torneo_matches_updated_at ON public.torneo_matches;
CREATE TRIGGER torneo_matches_updated_at
  BEFORE UPDATE ON public.torneo_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.torneo_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneo_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneo_matches ENABLE ROW LEVEL SECURITY;

-- SELECT: GM campagna, admin, membri campagna
CREATE POLICY "torneo_teams_select"
  ON public.torneo_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo_teams.campaign_id
        AND (
          c.gm_id = auth.uid()
          OR public.is_gm_or_admin()
          OR c.is_public
          OR EXISTS (
            SELECT 1 FROM public.campaign_members cm
            WHERE cm.campaign_id = c.id AND cm.player_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "torneo_teams_gm_write"
  ON public.torneo_teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo_teams.campaign_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo_teams.campaign_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  );

CREATE POLICY "torneo_team_members_select"
  ON public.torneo_team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.torneo_teams t
      JOIN public.campaigns c ON c.id = t.campaign_id
      WHERE t.id = torneo_team_members.team_id
        AND (
          c.gm_id = auth.uid()
          OR public.is_gm_or_admin()
          OR c.is_public
          OR EXISTS (
            SELECT 1 FROM public.campaign_members cm
            WHERE cm.campaign_id = c.id AND cm.player_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "torneo_team_members_gm_write"
  ON public.torneo_team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.torneo_teams t
      JOIN public.campaigns c ON c.id = t.campaign_id
      WHERE t.id = torneo_team_members.team_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.torneo_teams t
      JOIN public.campaigns c ON c.id = t.campaign_id
      WHERE t.id = torneo_team_members.team_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  );

CREATE POLICY "torneo_matches_select"
  ON public.torneo_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo_matches.campaign_id
        AND (
          c.gm_id = auth.uid()
          OR public.is_gm_or_admin()
          OR c.is_public
          OR EXISTS (
            SELECT 1 FROM public.campaign_members cm
            WHERE cm.campaign_id = c.id AND cm.player_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "torneo_matches_gm_write"
  ON public.torneo_matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo_matches.campaign_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo_matches.campaign_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  );
