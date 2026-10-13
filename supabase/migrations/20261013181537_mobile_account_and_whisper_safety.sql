-- Account deletion requests are queued for manual review; this does not delete
-- auth.users or application data automatically.
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_at TIMESTAMPTZ,
  handling_notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_one_open_request_per_user
  ON public.account_deletion_requests(user_id)
  WHERE status IN ('pending', 'in_progress');

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_requests FROM anon, authenticated;
COMMENT ON TABLE public.account_deletion_requests IS
  'Richieste di cancellazione account da gestire manualmente; nessuna cancellazione automatica.';

CREATE TABLE IF NOT EXISTS public.whisper_user_blocks (
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT whisper_user_blocks_no_self CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.whisper_user_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whisper_user_blocks FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.whisper_user_blocks TO authenticated;
GRANT ALL ON TABLE public.account_deletion_requests, public.whisper_user_blocks TO service_role;

CREATE POLICY whisper_user_blocks_select_own
  ON public.whisper_user_blocks FOR SELECT TO authenticated
  USING ((select auth.uid()) = blocker_id);
CREATE POLICY whisper_user_blocks_insert_own
  ON public.whisper_user_blocks FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = blocker_id
    AND EXISTS (
      SELECT 1 FROM public.secret_whispers w
      WHERE w.campaign_id IS NOT NULL
        AND ((w.sender_id = blocker_id AND w.receiver_id = blocked_id)
          OR (w.sender_id = blocked_id AND w.receiver_id = blocker_id))
    )
  );
CREATE POLICY whisper_user_blocks_delete_own
  ON public.whisper_user_blocks FOR DELETE TO authenticated
  USING ((select auth.uid()) = blocker_id);

CREATE TABLE IF NOT EXISTS public.whisper_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  whisper_id UUID REFERENCES public.secret_whispers(id) ON DELETE SET NULL,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 80),
  details TEXT CHECK (details IS NULL OR length(details) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whisper_reports_no_self CHECK (reporter_id <> reported_user_id)
);

ALTER TABLE public.whisper_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whisper_reports FROM anon, authenticated;
GRANT INSERT ON public.whisper_reports TO authenticated;
GRANT ALL ON TABLE public.whisper_reports TO service_role;
CREATE POLICY whisper_reports_insert_participant
  ON public.whisper_reports FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = reporter_id
    AND EXISTS (
      SELECT 1 FROM public.secret_whispers w
      WHERE w.id = whisper_reports.whisper_id
        AND w.campaign_id = whisper_reports.campaign_id
        AND ((w.sender_id = whisper_reports.reporter_id AND w.receiver_id = whisper_reports.reported_user_id)
          OR (w.sender_id = whisper_reports.reported_user_id AND w.receiver_id = whisper_reports.reporter_id))
    )
  );

-- Private lookup supports reciprocal-block enforcement without exposing the
-- other party's block list to the authenticated user.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE OR REPLACE FUNCTION private.is_whisper_blocked(p_actor UUID, p_other UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN auth.uid() IS DISTINCT FROM p_actor AND auth.uid() IS DISTINCT FROM p_other THEN TRUE
    ELSE EXISTS (
      SELECT 1 FROM public.whisper_user_blocks b
      WHERE (b.blocker_id = p_actor AND b.blocked_id = p_other)
         OR (b.blocker_id = p_other AND b.blocked_id = p_actor)
    )
  END;
$$;
REVOKE ALL ON FUNCTION private.is_whisper_blocked(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_whisper_blocked(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS secret_whispers_insert ON public.secret_whispers;
CREATE POLICY secret_whispers_insert
  ON public.secret_whispers FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = sender_id
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.gm_id = sender_id OR c.gm_id = receiver_id)
    )
    AND NOT private.is_whisper_blocked(sender_id, receiver_id)
  );
