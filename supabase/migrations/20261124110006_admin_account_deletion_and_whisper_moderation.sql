-- Keep the completion receipt after the Auth user is removed.
ALTER TABLE public.account_deletion_requests
  DROP CONSTRAINT account_deletion_requests_user_id_fkey,
  ALTER COLUMN user_id DROP NOT NULL,
  ADD CONSTRAINT account_deletion_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN confirmation_email text,
  ADD COLUMN confirmation_claimed_at timestamptz,
  ADD COLUMN confirmation_sent_at timestamptz;

CREATE FUNCTION public.complete_barber_account_deletion(p_user_id uuid, p_admin_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_request_id uuid;
  v_table text;
  v_constraint text;
  v_storage_buckets text;
BEGIN
  IF p_user_id IS NULL OR p_admin_id IS NULL OR p_user_id = p_admin_id THEN
    RAISE EXCEPTION 'Seleziona un account diverso dal tuo.';
  END IF;

  PERFORM 1 FROM auth.users WHERE id = p_admin_id FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account amministratore non disponibile.';
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin' FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solo un admin attivo può completare la cancellazione.';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account già eliminato o non disponibile.';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF nullif(btrim(v_email), '') IS NULL THEN
    RAISE EXCEPTION 'L’account non ha un indirizzo email per la conferma.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.whisper_reports
    WHERE reviewed_at IS NULL AND (reporter_id = p_user_id OR reported_user_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'Chiudi le segnalazioni Whisper aperte per questo account prima di eliminarlo.';
  END IF;
  SELECT string_agg(b.bucket_id || ' (' || b.total || ')', ', ' ORDER BY b.bucket_id)
  INTO v_storage_buckets
  FROM (
    SELECT bucket_id, count(*) AS total FROM storage.objects
    WHERE owner_id = p_user_id::text GROUP BY bucket_id
  ) b;
  IF v_storage_buckets IS NOT NULL THEN
    RAISE EXCEPTION 'File da gestire nello Storage: %. Verifica quali eliminare o trasferire prima di riprovare.', v_storage_buckets;
  END IF;

  SELECT id INTO v_request_id FROM public.account_deletion_requests
  WHERE user_id = p_user_id AND status IN ('pending', 'in_progress')
  FOR UPDATE;

  IF v_request_id IS NULL THEN
    INSERT INTO public.account_deletion_requests (user_id, status)
    VALUES (p_user_id, 'in_progress')
    RETURNING id INTO v_request_id;
  END IF;

  UPDATE public.campaigns SET gm_id = p_admin_id WHERE gm_id = p_user_id;
  UPDATE public.sessions SET dm_id = p_admin_id WHERE dm_id = p_user_id;
  UPDATE public.characters SET assigned_to = NULL WHERE assigned_to = p_user_id;
  UPDATE public.gm_attachments SET uploaded_by = NULL WHERE uploaded_by = p_user_id;
  UPDATE public.access_grants SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.access_grants SET updated_by = NULL WHERE updated_by = p_user_id;
  UPDATE public.access_obligation_responses SET reopened_by = NULL WHERE reopened_by = p_user_id;
  UPDATE public.ai_budget_ledger_entries SET user_id = NULL WHERE user_id = p_user_id;
  UPDATE public.ai_budget_ledgers SET subscription_holder_user_id = NULL WHERE subscription_holder_user_id = p_user_id;

  -- The Auth row, campaign transfers and the queued email commit together.
  UPDATE public.account_deletion_requests
  SET status = 'completed', handled_at = now(), updated_at = now(),
      confirmation_email = v_email
  WHERE id = v_request_id;

  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN v_request_id;
EXCEPTION WHEN foreign_key_violation OR check_violation THEN
  GET STACKED DIAGNOSTICS v_table = TABLE_NAME, v_constraint = CONSTRAINT_NAME;
  RAISE EXCEPTION 'Cancellazione annullata. Verifica i riferimenti in % (%).', v_table, v_constraint;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_barber_account_deletion(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_barber_account_deletion(uuid, uuid) TO service_role;

ALTER TABLE public.whisper_reports
  ADD COLUMN review_outcome text CHECK (review_outcome IN ('dismissed', 'removed')),
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX whisper_reports_pending_idx ON public.whisper_reports (created_at) WHERE reviewed_at IS NULL;

-- Existing mobile clients may submit a report, but may not set administrator fields.
REVOKE INSERT ON public.whisper_reports FROM authenticated;
GRANT INSERT (reporter_id, reported_user_id, whisper_id, campaign_id, reason, details)
  ON public.whisper_reports TO authenticated;

CREATE FUNCTION public.remove_whisper_from_campaign_memory()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.campaign_memory_chunks
  WHERE campaign_id = OLD.campaign_id AND source_type = 'secret_whisper' AND source_id = OLD.id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_whisper_from_campaign_memory() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER whisper_remove_from_campaign_memory
  AFTER DELETE ON public.secret_whispers
  FOR EACH ROW EXECUTE FUNCTION public.remove_whisper_from_campaign_memory();

CREATE FUNCTION public.review_whisper_report(p_report_id uuid, p_admin_id uuid, p_remove boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_whisper_id uuid;
  v_campaign_id uuid;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin' FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solo un admin può gestire le segnalazioni.';
  END IF;

  SELECT whisper_id, campaign_id INTO v_whisper_id, v_campaign_id
  FROM public.whisper_reports WHERE id = p_report_id AND reviewed_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE public.whisper_reports
  SET reviewed_at = now(), reviewed_by = p_admin_id,
      review_outcome = CASE WHEN p_remove THEN 'removed' ELSE 'dismissed' END
  WHERE id = p_report_id;

  IF p_remove AND v_whisper_id IS NOT NULL THEN
    DELETE FROM public.secret_whispers WHERE id = v_whisper_id AND campaign_id = v_campaign_id;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.review_whisper_report(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_whisper_report(uuid, uuid, boolean) TO service_role;

CREATE TABLE public.whisper_rules_acceptances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whisper_rules_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whisper_rules_acceptances FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.accept_whisper_rules_v1()
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.whisper_rules_acceptances (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.accept_whisper_rules_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_whisper_rules_v1() TO authenticated;

CREATE FUNCTION public.has_whisper_rules_v1()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.whisper_rules_acceptances WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.has_whisper_rules_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_whisper_rules_v1() TO authenticated;

CREATE FUNCTION public.require_whisper_rules_v1()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.whisper_rules_acceptances WHERE user_id = NEW.sender_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'BW001', MESSAGE = 'Accetta le regole di Whisper prima di inviare.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.require_whisper_rules_v1() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER whisper_require_rules_v1
  BEFORE INSERT ON public.secret_whispers
  FOR EACH ROW EXECUTE FUNCTION public.require_whisper_rules_v1();
