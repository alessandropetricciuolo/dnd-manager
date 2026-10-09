export type CampaignTabRequest = "sessioni" | "wiki" | "mappe" | "missioni" | "pg" | "gm" | null;

export function shouldResolvePlayerDefaultTab(
  requestedTab: CampaignTabRequest,
  isGmOrAdmin: boolean,
  showMissionsTab: boolean,
  showMappeTab: boolean
): boolean {
  if (isGmOrAdmin) return false;
  return (
    requestedTab === null ||
    requestedTab === "gm" ||
    (requestedTab === "missioni" && !showMissionsTab) ||
    (requestedTab === "mappe" && !showMappeTab)
  );
}

export function getCampaignDefaultTab(
  isGmOrAdmin: boolean,
  hasAssignedCharacter: boolean
): "sessioni" | "pg" {
  return isGmOrAdmin || !hasAssignedCharacter ? "sessioni" : "pg";
}
