-- Torneo 2.0: modulo isolato con singola fonte di verità per lo stato combattimento.
-- Tabelle namespace torneo2_*; non tocca le tabelle torneo_* (v1).

-- ============================================================
-- Squadre
-- ============================================================
CREATE TABLE IF NOT EXISTS public.torneo2_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#f59e0b',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT torneo2_teams_name_nonempty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_torneo2_teams_campaign ON public.torneo2_teams(campaign_id, sort_order);

-- ============================================================
-- Membri squadra (un PG in una sola squadra per campagna)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.torneo2_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.torneo2_teams(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.campaign_characters(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT torneo2_team_members_unique_char UNIQUE (character_id)
);

CREATE INDEX IF NOT EXISTS idx_torneo2_team_members_team ON public.torneo2_team_members(team_id);

-- ============================================================
-- Incontri (squadre o finale free-for-all)
-- combat_state: UNICA fonte di verità per lo stato combattimento.
-- combat_seq/combat_origin: guardia anti-eco per il sync realtime.
-- timer_*: stato autoritativo del timer (i client calcolano il countdown localmente).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.torneo2_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'team' CHECK (kind IN ('team', 'final_ffa')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  team_a_id UUID REFERENCES public.torneo2_teams(id) ON DELETE SET NULL,
  team_b_id UUID REFERENCES public.torneo2_teams(id) ON DELETE SET NULL,
  -- Config timer (impostata prima dell'incontro)
  timer_mode TEXT NOT NULL DEFAULT 'turn' CHECK (timer_mode IN ('turn', 'match', 'both', 'none')),
  turn_seconds INTEGER NOT NULL DEFAULT 120,
  match_seconds INTEGER,
  -- Runtime timer autoritativo
  timer_running BOOLEAN NOT NULL DEFAULT FALSE,
  timer_started_at TIMESTAMPTZ,
  timer_paused_elapsed_ms BIGINT NOT NULL DEFAULT 0,
  timer_label TEXT,
  -- Stato combattimento
  combat_state JSONB,
  combat_seq BIGINT NOT NULL DEFAULT 0,
  combat_origin TEXT,
  combat_updated_at TIMESTAMPTZ,
  -- Esito
  winner_team_id UUID REFERENCES public.torneo2_teams(id) ON DELETE SET NULL,
  winner_character_id UUID REFERENCES public.campaign_characters(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT torneo2_matches_turn_seconds_pos CHECK (turn_seconds > 0),
  CONSTRAINT torneo2_matches_paused_nonneg CHECK (timer_paused_elapsed_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_torneo2_matches_campaign ON public.torneo2_matches(campaign_id, sort_order);

-- ============================================================
-- Partecipanti (usati per la finale free-for-all individuale; flessibile)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.torneo2_match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.torneo2_matches(id) ON DELETE CASCADE,
  side TEXT NOT NULL DEFAULT 'ffa' CHECK (side IN ('a', 'b', 'ffa')),
  team_id UUID REFERENCES public.torneo2_teams(id) ON DELETE SET NULL,
  character_id UUID REFERENCES public.campaign_characters(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_torneo2_match_participants_match ON public.torneo2_match_participants(match_id, sort_order);

-- ============================================================
-- Sessione live (una attiva per campagna) + 2 tavoli paralleli
-- ============================================================
CREATE TABLE IF NOT EXISTS public.torneo2_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
  station1_match_id UUID REFERENCES public.torneo2_matches(id) ON DELETE SET NULL,
  station2_match_id UUID REFERENCES public.torneo2_matches(id) ON DELETE SET NULL,
  remote_session_public_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_torneo2_live_one_active_per_campaign
  ON public.torneo2_live_sessions(campaign_id)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS idx_torneo2_live_sessions_public_id
  ON public.torneo2_live_sessions(public_id);

COMMENT ON TABLE public.torneo2_teams IS 'Torneo 2.0: squadre PG (per campaign_id).';
COMMENT ON TABLE public.torneo2_matches IS 'Torneo 2.0: incontri; combat_state è unica fonte di verità con combat_seq/origin per sync.';
COMMENT ON COLUMN public.torneo2_matches.combat_state IS 'Stato combattimento serializzato (combatants, turno, round).';
COMMENT ON COLUMN public.torneo2_matches.combat_seq IS 'Sequenza monotona: i client applicano solo update con seq maggiore.';
COMMENT ON COLUMN public.torneo2_matches.combat_origin IS 'Origin id del client che ha scritto: usato per ignorare i propri echi realtime.';

-- ============================================================
-- Trigger updated_at (riusa funzione esistente)
-- ============================================================
DROP TRIGGER IF EXISTS torneo2_teams_updated_at ON public.torneo2_teams;
CREATE TRIGGER torneo2_teams_updated_at
  BEFORE UPDATE ON public.torneo2_teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS torneo2_matches_updated_at ON public.torneo2_matches;
CREATE TRIGGER torneo2_matches_updated_at
  BEFORE UPDATE ON public.torneo2_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.torneo2_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneo2_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneo2_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneo2_match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneo2_live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "torneo2_teams_select"
  ON public.torneo2_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo2_teams.campaign_id
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

CREATE POLICY "torneo2_teams_gm_write"
  ON public.torneo2_teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo2_teams.campaign_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo2_teams.campaign_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  );

CREATE POLICY "torneo2_team_members_select"
  ON public.torneo2_team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.torneo2_teams t
      JOIN public.campaigns c ON c.id = t.campaign_id
      WHERE t.id = torneo2_team_members.team_id
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

CREATE POLICY "torneo2_team_members_gm_write"
  ON public.torneo2_team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.torneo2_teams t
      JOIN public.campaigns c ON c.id = t.campaign_id
      WHERE t.id = torneo2_team_members.team_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.torneo2_teams t
      JOIN public.campaigns c ON c.id = t.campaign_id
      WHERE t.id = torneo2_team_members.team_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  );

CREATE POLICY "torneo2_matches_select"
  ON public.torneo2_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo2_matches.campaign_id
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

CREATE POLICY "torneo2_matches_gm_write"
  ON public.torneo2_matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo2_matches.campaign_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo2_matches.campaign_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  );

CREATE POLICY "torneo2_match_participants_select"
  ON public.torneo2_match_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.torneo2_matches m
      JOIN public.campaigns c ON c.id = m.campaign_id
      WHERE m.id = torneo2_match_participants.match_id
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

CREATE POLICY "torneo2_match_participants_gm_write"
  ON public.torneo2_match_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.torneo2_matches m
      JOIN public.campaigns c ON c.id = m.campaign_id
      WHERE m.id = torneo2_match_participants.match_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.torneo2_matches m
      JOIN public.campaigns c ON c.id = m.campaign_id
      WHERE m.id = torneo2_match_participants.match_id AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  );

CREATE POLICY "torneo2_live_sessions_select"
  ON public.torneo2_live_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo2_live_sessions.campaign_id
        AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  );

CREATE POLICY "torneo2_live_sessions_gm_write"
  ON public.torneo2_live_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo2_live_sessions.campaign_id
        AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = torneo2_live_sessions.campaign_id
        AND (c.gm_id = auth.uid() OR public.is_gm_or_admin())
    )
  );

-- ============================================================
-- Realtime: una sola tabella in publication per il sync incontro
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'torneo2_matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.torneo2_matches;
  END IF;
END $$;
