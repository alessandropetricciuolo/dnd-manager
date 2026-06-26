/** Note GM in overlay runtime (coordinate normalizzate 0–1). */

export type GmNoteOverlayVm = {
  id: string;
  normX: number;
  normY: number;
  text: string;
  /** Larghezza box in frazione della larghezza immagine (default ~0.12). */
  widthNorm?: number;
};

export function sceneGmNotesToOverlay(
  notes: Array<{ id: string; x: number; y: number; text: string; width?: number }>,
  floorWidth: number,
  floorHeight: number
): GmNoteOverlayVm[] {
  if (floorWidth <= 0 || floorHeight <= 0) return [];
  return notes.map((n) => ({
    id: n.id,
    normX: n.x / floorWidth,
    normY: n.y / floorHeight,
    text: n.text,
    widthNorm: n.width ? n.width / floorWidth : undefined,
  }));
}
