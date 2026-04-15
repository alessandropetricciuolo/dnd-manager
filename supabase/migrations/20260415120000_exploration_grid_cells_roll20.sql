-- Roll20-style grid: map dimensions in grid cells (width × height on the image).
ALTER TABLE public.campaign_exploration_maps
  ADD COLUMN IF NOT EXISTS grid_cells_w NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS grid_cells_h NUMERIC(12, 4);

COMMENT ON COLUMN public.campaign_exploration_maps.grid_cells_w IS
  'Number of printed grid squares across the map image (width), for overlay alignment.';
COMMENT ON COLUMN public.campaign_exploration_maps.grid_cells_h IS
  'Number of printed grid squares along the map image (height), for overlay alignment.';
