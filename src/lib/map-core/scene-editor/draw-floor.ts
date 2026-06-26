import type { SceneFloorV1 } from "../scene-schema";
import { paintSceneFloorDs } from "./ds-renderer";

export type EditorDrawOptions = {
  selectedAreaId?: string | null;
  selectedWallId?: string | null;
  selectedPropId?: string | null;
  selectedGmNoteId?: string | null;
  draftRect?: { x: number; y: number; w: number; h: number } | null;
  draftCorridor?: Array<{ x: number; y: number }> | null;
  activeLayerId?: string | null;
};

export function paintSceneFloorEditor(
  ctx: CanvasRenderingContext2D,
  floor: SceneFloorV1,
  options: EditorDrawOptions = {}
) {
  paintSceneFloorDs(ctx, floor, options);
}
