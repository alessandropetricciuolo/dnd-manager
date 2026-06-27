-- Guild model: any profile with role gm/admin can manage/view all campaigns
-- (sessions, characters, wiki, maps, missions, etc. via can_manage_campaign_as_gm).

CREATE OR REPLACE FUNCTION public.can_manage_campaign_as_gm(p_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.is_gm_or_admin()
    OR public.is_super_admin()
    OR public.is_campaign_staff_gm(p_campaign_id)
    OR EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = p_campaign_id
        AND c.gm_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = p_campaign_id
        AND c.organization_id IS NOT NULL
        AND public.is_org_admin(c.organization_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.campaign_row_manage_allowed(
  p_campaign_id uuid,
  p_gm_id uuid,
  p_organization_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_gm_or_admin()
    OR public.is_super_admin()
    OR public.is_campaign_staff_gm(p_campaign_id)
    OR p_gm_id = auth.uid()
    OR (
      p_organization_id IS NOT NULL
      AND public.is_org_admin(p_organization_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_campaign(p_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = p_campaign_id
      AND (
        public.is_gm_or_admin()
        OR c.is_public
        OR c.gm_id = auth.uid()
        OR public.is_super_admin()
        OR public.is_campaign_staff_gm(p_campaign_id)
        OR (
          c.organization_id IS NOT NULL
          AND public.is_org_admin(c.organization_id)
        )
        OR EXISTS (
          SELECT 1
          FROM public.campaign_members cm
          WHERE cm.campaign_id = c.id
            AND cm.player_id = auth.uid()
        )
      )
  );
$$;

COMMENT ON FUNCTION public.can_manage_campaign_as_gm(uuid) IS
  'Guild: GM/Admin profiles manage any campaign; also owner, org admin, assigned staff.';
