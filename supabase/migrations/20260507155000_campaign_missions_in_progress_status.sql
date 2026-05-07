-- Missioni: aggiunge lo stato "in_progress" per distinguere missioni in corso.
-- open = accettabile, in_progress = in corso, completed = non accettabile/completata.

ALTER TABLE public.campaign_missions
  DROP CONSTRAINT IF EXISTS campaign_missions_status_check;

ALTER TABLE public.campaign_missions
  ADD CONSTRAINT campaign_missions_status_check
  CHECK (status IN ('open', 'in_progress', 'completed'));

COMMENT ON COLUMN public.campaign_missions.status IS 'open | in_progress | completed';
