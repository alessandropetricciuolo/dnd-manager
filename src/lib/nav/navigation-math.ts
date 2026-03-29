import type { Database } from "@/types/database.types";

/** Regola GM: 1 quadretto di distanza in linea d'aria = 10 ore di viaggio. */
export const HOURS_PER_GRID_SQUARE = 10;

export type Portal = Database["public"]["Tables"]["portals"]["Row"];

export type NearestPortalResult = {
  nearestPortal: Portal | null;
  distSquares: number;
  travelHours: number;
};

function euclideanDistanceSq(
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * Portale più vicino (Pitagora in quadretti). Usabile lato client.
 */
export function computeNearestPortalLocal(
  portals: Portal[],
  playerPosX: number,
  playerPosY: number
): NearestPortalResult {
  if (portals.length === 0) {
    return {
      nearestPortal: null,
      distSquares: 0,
      travelHours: 0,
    };
  }

  let best: Portal = portals[0];
  let bestDistSq = euclideanDistanceSq(
    playerPosX,
    playerPosY,
    best.pos_x_grid,
    best.pos_y_grid
  );

  for (let i = 1; i < portals.length; i++) {
    const p = portals[i];
    const dSq = euclideanDistanceSq(
      playerPosX,
      playerPosY,
      p.pos_x_grid,
      p.pos_y_grid
    );
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      best = p;
    }
  }

  const distSquares = Math.sqrt(bestDistSq);
  const travelHours = distSquares * HOURS_PER_GRID_SQUARE;

  return {
    nearestPortal: best,
    distSquares,
    travelHours,
  };
}
