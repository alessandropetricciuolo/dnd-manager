-- Snapshot initiative tracker per visualizzazione sul telecomando.
ALTER TABLE public.gm_remote_sessions
  ADD COLUMN IF NOT EXISTS initiative_snapshot JSONB;

COMMENT ON COLUMN public.gm_remote_sessions.initiative_snapshot IS
  'Ultimo stato initiative tracker pubblicato dal GM screen per il telecomando.';
