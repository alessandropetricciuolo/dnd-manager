-- Supabase default privileges grant EXECUTE directly to anon/authenticated.
-- Revoking PUBLIC alone does not remove those explicit grants. Trigger functions
-- are internal and do not need caller EXECUTE grants when their triggers fire.
REVOKE ALL ON FUNCTION public.enforce_campaign_document_location() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_campaign_document_memory() FROM PUBLIC, anon, authenticated;
