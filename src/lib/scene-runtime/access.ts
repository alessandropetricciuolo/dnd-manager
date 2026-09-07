export type SceneWorkspaceRole = "admin" | "gm" | "player" | string | null | undefined;

/** Server-side role gate shared by the R6.3 loader/action boundary. */
export function canManageTacticalScene(role: SceneWorkspaceRole): boolean {
  return role === "gm" || role === "admin";
}
