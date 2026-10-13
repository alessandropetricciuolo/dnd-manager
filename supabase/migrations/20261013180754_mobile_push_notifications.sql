-- Server-only push registry and queue. Apply before enabling dispatch.
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE public.mobile_push_devices (
 token text PRIMARY KEY CHECK (token ~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$'),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 platform text NOT NULL CHECK (platform IN ('ios','android')),
 enabled boolean NOT NULL DEFAULT true,
 whispers boolean NOT NULL DEFAULT true,
 sessions boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mobile_push_devices_user ON public.mobile_push_devices(user_id);
CREATE TABLE public.mobile_push_jobs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 token text NOT NULL REFERENCES public.mobile_push_devices(token) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('whisper','session_changed','session_reminder')),
 source_id text NOT NULL,
 campaign_id uuid,
 session_id uuid,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','ticket','delivered','failed','skipped')),
 attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz,
 ticket_id text,
 last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,token,kind,source_id)
);
CREATE INDEX mobile_push_jobs_pending ON public.mobile_push_jobs(status,available_at);
ALTER TABLE public.mobile_push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_push_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mobile_push_devices, public.mobile_push_jobs FROM anon, authenticated;
GRANT ALL ON public.mobile_push_devices, public.mobile_push_jobs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.mobile_push_jobs_id_seq TO service_role;

CREATE FUNCTION private.enqueue_mobile_whisper_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.mobile_push_jobs(user_id,token,kind,source_id,campaign_id)
 SELECT d.user_id,d.token,'whisper',NEW.id::text,NEW.campaign_id
 FROM public.mobile_push_devices d JOIN public.profiles p ON p.id=d.user_id
 WHERE d.user_id=NEW.receiver_id AND d.enabled AND d.whispers AND NOT coalesce(p.notifications_disabled,false)
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.enqueue_mobile_whisper_push() FROM PUBLIC;
CREATE TRIGGER mobile_whisper_push AFTER INSERT ON public.secret_whispers
 FOR EACH ROW EXECUTE FUNCTION private.enqueue_mobile_whisper_push();

CREATE FUNCTION private.enqueue_mobile_session_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at AND NEW.status IS NOT DISTINCT FROM OLD.status
  AND NEW.location IS NOT DISTINCT FROM OLD.location AND NEW.title IS NOT DISTINCT FROM OLD.title THEN RETURN NEW; END IF;
 INSERT INTO public.mobile_push_jobs(user_id,token,kind,source_id,campaign_id,session_id)
 SELECT DISTINCT d.user_id,d.token,'session_changed',NEW.id::text || ':' || gen_random_uuid()::text,NEW.campaign_id,NEW.id
 FROM public.session_signups s JOIN public.mobile_push_devices d ON d.user_id=s.player_id
 JOIN public.profiles p ON p.id=d.user_id
 WHERE s.session_id=NEW.id AND s.status IN ('confirmed','approved','attended')
 AND d.enabled AND d.sessions AND NOT coalesce(p.notifications_disabled,false);
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.enqueue_mobile_session_push() FROM PUBLIC;
CREATE TRIGGER mobile_session_push AFTER UPDATE ON public.sessions
 FOR EACH ROW EXECUTE FUNCTION private.enqueue_mobile_session_push();

-- Only the trusted dispatcher can claim jobs. SKIP LOCKED prevents concurrent claim.
CREATE FUNCTION public.claim_mobile_push_jobs(p_limit integer DEFAULT 50) RETURNS SETOF public.mobile_push_jobs
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.mobile_push_jobs(user_id,token,kind,source_id,campaign_id,session_id)
 SELECT DISTINCT d.user_id,d.token,'session_reminder',s.id::text || ':' || s.scheduled_at::text,s.campaign_id,s.id
 FROM public.sessions s JOIN public.session_signups ss ON ss.session_id=s.id
 JOIN public.mobile_push_devices d ON d.user_id=ss.player_id JOIN public.profiles p ON p.id=d.user_id
 WHERE s.status='scheduled' AND s.scheduled_at > now() AND s.scheduled_at <= now()+interval '1 hour'
 AND ss.status IN ('confirmed','approved') AND d.enabled AND d.sessions AND NOT coalesce(p.notifications_disabled,false)
 ON CONFLICT DO NOTHING;
 -- Recover expired claims (Expo acceptance is at-least-once; a crash can cause duplicates).
 UPDATE public.mobile_push_jobs SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END
 WHERE status='sending' AND available_at < now();
 -- Bound retention and avoid old messages appearing days after reconnect.
 DELETE FROM public.mobile_push_jobs WHERE created_at < now()-interval '7 days';
 UPDATE public.mobile_push_jobs SET status='skipped' WHERE status='pending' AND created_at < now()-interval '24 hours';
 RETURN QUERY
 WITH candidates AS (
  SELECT id FROM public.mobile_push_jobs WHERE status='pending' AND available_at <= now()
  ORDER BY id FOR UPDATE SKIP LOCKED LIMIT greatest(1,least(p_limit,100))
 ) UPDATE public.mobile_push_jobs j SET status='sending',attempts=attempts+1,available_at=now()+interval '5 minutes'
 FROM candidates c WHERE j.id=c.id RETURNING j.*;
END; $$;
REVOKE ALL ON FUNCTION public.claim_mobile_push_jobs(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mobile_push_jobs(integer) TO service_role;

CREATE FUNCTION public.mobile_push_job_is_eligible(p_job_id bigint) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE j public.mobile_push_jobs; w public.secret_whispers; s public.sessions;
BEGIN
 SELECT * INTO j FROM public.mobile_push_jobs WHERE id=p_job_id;
 IF NOT FOUND THEN RETURN false; END IF;
 IF j.kind='whisper' THEN
  SELECT * INTO w FROM public.secret_whispers WHERE id=j.source_id::uuid;
  IF NOT FOUND OR w.receiver_id<>j.user_id THEN RETURN false; END IF;
  RETURN NOT EXISTS (SELECT 1 FROM public.whisper_user_blocks b
    WHERE (b.blocker_id=w.sender_id AND b.blocked_id=w.receiver_id) OR (b.blocker_id=w.receiver_id AND b.blocked_id=w.sender_id));
 END IF;
 SELECT * INTO s FROM public.sessions WHERE id=j.session_id;
 IF NOT FOUND THEN RETURN false; END IF;
 IF j.kind='session_reminder' AND (s.status<>'scheduled' OR s.scheduled_at<=now()
   OR j.source_id<>s.id::text || ':' || s.scheduled_at::text) THEN RETURN false; END IF;
 RETURN EXISTS (SELECT 1 FROM public.session_signups ss WHERE ss.session_id=j.session_id AND ss.player_id=j.user_id
   AND ss.status IN ('confirmed','approved','attended'));
END; $$;
REVOKE ALL ON FUNCTION public.mobile_push_job_is_eligible(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mobile_push_job_is_eligible(bigint) TO service_role;
