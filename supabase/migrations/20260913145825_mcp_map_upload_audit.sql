-- Audit MCP map creation in the same immutable stream as Wiki and asset writes.
DROP TRIGGER IF EXISTS mcp_map_audit ON public.maps;
CREATE TRIGGER mcp_map_audit
AFTER INSERT ON public.maps
FOR EACH ROW EXECUTE FUNCTION mcp_private.audit_write();
