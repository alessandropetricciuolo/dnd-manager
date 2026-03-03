-- Permetti pin senza link (solo label/tooltip)
ALTER TABLE map_pins DROP CONSTRAINT IF EXISTS link_target;
