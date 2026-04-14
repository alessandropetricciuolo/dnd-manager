-- Calibrazione griglia per-mappa: passo asse Y in pixel sorgente.
ALTER TABLE public.campaign_exploration_maps
  ADD COLUMN IF NOT EXISTS grid_source_cell_px_y NUMERIC(10,4);
