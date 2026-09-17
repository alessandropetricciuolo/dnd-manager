-- Supabase may grant newly-created public functions directly to API roles.
-- Keep XP mutations callable only through trusted server actions.
REVOKE ALL ON FUNCTION public.session_actor_can_manage(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_session_preclose(UUID, UUID, JSONB, INTEGER, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_session_with_xp(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_character_xp_canonical(UUID, UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_session_with_xp_persisted(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.session_actor_can_manage(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_session_preclose(UUID, UUID, JSONB, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_session_with_xp(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_character_xp_canonical(UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_session_with_xp_persisted(UUID, UUID, JSONB, INTEGER, JSONB, TEXT, TEXT) TO service_role;
