-- Supabase projects may have explicit default EXECUTE grants for API roles.
-- Revoke them directly instead of relying only on the PUBLIC pseudo-role.
REVOKE ALL ON FUNCTION public.enforce_admin_only_write()
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.match_campaign_memory(
  uuid, vector, double precision, integer, text[], boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_campaign_memory(
  uuid, vector, double precision, integer, text[], boolean
) TO service_role;

REVOKE ALL ON FUNCTION public.match_campaign_memory_preview(
  uuid, vector, double precision, integer, text[], boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_campaign_memory_preview(
  uuid, vector, double precision, integer, text[], boolean
) TO service_role;

-- Keep these service-only SQL functions independent of a mutable caller path.
ALTER FUNCTION public.match_campaign_memory(
  uuid, vector, double precision, integer, text[], boolean
) SET search_path = '';
ALTER FUNCTION public.match_campaign_memory_preview(
  uuid, vector, double precision, integer, text[], boolean
) SET search_path = '';
