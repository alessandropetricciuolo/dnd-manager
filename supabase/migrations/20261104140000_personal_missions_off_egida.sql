-- Migration: Missioni fuori Egida (personal missions)
-- Separazione missioni dell'organizzazione (pubbliche ai giocatori) vs missioni fuori Egida (riservate a GM/Admin)
-- Riuso di campaign_missions e linked_mission_id
-- Autorizzazione: TUTTI i GM e TUTTI gli Admin hanno visibilità e gestione completa delle missioni personal su qualsiasi campagna.

ALTER TABLE public.campaign_missions
  ADD COLUMN IF NOT EXISTS mission_kind text NOT NULL DEFAULT 'organization';

-- Check constraint per mission_kind
ALTER TABLE public.campaign_missions
  DROP CONSTRAINT IF EXISTS campaign_missions_mission_kind_check;
ALTER TABLE public.campaign_missions
  ADD CONSTRAINT campaign_missions_mission_kind_check
  CHECK (mission_kind IN ('organization', 'personal'));

COMMENT ON COLUMN public.campaign_missions.mission_kind IS 'organization = Missioni dell''organizzazione; personal = Missioni fuori Egida riservate a GM/Admin.';

-- Invarianti per personal missions:
-- punti gilda zero, nessuna gilda completante, nessun tesoretto distribuibile
ALTER TABLE public.campaign_missions
  DROP CONSTRAINT IF EXISTS campaign_missions_personal_invariants_check;
ALTER TABLE public.campaign_missions
  ADD CONSTRAINT campaign_missions_personal_invariants_check
  CHECK (
    mission_kind <> 'personal'
    OR (
      points_reward = 0
      AND completed_by_guild_id IS NULL
      AND coalesce(treasure_gp, 0) = 0
      AND coalesce(treasure_sp, 0) = 0
      AND coalesce(treasure_cp, 0) = 0
    )
  );

-- Rendi facoltativi i campi legacy per non costringere a inventare valori fittizi
ALTER TABLE public.campaign_missions
  ALTER COLUMN grade DROP NOT NULL,
  ALTER COLUMN committente DROP NOT NULL,
  ALTER COLUMN ubicazione DROP NOT NULL,
  ALTER COLUMN paga DROP NOT NULL,
  ALTER COLUMN urgenza DROP NOT NULL;

-- Indice di supporto per filtri per campagna e tipologia di missione
CREATE INDEX IF NOT EXISTS campaign_missions_campaign_kind_idx
  ON public.campaign_missions (campaign_id, mission_kind);

-- Modello di autorizzazione per missione personal:
-- True per tutti gli utenti con ruolo GM o Admin (allineato al modello Guild del progetto)
CREATE OR REPLACE FUNCTION public.can_manage_campaign_personal_mission(p_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.is_gm_or_admin();
$$;

COMMENT ON FUNCTION public.can_manage_campaign_personal_mission(uuid) IS
  'True for all GM and Admin profiles (Guild model).';

REVOKE ALL ON FUNCTION public.can_manage_campaign_personal_mission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_campaign_personal_mission(uuid) TO authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.can_manage_campaign_personal_mission(uuid) TO service_role;
  END IF;
END $$;

-- RLS: Aggiorna le policy per campaign_missions
DROP POLICY IF EXISTS "Missions visible to campaign members" ON public.campaign_missions;
DROP POLICY IF EXISTS "GM and Admin can manage missions" ON public.campaign_missions;
DROP POLICY IF EXISTS "Campaign GM can manage missions" ON public.campaign_missions;
DROP POLICY IF EXISTS "Organization missions visible to campaign members" ON public.campaign_missions;
DROP POLICY IF EXISTS "Campaign GM can manage organization missions" ON public.campaign_missions;
DROP POLICY IF EXISTS "Campaign GM and Admin can manage personal missions" ON public.campaign_missions;
DROP POLICY IF EXISTS "GM and Admin can manage personal missions" ON public.campaign_missions;
DROP POLICY IF EXISTS "Personal missions barrier" ON public.campaign_missions;

-- 1) Lettura missioni dell'organizzazione per membri della campagna e staff (comportamento consolidato)
CREATE POLICY "Organization missions visible to campaign members"
  ON public.campaign_missions FOR SELECT
  TO authenticated
  USING (
    mission_kind = 'organization'
    AND (
      public.is_gm_or_admin()
      OR EXISTS (
        SELECT 1 FROM public.campaign_members cm
        WHERE cm.campaign_id = campaign_missions.campaign_id
          AND cm.player_id = auth.uid()
      )
    )
  );

-- 2) Gestione missioni dell'organizzazione per GM/Admin
CREATE POLICY "Campaign GM can manage organization missions"
  ON public.campaign_missions FOR ALL
  TO authenticated
  USING (
    mission_kind = 'organization'
    AND public.can_manage_campaign_as_gm(campaign_id)
  )
  WITH CHECK (
    mission_kind = 'organization'
    AND public.can_manage_campaign_as_gm(campaign_id)
  );

-- 3) Lettura e gestione missioni fuori Egida per qualsiasi GM e Admin
CREATE POLICY "GM and Admin can manage personal missions"
  ON public.campaign_missions FOR ALL
  TO authenticated
  USING (
    mission_kind = 'personal'
    AND public.is_gm_or_admin()
  )
  WITH CHECK (
    mission_kind = 'personal'
    AND public.is_gm_or_admin()
  );

-- 4) Barriera restrittiva: garanzia che nessuna policy permissiva (attuale o futura) conceda accesso a personal a non-GM/Admin
CREATE POLICY "Personal missions barrier"
  ON public.campaign_missions AS RESTRICTIVE FOR ALL
  TO public
  USING (
    mission_kind <> 'personal'
    OR public.is_gm_or_admin()
  )
  WITH CHECK (
    mission_kind <> 'personal'
    OR public.is_gm_or_admin()
  );
