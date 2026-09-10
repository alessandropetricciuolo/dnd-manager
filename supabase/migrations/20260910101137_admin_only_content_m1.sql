-- M1: additive schema and database barrier for Admin-only campaign content.
-- Existing rows retain their current visibility and receive admin_only = false.

ALTER TABLE public.campaigns
  ADD COLUMN admin_drafts_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.wiki_entities
  ADD COLUMN admin_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.maps
  ADD COLUMN admin_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.campaign_memory_chunks
  ADD COLUMN admin_only boolean NOT NULL DEFAULT false;

CREATE INDEX wiki_entities_admin_only_campaign_idx
  ON public.wiki_entities (campaign_id)
  WHERE admin_only = true;

CREATE INDEX maps_admin_only_campaign_idx
  ON public.maps (campaign_id)
  WHERE admin_only = true;

CREATE INDEX campaign_memory_chunks_admin_only_campaign_source_idx
  ON public.campaign_memory_chunks (campaign_id, source_type)
  WHERE admin_only = true;

CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_global_admin() IS
  'True only for the authenticated user whose server-managed profile role is admin.';

REVOKE ALL ON FUNCTION public.is_global_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_global_admin() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_admin_only_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  is_new_admin_only boolean;
  feature_enabled boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    is_new_admin_only := NEW.admin_only;
  ELSE
    is_new_admin_only := NEW.admin_only
      AND (
        NOT OLD.admin_only
        OR OLD.campaign_id IS DISTINCT FROM NEW.campaign_id
      );
  END IF;

  IF NOT is_new_admin_only THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'admin_only_requires_global_admin'
      USING ERRCODE = '42501';
  END IF;

  SELECT c.admin_drafts_enabled
    INTO feature_enabled
  FROM public.campaigns AS c
  WHERE c.id = NEW.campaign_id;

  IF feature_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'admin_only_feature_disabled'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_admin_only_write() IS
  'Rejects creation or conversion of Admin-only content unless the actor is a global Admin and the campaign flag is enabled.';

REVOKE ALL ON FUNCTION public.enforce_admin_only_write() FROM PUBLIC;

CREATE TRIGGER wiki_entities_enforce_admin_only_write
  BEFORE INSERT OR UPDATE OF admin_only, campaign_id
  ON public.wiki_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_only_write();

CREATE TRIGGER maps_enforce_admin_only_write
  BEFORE INSERT OR UPDATE OF admin_only, campaign_id
  ON public.maps
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_only_write();

-- Restrictive policies are AND-ed with every existing permissive policy. This
-- prevents older GM/participant policies from bypassing the Admin-only barrier.
CREATE POLICY "Admin-only wiki select barrier"
  ON public.wiki_entities
  AS RESTRICTIVE
  FOR SELECT
  TO public
  USING (NOT admin_only OR public.is_global_admin());

CREATE POLICY "Admin-only wiki insert barrier"
  ON public.wiki_entities
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (NOT admin_only OR public.is_global_admin());

CREATE POLICY "Admin-only wiki update barrier"
  ON public.wiki_entities
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (NOT admin_only OR public.is_global_admin())
  WITH CHECK (NOT admin_only OR public.is_global_admin());

CREATE POLICY "Admin-only wiki delete barrier"
  ON public.wiki_entities
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (NOT admin_only OR public.is_global_admin());

CREATE POLICY "Admin-only maps select barrier"
  ON public.maps
  AS RESTRICTIVE
  FOR SELECT
  TO public
  USING (NOT admin_only OR public.is_global_admin());

CREATE POLICY "Admin-only maps insert barrier"
  ON public.maps
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (NOT admin_only OR public.is_global_admin());

CREATE POLICY "Admin-only maps update barrier"
  ON public.maps
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (NOT admin_only OR public.is_global_admin())
  WITH CHECK (NOT admin_only OR public.is_global_admin());

CREATE POLICY "Admin-only maps delete barrier"
  ON public.maps
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (NOT admin_only OR public.is_global_admin());
