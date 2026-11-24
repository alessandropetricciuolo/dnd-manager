-- Social login is for existing accounts. New users still go through email signup.
CREATE OR REPLACE FUNCTION public.hook_restrict_social_signup(event jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN event #>> '{user,app_metadata,provider}' IN ('google', 'apple') THEN
      jsonb_build_object('error', jsonb_build_object(
        'http_code', 403,
        'message', 'social_signup_requires_existing_account'
      ))
    ELSE '{}'::jsonb
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.hook_restrict_social_signup(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hook_restrict_social_signup(jsonb)
  TO supabase_auth_admin;
