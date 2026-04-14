-- Calibrazione griglia per-mappa (2 punti): dimensione cella in pixel sorgente immagine.
ALTER TABLE public.campaign_exploration_maps
  ADD COLUMN IF NOT EXISTS grid_source_cell_px NUMERIC(10,4);
