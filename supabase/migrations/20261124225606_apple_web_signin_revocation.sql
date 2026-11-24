ALTER TABLE public.apple_sign_in_tokens
  ALTER COLUMN encrypted_refresh_token DROP NOT NULL,
  ADD COLUMN encrypted_web_refresh_token text,
  ADD CONSTRAINT apple_sign_in_tokens_has_token CHECK (
    encrypted_refresh_token IS NOT NULL OR encrypted_web_refresh_token IS NOT NULL
  );

ALTER TABLE public.account_deletion_requests ADD COLUMN apple_web_revocation_token text;

CREATE OR REPLACE FUNCTION public.queue_apple_token_revocation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT encrypted_refresh_token, encrypted_web_refresh_token
    INTO NEW.apple_revocation_token, NEW.apple_web_revocation_token
  FROM public.apple_sign_in_tokens WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;
