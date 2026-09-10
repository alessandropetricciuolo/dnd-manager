export type AdminOnlyTransitionIntent = "none" | "protect" | "release";

export function resolveAdminOnlyTransition(input: {
  currentAdminOnly: boolean;
  protect: boolean;
  release: boolean;
}): { ok: true; intent: AdminOnlyTransitionIntent; nextAdminOnly: boolean } | { ok: false; reason: "conflicting_intent" | "release_requires_protected" } {
  if (input.protect && input.release) return { ok: false, reason: "conflicting_intent" };
  if (input.release && !input.currentAdminOnly) return { ok: false, reason: "release_requires_protected" };
  if (input.release) return { ok: true, intent: "release", nextAdminOnly: false };
  if (input.protect && !input.currentAdminOnly) return { ok: true, intent: "protect", nextAdminOnly: true };
  return { ok: true, intent: "none", nextAdminOnly: input.currentAdminOnly };
}
