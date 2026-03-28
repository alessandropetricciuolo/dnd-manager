-- Fase 1 Epoch (West Marches): tempo vissuto in ore, per personaggio.
-- Eseguibile anche dal pannello SQL Supabase (stesso contenuto sotto).

ALTER TABLE public.campaign_characters
  ADD COLUMN IF NOT EXISTS time_offset_hours integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.campaign_characters.time_offset_hours IS
  'Ore di timeline vissute dal PG; incrementate a chiusura sessione per i presenti, override GM possibile.';
