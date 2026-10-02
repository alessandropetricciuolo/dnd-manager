-- Allow all GMs (and admins) to close sessions across all campaigns (Guild model).
-- Previously, session_actor_can_manage required (p.role = 'gm' AND c.gm_id = p_actor_id),
-- which prevented GMs who did not create the campaign from closing sessions.

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
    LEFT JOIN public.campaigns c ON c.id = p_campaign_id
    WHERE p.id = p_actor_id
      AND (
        p.role = 'admin'
        OR p.role = 'gm'
        OR c.gm_id = p_actor_id
      )
  );
$$;

COMMENT ON FUNCTION public.session_actor_can_manage(UUID, UUID) IS
  'Authorization guard for server-side session close RPCs; permits admins and all GMs (Guild model) as well as the campaign owner.';

REVOKE ALL ON FUNCTION public.session_actor_can_manage(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.session_actor_can_manage(UUID, UUID) TO service_role;
