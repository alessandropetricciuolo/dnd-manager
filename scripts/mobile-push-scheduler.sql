-- Operational setup: execute only after the approved backend release.
-- Prerequisite: the production CRON_SECRET is stored in Supabase Vault under
-- mobile_push_cron_secret. Never paste its value into this versioned file.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'mobile_push_cron_secret' AND length(decrypted_secret) >= 32
  ) THEN
    RAISE EXCEPTION 'Configure the matching production CRON_SECRET in Vault first';
  END IF;
END;
$$;

-- A named schedule is updated rather than duplicated on repeated setup.
SELECT cron.schedule(
  'mobile-push-dispatch',
  '*/5 * * * *',
  $job$
  SELECT net.http_get(
    url := 'https://barberanddragons.com/api/mobile/push/dispatch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'mobile_push_cron_secret'
      )
    ),
    timeout_milliseconds := 60000
  );
  $job$
);
COMMIT;

-- Emergency stop (run separately):
-- SELECT cron.unschedule('mobile-push-dispatch');
