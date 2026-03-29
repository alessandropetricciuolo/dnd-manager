-- Fase 2 West Marches: griglia mondo (1 quadretto = 100 km = 10 h) + portali fast travel.
-- Eseguibile anche dal pannello SQL Supabase (stesso contenuto sotto).

ALTER TABLE public.campaign_characters
  ADD COLUMN IF NOT EXISTS pos_x_grid integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pos_y_grid integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.campaign_characters.pos_x_grid IS
  'Coordinate cartesiane sulla griglia campagna (scala mondo).';
COMMENT ON COLUMN public.campaign_characters.pos_y_grid IS
  'Coordinate cartesiane sulla griglia campagna (scala mondo).';

CREATE TABLE public.portals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  pos_x_grid integer NOT NULL,
  pos_y_grid integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX portals_campaign_id_idx ON public.portals (campaign_id);

ALTER TABLE public.portals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portals visible to campaign participants"
  ON public.portals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = portals.campaign_id
      AND (
        c.gm_id = auth.uid()
        OR c.is_public
        OR EXISTS (
          SELECT 1 FROM public.campaign_members cm
          WHERE cm.campaign_id = c.id AND cm.player_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "GM and Admin can manage portals"
  ON public.portals FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin());
