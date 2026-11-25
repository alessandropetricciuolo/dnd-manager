-- Harden public.organizations: revoke anon/write grants and enforce RLS.
-- No web/mobile client calls public.organizations directly; super-admins and
-- org-admins retain read access via existing helper functions, while writes
-- are restricted to service_role (or super-admin if needed server-side).

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organizations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.organizations TO authenticated;
GRANT ALL ON TABLE public.organizations TO service_role;

DROP POLICY IF EXISTS "organizations_select_authorized" ON public.organizations;
CREATE POLICY "organizations_select_authorized"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_org_admin(id)
  );
