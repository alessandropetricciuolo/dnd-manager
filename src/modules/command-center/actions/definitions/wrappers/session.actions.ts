import { createSession, updateSession, closeSessionAction } from "@/app/campaigns/actions";
import type { SessionEconomyPayload } from "@/lib/actions/campaign-economy-actions";
import { registerAction } from "../../registry";

function parseAttendance(
  raw: unknown
): Record<string, "attended" | "absent"> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, "attended" | "absent"> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== "string" || !key.trim()) continue;
    if (value === "attended" || value === "absent") {
      out[key.trim()] = value;
    }
  }
  return Object.keys(out).length ? out : null;
}

function parseEntityStatusUpdates(
  raw: unknown
): Record<string, "alive" | "dead" | "missing"> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, "alive" | "dead" | "missing"> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== "string" || !key.trim()) continue;
    if (value === "alive" || value === "dead" || value === "missing") {
      out[key.trim()] = value;
    }
  }
  return out;
}

function parseUnlockContentIds(
  raw: unknown
): { id: string; type: "wiki" | "map" }[] {
  if (!Array.isArray(raw)) return [];
  const out: { id: string; type: "wiki" | "map" }[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const type = o.type === "map" ? "map" : o.type === "wiki" ? "wiki" : null;
    if (id && type) out.push({ id, type });
  }
  return out;
}

function parsePerPlayerXpAwards(
  raw: unknown
): { playerId: string; xp: number }[] {
  if (!Array.isArray(raw)) return [];
  const out: { playerId: string; xp: number }[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const playerId =
      typeof o.playerId === "string"
        ? o.playerId.trim()
        : typeof o.player_id === "string"
          ? o.player_id.trim()
          : "";
    const xp =
      typeof o.xp === "number" && Number.isFinite(o.xp)
        ? Math.max(0, Math.trunc(o.xp))
        : 0;
    if (playerId && xp > 0) out.push({ playerId, xp });
  }
  return out;
}

function parseEconomy(raw: unknown): SessionEconomyPayload | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  return raw as SessionEconomyPayload;
}

type SessionCloseValidated = {
  sessionId: string;
  summary: string;
  gmPrivateNotes: string | null;
  xpGained: number;
  perPlayerXpAwards: { playerId: string; xp: number }[];
  elapsedHours: number;
  attendance: Record<string, "attended" | "absent">;
  unlockContent: boolean;
  unlockContentIds: { id: string; type: "wiki" | "map" }[];
  entityStatusUpdates: Record<string, "alive" | "dead" | "missing">;
  economy?: SessionEconomyPayload;
};

function validateSessionCloseInput(
  input: Record<string, unknown>
): { ok: true; data: SessionCloseValidated } | { ok: false; error: string } {
  const sessionId = typeof input.sessionId === "string" ? input.sessionId.trim() : "";
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  if (!sessionId) return { ok: false, error: "ID sessione obbligatorio." };
  if (!summary) return { ok: false, error: "Riassunto sessione obbligatorio." };

  const attendance = parseAttendance(input.attendance);
  if (!attendance) {
    return { ok: false, error: "Presenze obbligatorie (attendance)." };
  }

  return {
    ok: true,
    data: {
      sessionId,
      summary,
      gmPrivateNotes:
        typeof input.gmPrivateNotes === "string"
          ? input.gmPrivateNotes
          : typeof input.gm_private_notes === "string"
            ? input.gm_private_notes
            : null,
      xpGained:
        typeof input.xpGained === "number" && Number.isFinite(input.xpGained)
          ? Math.max(0, Math.trunc(input.xpGained))
          : 0,
      perPlayerXpAwards: parsePerPlayerXpAwards(
        input.perPlayerXpAwards ?? input.per_player_xp_awards
      ),
      elapsedHours:
        typeof input.elapsedHours === "number" && Number.isFinite(input.elapsedHours)
          ? Math.max(0, Math.trunc(input.elapsedHours))
          : 0,
      attendance,
      unlockContent: input.unlockContent === true || input.unlock_content === true,
      unlockContentIds: parseUnlockContentIds(
        input.unlockContentIds ?? input.unlock_content_ids
      ),
      entityStatusUpdates: parseEntityStatusUpdates(
        input.entityStatusUpdates ?? input.entity_status_updates
      ),
      economy: parseEconomy(input.economy),
    },
  };
}

export function registerSessionWrapperActions(): void {
  registerAction({
    name: "session.create",
    description: "Crea una sessione in campagna",
    category: "session",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      if (typeof o.campaignId !== "string" || !o.campaignId.trim()) {
        return { ok: false, error: "Campagna obbligatoria." };
      }
      if (typeof o.date !== "string" || !o.date.trim()) {
        return { ok: false, error: "Data obbligatoria." };
      }
      return {
        ok: true,
        data: {
          campaignId: o.campaignId.trim(),
          date: o.date.trim(),
          time: typeof o.time === "string" && o.time.trim() ? o.time.trim() : "20:00",
          location: typeof o.location === "string" ? o.location : "",
          maxPlayers: typeof o.maxPlayers === "number" ? o.maxPlayers : 6,
          dmId: typeof o.dmId === "string" && o.dmId.trim() ? o.dmId.trim() : null,
          partyId: typeof o.partyId === "string" && o.partyId.trim() ? o.partyId.trim() : null,
          chapterTitle:
            typeof o.chapterTitle === "string" && o.chapterTitle.trim()
              ? o.chapterTitle.trim()
              : null,
        },
      };
    },
    preview: async (_ctx, input) => ({
      campaignId: input.campaignId,
      scheduledAt: `${input.date} ${input.time}`,
      location: input.location,
      maxPlayers: input.maxPlayers,
      chapterTitle: input.chapterTitle,
    }),
    execute: async (_ctx, input) => {
      const fd = new FormData();
      fd.set("date", input.date);
      fd.set("time", input.time);
      fd.set("location", input.location);
      fd.set("max_players", String(input.maxPlayers));
      if (input.dmId) fd.set("dm_id", input.dmId);
      if (input.partyId) fd.set("party_id", input.partyId);
      if (input.chapterTitle) fd.set("chapter_title", input.chapterTitle);

      const result = await createSession(input.campaignId, fd);
      if (!result.success) throw new Error(result.message);
      return {
        campaignId: input.campaignId,
        message: result.message,
      };
    },
    auditEntity: (input) => ({
      entityType: "campaign",
      entityId: input.campaignId,
    }),
    revalidatePaths: (input) => [`/campaigns/${input.campaignId}`, "/command-center"],
  });

  registerAction({
    name: "session.update",
    description: "Aggiorna titolo, riassunto o note GM private di una sessione",
    category: "session",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const sessionId = typeof o.sessionId === "string" ? o.sessionId.trim() : "";
      if (!sessionId) return { ok: false, error: "ID sessione obbligatorio." };
      return {
        ok: true,
        data: {
          sessionId,
          title: typeof o.title === "string" ? o.title.trim() || null : undefined,
          sessionSummary:
            typeof o.sessionSummary === "string"
              ? o.sessionSummary
              : typeof o.session_summary === "string"
                ? o.session_summary
                : undefined,
          gmPrivateNotes:
            typeof o.gmPrivateNotes === "string"
              ? o.gmPrivateNotes
              : typeof o.gm_private_notes === "string"
                ? o.gm_private_notes
                : undefined,
        },
      };
    },
    preview: async (_ctx, input) => ({
      sessionId: input.sessionId,
      title: input.title,
      sessionSummary: input.sessionSummary?.slice(0, 200),
      gmPrivateNotes: input.gmPrivateNotes?.slice(0, 120),
    }),
    execute: async (_ctx, input) => {
      const result = await updateSession(input.sessionId, {
        title: input.title,
        session_summary: input.sessionSummary,
        gm_private_notes: input.gmPrivateNotes,
      });
      if (!result.success) throw new Error(result.message);
      return { sessionId: input.sessionId, campaignId: result.campaignId };
    },
    auditEntity: (input) => ({
      entityType: "session",
      entityId: input.sessionId,
    }),
    revalidatePaths: (_input, result) =>
      result.campaignId
        ? [`/campaigns/${result.campaignId}`, "/command-center"]
        : ["/command-center"],
  });

  registerAction({
    name: "session.close",
    description: "Chiude una sessione programmata con debrief completo (presenze, XP, mondo, sblocchi)",
    category: "session",
    validate: (input) => {
      const parsed = validateSessionCloseInput(input as Record<string, unknown>);
      if (!parsed.ok) return parsed;
      return { ok: true, data: parsed.data };
    },
    preview: async (_ctx, input) => ({
      sessionId: input.sessionId,
      summary: input.summary.slice(0, 320),
      xpGained: input.xpGained,
      elapsedHours: input.elapsedHours,
      attendanceCount: Object.keys(input.attendance).length,
      presentCount: Object.values(input.attendance).filter((s) => s === "attended").length,
      unlockCount: input.unlockContentIds.length,
      entityUpdateCount: Object.keys(input.entityStatusUpdates).length,
      hasEconomy: Boolean(input.economy),
      mode: "full_close",
    }),
    execute: async (_ctx, input) => {
      const payload = {
        attendance: input.attendance,
        xpGained: input.xpGained,
        perPlayerXpAwards: input.perPlayerXpAwards.length
          ? input.perPlayerXpAwards
          : undefined,
        unlockContent: input.unlockContent && input.unlockContentIds.length > 0,
        unlockContentIds: input.unlockContentIds,
        summary: input.summary,
        gm_private_notes: input.gmPrivateNotes,
        entityStatusUpdates: input.entityStatusUpdates,
        elapsedHours: input.elapsedHours,
        economy: input.economy,
      };
      const result = await closeSessionAction(input.sessionId, payload);
      if (!result.success) throw new Error(result.message);
      return { sessionId: input.sessionId, campaignId: result.campaignId };
    },
    auditEntity: (input) => ({
      entityType: "session",
      entityId: input.sessionId,
    }),
    revalidatePaths: (_input, result) =>
      result.campaignId
        ? [`/campaigns/${result.campaignId}`, "/command-center"]
        : ["/command-center"],
  });
}
