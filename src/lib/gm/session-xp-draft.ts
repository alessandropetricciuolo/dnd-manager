import { z } from "zod";

export const sessionXpDraftSchema = z.object({
  attendance: z.record(z.string().uuid(), z.enum(["attended", "absent"])),
  xpGained: z.number().int().min(0).max(2147483647),
  perPlayerXpAwards: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        xp: z.number().int().min(0).max(2147483647),
      }),
    )
    .max(100),
  snapshot: z.record(z.string(), z.unknown()).optional(),
});
export type SessionXpDraft = z.infer<typeof sessionXpDraftSchema>;
export type SessionXpDraftRead = {
  draft: SessionXpDraft | null;
  revision: number;
  status: string;
};

/** Zero and an explicit empty list are values, never requests to reuse an old draft. */
export function resolveXpPayload(
  payload: {
    xpGained: number;
    perPlayerXpAwards?: { playerId: string; xp: number }[];
  },
  persisted?: { xpGained?: number | null; perPlayerXpAwards?: unknown },
) {
  return {
    xpGained: Math.max(0, Math.floor(payload.xpGained)),
    perPlayerXpAwards:
      payload.perPlayerXpAwards ??
      (Array.isArray(persisted?.perPlayerXpAwards)
        ? (persisted.perPlayerXpAwards as { playerId: string; xp: number }[])
        : []),
  };
}
