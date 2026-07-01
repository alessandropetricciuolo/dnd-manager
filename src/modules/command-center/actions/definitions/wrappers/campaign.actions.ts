import { createCampaign } from "@/app/dashboard/actions";
import { updateCampaign } from "@/app/campaigns/actions";
import { generateCampaignContextAction } from "@/lib/actions/ai-architect";
import { CAMPAIGN_TYPE_VALUES, type CampaignType } from "@/lib/campaign-type";
import { registerAction } from "../../registry";

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value.trim() || null : null;
}

export function registerCampaignWrapperActions(): void {
  registerAction({
    name: "campaign.create",
    description: "Crea una nuova campagna / oneshot / quest",
    category: "campaign",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const title = typeof o.title === "string" ? o.title.trim() : "";
      if (!title) return { ok: false, error: "Titolo campagna obbligatorio." };
      const typeRaw = optionalString(o.type);
      const type =
        typeRaw && (CAMPAIGN_TYPE_VALUES as readonly string[]).includes(typeRaw)
          ? (typeRaw as CampaignType)
          : ("oneshot" as CampaignType);
      return {
        ok: true,
        data: {
          title,
          description: optionalString(o.description) ?? "",
          type,
          isPublic: o.isPublic === true || o.isPublic === "true",
        },
      };
    },
    preview: async (_ctx, input) => ({
      title: input.title,
      type: input.type,
      description: input.description.slice(0, 200),
      isPublic: input.isPublic,
    }),
    execute: async (ctx, input) => {
      const fd = new FormData();
      fd.set("title", input.title);
      if (input.description) fd.set("description", input.description);
      fd.set("type", input.type);
      if (input.isPublic) fd.set("is_public", "true");
      if (input.type === "long") fd.set("is_long_campaign", "true");

      const result = await createCampaign(fd);
      if (!result.success) throw new Error(result.message);

      const { data: row } = await ctx.supabase
        .from("campaigns")
        .select("id, name, type")
        .eq("gm_id", ctx.userId)
        .eq("name", input.title)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!row) throw new Error("Campagna creata ma ID non recuperato.");
      return row as { id: string; name: string; type: string };
    },
    auditEntity: (_input, result) => ({
      entityType: "campaign",
      entityId: result.id,
    }),
    revalidatePaths: () => ["/dashboard", "/command-center"],
  });

  registerAction({
    name: "campaign.update",
    description: "Aggiorna metadati campagna",
    category: "campaign",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const campaignId = typeof o.campaignId === "string" ? o.campaignId.trim() : "";
      const title = typeof o.title === "string" ? o.title.trim() : "";
      if (!campaignId) return { ok: false, error: "Campagna obbligatoria." };
      if (!title) return { ok: false, error: "Titolo obbligatorio." };
      const typeRaw = optionalString(o.type);
      const type =
        typeRaw && (CAMPAIGN_TYPE_VALUES as readonly string[]).includes(typeRaw)
          ? typeRaw
          : null;
      return {
        ok: true,
        data: {
          campaignId,
          title,
          description: optionalString(o.description),
          type,
        },
      };
    },
    preview: async (_ctx, input) => ({
      campaignId: input.campaignId,
      title: input.title,
      type: input.type,
      description: input.description?.slice(0, 200) ?? null,
    }),
    execute: async (_ctx, input) => {
      const fd = new FormData();
      fd.set("campaign_id", input.campaignId);
      fd.set("title", input.title);
      if (input.description) fd.set("description", input.description);
      if (input.type) fd.set("type", input.type);

      const result = await updateCampaign(fd);
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
    name: "campaign.aiContext.generate",
    description: "Genera e salva il contesto AI strutturato della campagna",
    category: "campaign",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const campaignId = typeof o.campaignId === "string" ? o.campaignId.trim() : "";
      const description = typeof o.description === "string" ? o.description.trim() : "";
      if (!campaignId) return { ok: false, error: "Campagna obbligatoria." };
      if (!description) return { ok: false, error: "Descrizione ambientazione obbligatoria." };
      return { ok: true, data: { campaignId, description } };
    },
    preview: async (_ctx, input) => ({
      campaignId: input.campaignId,
      descriptionPreview: input.description.slice(0, 240),
      note: "Genererà JSON ai_context (tono, magia, meccaniche, …)",
    }),
    execute: async (_ctx, input) => {
      const result = await generateCampaignContextAction(input.campaignId, input.description);
      if (!result.success) throw new Error(result.message);
      return { campaignId: input.campaignId, aiContext: result.data };
    },
    auditEntity: (input) => ({
      entityType: "campaign",
      entityId: input.campaignId,
    }),
    revalidatePaths: (input) => [`/campaigns/${input.campaignId}`, "/command-center"],
  });
}
