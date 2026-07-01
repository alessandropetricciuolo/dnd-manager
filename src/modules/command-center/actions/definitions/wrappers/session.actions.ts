import { createSession } from "@/app/campaigns/actions";
import { registerAction } from "../../registry";

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
}
