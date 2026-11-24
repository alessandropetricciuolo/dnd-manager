CREATE TABLE public.apple_sign_in_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_refresh_token text NOT NULL
);

ALTER TABLE public.apple_sign_in_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.apple_sign_in_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.apple_sign_in_tokens TO service_role;

-- Keep social access within the existing email signup and age-verification flow.
CREATE FUNCTION public.has_existing_apple_account(p_subject text, p_verified_email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE provider = 'apple' AND provider_id = p_subject
  ) OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = lower(p_verified_email) AND email_confirmed_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.has_existing_apple_account(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_existing_apple_account(text, text) TO service_role;

ALTER TABLE public.account_deletion_requests
  ADD COLUMN apple_revocation_token text;

-- Move the encrypted token into the receipt in the same transaction as deletion.
CREATE FUNCTION public.queue_apple_token_revocation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT encrypted_refresh_token INTO NEW.apple_revocation_token
  FROM public.apple_sign_in_tokens WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_apple_token_revocation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER queue_apple_token_revocation
  BEFORE UPDATE OF status ON public.account_deletion_requests
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION public.queue_apple_token_revocation();
