-- RPC: true se il giocatore ha partecipato ad almeno una sessione della campagna (status = attended)
-- Drop prima di ricreare: PostgreSQL non permette di cambiare i nomi dei parametri con CREATE OR REPLACE
DROP FUNCTION IF EXISTS public.has_played_campaign(UUID, UUID);

CREATE OR REPLACE FUNCTION public.has_played_campaign(p_user_id UUID, p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM session_signups ss
    JOIN sessions s ON s.id = ss.session_id
    WHERE s.campaign_id = p_campaign_id
      AND ss.player_id = p_user_id
      AND ss.status = 'attended'
    LIMIT 1
  );
$$;

COMMENT ON FUNCTION public.has_played_campaign(UUID, UUID) IS 'True if the player has attended at least one session of the campaign.';
