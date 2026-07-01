import { createMissionAction, updateMissionAction } from "@/lib/actions/mission-actions";
import { registerAction } from "../../registry";

function parseMissionFields(o: Record<string, unknown>, requireId = false) {
  const campaignId = typeof o.campaignId === "string" ? o.campaignId.trim() : "";
  const missionId = typeof o.missionId === "string" ? o.missionId.trim() : "";
  const grade = typeof o.grade === "string" ? o.grade.trim() : "";
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const committente = typeof o.committente === "string" ? o.committente.trim() : "";
  const ubicazione = typeof o.ubicazione === "string" ? o.ubicazione.trim() : "";
  const paga = typeof o.paga === "string" ? o.paga.trim() : "";
  const urgenza = typeof o.urgenza === "string" ? o.urgenza.trim() : "";
  const description = typeof o.description === "string" ? o.description.trim() : "";
  const pointsReward =
    typeof o.pointsReward === "number"
      ? o.pointsReward
      : typeof o.points_reward === "number"
        ? o.points_reward
        : 0;

  if (!campaignId || !grade || !title || !committente || !ubicazione || !paga || !urgenza || !description) {
    return { ok: false as const, error: "Compila tutti i campi missione obbligatori." };
  }
  if (requireId && !missionId) {
    return { ok: false as const, error: "ID missione obbligatorio." };
  }

  return {
    ok: true as const,
    data: {
      campaignId,
      missionId,
      grade,
      title,
      committente,
      ubicazione,
      paga,
      urgenza,
      description,
      pointsReward,
    },
  };
}

export function registerMissionWrapperActions(): void {
  registerAction({
    name: "mission.create",
    description: "Crea una missione nella bacheca gilda",
    category: "campaign",
    validate: (input) => parseMissionFields(input as Record<string, unknown>),
    preview: async (_ctx, input) => ({
      campaignId: input.campaignId,
      grade: input.grade,
      title: input.title,
      committente: input.committente,
      ubicazione: input.ubicazione,
      description: input.description.slice(0, 160),
    }),
    execute: async (_ctx, input) => {
      const result = await createMissionAction(
        input.campaignId,
        input.grade,
        input.title,
        input.committente,
        input.ubicazione,
        input.paga,
        input.urgenza,
        input.description,
        input.pointsReward
      );
      if (!result.success) throw new Error(result.message);
      return { campaignId: input.campaignId, title: input.title };
    },
    auditEntity: (input) => ({
      entityType: "campaign",
      entityId: input.campaignId,
    }),
    revalidatePaths: (input) => [`/campaigns/${input.campaignId}`, "/command-center"],
  });

  registerAction({
    name: "mission.update",
    description: "Aggiorna una missione esistente",
    category: "campaign",
    validate: (input) => parseMissionFields(input as Record<string, unknown>, true),
    preview: async (_ctx, input) => ({
      missionId: input.missionId,
      title: input.title,
      grade: input.grade,
      statusNote: "Aggiornamento campi missione",
    }),
    execute: async (_ctx, input) => {
      const result = await updateMissionAction(
        input.campaignId,
        input.missionId,
        input.grade,
        input.title,
        input.committente,
        input.ubicazione,
        input.paga,
        input.urgenza,
        input.description,
        input.pointsReward
      );
      if (!result.success) throw new Error(result.message);
      return { campaignId: input.campaignId, missionId: input.missionId };
    },
    auditEntity: (input) => ({
      entityType: "campaign_mission",
      entityId: input.missionId,
    }),
    revalidatePaths: (input) => [`/campaigns/${input.campaignId}`, "/command-center"],
  });
}
