import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  computeNearestPortalLocal,
  type NearestPortalResult,
  type Portal,
} from "./navigation-math";

export {
  computeNearestPortalLocal,
  HOURS_PER_GRID_SQUARE,
  type NearestPortalResult,
  type Portal,
} from "./navigation-math";

/**
 * Carica i portali della campagna e calcola il fast travel più vicino (distanza euclidea in quadretti).
 * Se non ci sono portali, `nearestPortal` è null e distanza/ore sono 0.
 */
export async function calculateNearestPortal(
  campaignId: string,
  playerPosX: number,
  playerPosY: number
): Promise<NearestPortalResult> {
  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("portals")
    .select("*")
    .eq("campaign_id", campaignId);

  if (error) {
    throw new Error(error.message);
  }

  const portals = (rows ?? []) as Portal[];
  return computeNearestPortalLocal(portals, playerPosX, playerPosY);
}
