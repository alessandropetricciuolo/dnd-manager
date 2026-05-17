-- Snapshot pad SFX per telecomando (icone allineate al GM screen).

ALTER TABLE public.gm_remote_sessions
  ADD COLUMN IF NOT EXISTS sfx_pad_snapshot JSONB;

COMMENT ON COLUMN public.gm_remote_sessions.sfx_pad_snapshot IS
  'Icone ed etichette pad SFX 0..11 pubblicate dal GM screen per il telecomando.';
