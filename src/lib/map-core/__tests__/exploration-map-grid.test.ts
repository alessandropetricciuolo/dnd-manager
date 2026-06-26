import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hasGridCalibration,
  mapSourceLabel,
  resolveExplorationMapGridOverlay,
} from "@/lib/exploration/exploration-map-grid";

const baseMap = {
  grid_cells_w: 20,
  grid_cells_h: 15,
  grid_source_cell_px: null,
  grid_offset_x_cells: 0,
  grid_offset_y_cells: 0,
  grid_kind: "square" as const,
  source_type: "uploaded_image" as const,
};

describe("resolveExplorationMapGridOverlay", () => {
  it("shows grid when cells and natural size are known", () => {
    const props = resolveExplorationMapGridOverlay(baseMap, 2000, 1500);
    assert.equal(props.showGrid, true);
    assert.ok(props.gridCellSourcePxX && props.gridCellSourcePxX > 2);
  });

  it("uses legacy cell px without natural dimensions", () => {
    const props = resolveExplorationMapGridOverlay(
      {
        ...baseMap,
        grid_cells_w: null,
        grid_cells_h: null,
        grid_source_cell_px: 100,
      },
      0,
      0
    );
    assert.equal(props.showGrid, true);
    assert.equal(props.gridCellSourcePxX, 100);
  });

  it("hides grid for hex kind", () => {
    const props = resolveExplorationMapGridOverlay(
      { ...baseMap, grid_kind: "hex" },
      2000,
      1500
    );
    assert.equal(props.showGrid, false);
  });

  it("respects enabled=false", () => {
    const props = resolveExplorationMapGridOverlay(baseMap, 2000, 1500, { enabled: false });
    assert.equal(props.showGrid, false);
  });
});

describe("mapSourceLabel", () => {
  it("labels generated vs uploaded", () => {
    assert.equal(mapSourceLabel("generated_scene"), "Generata");
    assert.equal(mapSourceLabel("uploaded_image"), "Importata");
  });
});

describe("hasGridCalibration", () => {
  it("detects roll20 cells", () => {
    assert.equal(hasGridCalibration(baseMap), true);
  });
});
