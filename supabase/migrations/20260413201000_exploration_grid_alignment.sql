-- Overlay griglia FoW: offset per-mappa (in celle) + modalità futura hex.
ALTER TABLE public.campaign_exploration_maps
  ADD COLUMN IF NOT EXISTS grid_offset_x_cells NUMERIC(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grid_offset_y_cells NUMERIC(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grid_kind TEXT NOT NULL DEFAULT 'square';

ALTER TABLE public.campaign_exploration_maps
  DROP CONSTRAINT IF EXISTS campaign_exploration_maps_grid_kind_check;

ALTER TABLE public.campaign_exploration_maps
  ADD CONSTRAINT campaign_exploration_maps_grid_kind_check
  CHECK (grid_kind IN ('square', 'hex'));
