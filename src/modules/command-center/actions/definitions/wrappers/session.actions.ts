import { createSession, updateSession, closeSessionAction } from "@/app/campaigns/actions";
import type { ActionContext } from "../../../types/actions";
import { registerAction } from "../../registry";

async function buildMinimalClosePayload(
  ctx: ActionContext,
  sessionId: string,
  input: {
    summary: string;
    gmPrivateNotes?: string | null;
    xpGained?: number;
    elapsedHours?: number;
  }
) {
  const { data: signups } = await ctx.supabase
    .from("session_signups")
    .select("player_id")
    .eq("session_id", sessionId);

  const attendance: Record<string, "attended" | "absent"> = {};
  for (const row of signups ?? []) {
    const pid = (row as { player_id: string }).player_id;
    if (pid) attendance[pid] = "attended";
  }

  return {
    attendance,
    xpGained: input.xpGained ?? 0,
    unlockContent: false,
    unlockContentIds: [] as { id: string; type: "wiki" | "map" }[],
    summary: input.summary,
    gm_private_notes: input.gmPrivateNotes ?? null,
    entityStatusUpdates: {} as Record<string, "alive" | "dead" | "missing">,
    elapsedHours: input.elapsedHours ?? 0,
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
    description: "Chiude una sessione programmata (modalità semplificata)",
    category: "session",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const sessionId = typeof o.sessionId === "string" ? o.sessionId.trim() : "";
      const summary = typeof o.summary === "string" ? o.summary.trim() : "";
      if (!sessionId) return { ok: false, error: "ID sessione obbligatorio." };
      if (!summary) return { ok: false, error: "Riassunto sessione obbligatorio." };
      return {
        ok: true,
        data: {
          sessionId,
          summary,
          gmPrivateNotes:
            typeof o.gmPrivateNotes === "string"
              ? o.gmPrivateNotes
              : typeof o.gm_private_notes === "string"
                ? o.gm_private_notes
                : null,
          xpGained: typeof o.xpGained === "number" ? o.xpGained : 0,
          elapsedHours: typeof o.elapsedHours === "number" ? o.elapsedHours : 0,
        },
      };
    },
    preview: async (_ctx, input) => ({
      sessionId: input.sessionId,
      summary: input.summary.slice(0, 240),
      xpGained: input.xpGained,
      mode: "minimal_close",
    }),
    execute: async (ctx, input) => {
      const payload = await buildMinimalClosePayload(ctx, input.sessionId, input);
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
