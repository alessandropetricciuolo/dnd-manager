import { createWikiRelationship } from "@/app/campaigns/entity-graph-actions";
import { registerAction } from "../../registry";

export function registerWikiRelationshipWrapperActions(): void {
  registerAction({
    name: "wiki.relationship.create",
    description: "Crea una relazione nella mappa concettuale (wiki o mappa)",
    category: "wiki",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const campaignId = typeof o.campaignId === "string" ? o.campaignId.trim() : "";
      const sourceId = typeof o.sourceId === "string" ? o.sourceId.trim() : "";
      const label = typeof o.label === "string" ? o.label.trim() : "";
      const targetId =
        typeof o.targetId === "string" && o.targetId.trim() ? o.targetId.trim() : null;
      const targetMapId =
        typeof o.targetMapId === "string" && o.targetMapId.trim() ? o.targetMapId.trim() : null;

      if (!campaignId) return { ok: false, error: "Campagna obbligatoria." };
      if (!sourceId) return { ok: false, error: "Entità sorgente obbligatoria." };
      if (!label) return { ok: false, error: "Etichetta relazione obbligatoria." };
      if (!targetId && !targetMapId) {
        return { ok: false, error: "Seleziona un bersaglio (voce wiki o mappa)." };
      }
      if (targetId && targetMapId) {
        return { ok: false, error: "Solo un tipo di bersaglio alla volta." };
      }
      if (targetId && sourceId === targetId) {
        return { ok: false, error: "Sorgente e bersaglio devono essere diversi." };
      }

      return {
        ok: true,
        data: {
          campaignId,
          sourceId,
          targetId,
          targetMapId,
          label,
          sourceName: typeof o.sourceName === "string" ? o.sourceName.trim() : null,
          targetName: typeof o.targetName === "string" ? o.targetName.trim() : null,
          targetKind:
            o.targetKind === "wiki" || o.targetKind === "map" ? o.targetKind : targetMapId ? "map" : "wiki",
        },
      };
    },
    preview: async (_ctx, input) => ({
      campaignId: input.campaignId,
      sourceName: input.sourceName,
      targetName: input.targetName,
      label: input.label,
      targetKind: input.targetKind,
      graphPreview: formatRelationshipPreview(
        input.sourceName ?? "Sorgente",
        input.label,
        input.targetName ?? "Bersaglio"
      ),
    }),
    execute: async (_ctx, input) => {
      const result = await createWikiRelationship(
        input.campaignId,
        input.sourceId,
        input.targetId,
        input.targetMapId,
        input.label
      );
      if (!result.success) throw new Error(result.error ?? "Creazione relazione fallita.");
      return {
        campaignId: input.campaignId,
        sourceId: input.sourceId,
        targetId: input.targetId,
        targetMapId: input.targetMapId,
        label: input.label,
      };
    },
    auditEntity: (input) => ({
      entityType: "campaign",
      entityId: input.campaignId,
    }),
    revalidatePaths: (input) => [
      `/campaigns/${input.campaignId}`,
      `/campaigns/${input.campaignId}/gm-only/concept-map`,
      "/command-center",
    ],
  });
}

function formatRelationshipPreview(sourceName: string, label: string, targetName: string): string {
  return `**${sourceName}** —[${label}]→ **${targetName}**`;
}
