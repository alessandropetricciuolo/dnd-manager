-- Replace imported FoW regions atomically so a failed insert cannot wipe a map.

CREATE OR REPLACE FUNCTION public.replace_exploration_map_fow_regions(
  p_campaign_id uuid,
  p_map_id uuid,
  p_regions jsonb,
  p_grid_cells_w numeric,
  p_grid_cells_h numeric,
  p_grid_offset_x_cells numeric,
  p_grid_offset_y_cells numeric
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF jsonb_typeof(p_regions) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'FoW regions payload must be an array';
  END IF;

  PERFORM 1
  FROM public.campaign_exploration_maps
  WHERE id = p_map_id
    AND campaign_id = p_campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exploration map not found for campaign';
  END IF;

  DELETE FROM public.campaign_exploration_fow_regions
  WHERE map_id = p_map_id;

  INSERT INTO public.campaign_exploration_fow_regions (
    map_id,
    polygon,
    is_revealed,
    sort_order
  )
  SELECT
    p_map_id,
    region.polygon,
    false,
    region.sort_order
  FROM jsonb_to_recordset(p_regions) AS region(
    polygon jsonb,
    sort_order integer
  );

  UPDATE public.campaign_exploration_maps
  SET
    grid_cells_w = p_grid_cells_w,
    grid_cells_h = p_grid_cells_h,
    grid_offset_x_cells = p_grid_offset_x_cells,
    grid_offset_y_cells = p_grid_offset_y_cells,
    grid_source_cell_px = NULL,
    updated_at = NOW()
  WHERE id = p_map_id
    AND campaign_id = p_campaign_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_exploration_map_fow_regions(
  uuid,
  uuid,
  jsonb,
  numeric,
  numeric,
  numeric,
  numeric
) TO authenticated;
