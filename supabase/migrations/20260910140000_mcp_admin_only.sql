-- M6: personal Admin MCP. The MCP process has no database credentials: it calls
-- the Next API, while this schema keeps writes revision-safe and auditable.
BEGIN;

ALTER TABLE public.wiki_entities
  ADD COLUMN IF NOT EXISTS mcp_status text NOT NULL DEFAULT 'draft'
    CHECK (mcp_status IN ('draft', 'proposed', 'canonical', 'deprecated'));
ALTER TABLE public.wiki_entities
  ADD COLUMN IF NOT EXISTS mcp_revision integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.mcp_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id),
  filename text NOT NULL CHECK (length(filename) BETWEEN 1 AND 120),
  mime_type text NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp', 'application/pdf')),
  data_base64 text NOT NULL CHECK (length(data_base64) BETWEEN 4 AND 699052),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, campaign_id)
);
CREATE TABLE IF NOT EXISTS public.mcp_entity_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id),
  entity_id uuid NOT NULL REFERENCES public.wiki_entities(id),
  asset_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, asset_id),
  FOREIGN KEY (asset_id, campaign_id) REFERENCES public.mcp_assets(id, campaign_id)
);
CREATE TABLE IF NOT EXISTS public.mcp_write_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id),
  entity_id uuid REFERENCES public.wiki_entities(id),
  action text NOT NULL,
  revision integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mcp_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_entity_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_write_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mcp_assets_admin ON public.mcp_assets;
DROP POLICY IF EXISTS mcp_entity_assets_admin ON public.mcp_entity_assets;
DROP POLICY IF EXISTS mcp_write_audit_admin ON public.mcp_write_audit;
CREATE POLICY mcp_assets_admin ON public.mcp_assets FOR ALL TO authenticated
  USING (public.is_global_admin() AND EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.admin_drafts_enabled))
  WITH CHECK (public.is_global_admin() AND EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.admin_drafts_enabled));
CREATE POLICY mcp_entity_assets_admin ON public.mcp_entity_assets FOR ALL TO authenticated
  USING (public.is_global_admin() AND EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.admin_drafts_enabled))
  WITH CHECK (public.is_global_admin() AND EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.admin_drafts_enabled));
CREATE POLICY mcp_write_audit_admin ON public.mcp_write_audit FOR SELECT TO authenticated
  USING (public.is_global_admin() AND EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.admin_drafts_enabled));

REVOKE ALL ON public.mcp_assets, public.mcp_entity_assets, public.mcp_write_audit FROM anon;
GRANT SELECT, INSERT ON public.mcp_assets, public.mcp_entity_assets TO authenticated;
GRANT SELECT ON public.mcp_write_audit TO authenticated;

CREATE SCHEMA IF NOT EXISTS mcp_private;
REVOKE ALL ON SCHEMA mcp_private FROM PUBLIC;
CREATE OR REPLACE FUNCTION mcp_private.audit_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.mcp_write_audit(actor_id, campaign_id, entity_id, action, revision)
  VALUES (auth.uid(), NEW.campaign_id,
    CASE WHEN TG_TABLE_NAME = 'wiki_entities' THEN NEW.id ELSE NULL END,
    TG_TABLE_NAME || '.' || lower(TG_OP),
    CASE WHEN TG_TABLE_NAME = 'wiki_entities' THEN NEW.mcp_revision ELSE NULL END);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION mcp_private.audit_write() FROM PUBLIC;
CREATE OR REPLACE FUNCTION mcp_private.bump_revision()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.mcp_revision := OLD.mcp_revision + 1;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION mcp_private.bump_revision() FROM PUBLIC;
DROP TRIGGER IF EXISTS mcp_wiki_revision ON public.wiki_entities;
DROP TRIGGER IF EXISTS mcp_wiki_audit ON public.wiki_entities;
DROP TRIGGER IF EXISTS mcp_asset_audit ON public.mcp_assets;
DROP TRIGGER IF EXISTS mcp_link_audit ON public.mcp_entity_assets;
CREATE TRIGGER mcp_wiki_revision BEFORE UPDATE ON public.wiki_entities FOR EACH ROW EXECUTE FUNCTION mcp_private.bump_revision();
CREATE TRIGGER mcp_wiki_audit AFTER INSERT OR UPDATE ON public.wiki_entities FOR EACH ROW EXECUTE FUNCTION mcp_private.audit_write();
CREATE TRIGGER mcp_asset_audit AFTER INSERT ON public.mcp_assets FOR EACH ROW EXECUTE FUNCTION mcp_private.audit_write();
CREATE TRIGGER mcp_link_audit AFTER INSERT ON public.mcp_entity_assets FOR EACH ROW EXECUTE FUNCTION mcp_private.audit_write();
COMMIT;
