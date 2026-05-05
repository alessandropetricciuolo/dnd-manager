-- Keep campaign deletion destructive for campaign-owned sessions while still allowing
-- deliberately campaign-less calendar events.
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_campaign_id_fkey;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;

-- Open calendar events are visible to all authenticated players. They must never
-- carry GM-only notes because RLS policies apply to rows, not individual columns.
UPDATE public.sessions
SET gm_private_notes = NULL
WHERE campaign_id IS NULL
  AND gm_private_notes IS NOT NULL;

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_open_calendar_no_private_notes;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_open_calendar_no_private_notes
  CHECK (campaign_id IS NOT NULL OR gm_private_notes IS NULL);
