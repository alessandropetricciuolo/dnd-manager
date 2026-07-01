import { COMMAND_INPUT_SOURCES } from "../../types/workspace";
import type { ActionContext } from "../../types/actions";
import { registerAction } from "../registry";

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value.trim() || null : null;
}

export function registerCommandInputActions(): void {
  registerAction({
    name: "command.input.capture",
    description: "Registra un input grezzo nel Command Center (testo/voce)",
    category: "command",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const rawContent =
        typeof o.rawContent === "string"
          ? o.rawContent.trim()
          : typeof o.content === "string"
            ? o.content.trim()
            : "";
      if (!rawContent) return { ok: false, error: "Contenuto obbligatorio." };
      const sourceRaw = optionalString(o.source) ?? "text";
      const source = (COMMAND_INPUT_SOURCES as readonly string[]).includes(sourceRaw)
        ? sourceRaw
        : "text";
      return {
        ok: true,
        data: {
          rawContent,
          source,
          transcript: optionalString(o.transcript),
          campaignId: optionalString(o.campaignId),
          language: optionalString(o.language) ?? "it",
          metadata:
            o.metadata && typeof o.metadata === "object" && !Array.isArray(o.metadata)
              ? (o.metadata as Record<string, unknown>)
              : {},
        },
      };
    },
    preview: async (_ctx, input) => ({
      source: input.source,
      rawContent: input.rawContent.slice(0, 280),
      transcript: input.transcript,
      campaignId: input.campaignId,
    }),
    execute: async (ctx: ActionContext, input) => {
      const { data, error } = await ctx.supabase
        .from("command_inputs")
        .insert({
          workspace_id: ctx.adapter.resolveWorkspaceId(),
          campaign_id: input.campaignId,
          source: input.source,
          raw_content: input.rawContent,
          transcript: input.source === "voice" ? input.transcript ?? input.rawContent : input.transcript,
          language: input.language,
          metadata: input.metadata,
          created_by: ctx.userId,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    auditEntity: (_input, result) => ({
      entityType: "command_input",
      entityId: String((result as { id: string }).id),
    }),
    revalidatePaths: () => ["/command-center"],
  });
}
