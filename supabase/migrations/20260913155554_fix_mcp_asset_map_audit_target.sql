-- mcp_write_audit.entity_id is NOT NULL. Record the written row ID for every
-- audited table (Wiki entity, MCP asset, or Atlas map) so the audit cannot
-- roll back otherwise-valid asset and map inserts.
CREATE OR REPLACE FUNCTION mcp_private.audit_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.mcp_write_audit(actor_id, campaign_id, entity_id, action, revision)
  VALUES (
    auth.uid(),
    NEW.campaign_id,
    NEW.id,
    TG_TABLE_NAME || '.' || lower(TG_OP),
    CASE WHEN TG_TABLE_NAME = 'wiki_entities'
      THEN (to_jsonb(NEW) ->> 'mcp_revision')::integer
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION mcp_private.audit_write() FROM PUBLIC;
