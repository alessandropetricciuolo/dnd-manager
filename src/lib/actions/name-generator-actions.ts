"use server";

import {
  generateContextualNameFromCampaign,
  type ContextualNameKind,
} from "@/lib/ai/contextual-names";
import { generateOpenRouterChat } from "@/lib/ai/openrouter-client";
import { generateLocalNameSuggestions } from "@/lib/name-generator/local-names";
import type { NameGeneratorKind } from "@/lib/name-generator/types";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { Json } from "@/types/database.types";

export type GenerateNameSuggestionsResult =
  | { success: true; names: string[] }
  | { success: false; error: string };

function isContextualKind(kind: NameGeneratorKind): kind is ContextualNameKind {
  return kind !== "guild" && kind !== "scene";
}

async function assertCampaignAccess(campaignId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") return true;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("gm_id")
    .eq("id", campaignId)
    .maybeSingle();

  return campaign?.gm_id === user.id;
}

async function generateAiNameBatch(
  campaignId: string,
  kind: ContextualNameKind,
  count: number,
  hint?: string
): Promise<string[]> {
  const { buildCampaignContextBlock } = await import("@/lib/campaign-context-prompt");
  const { parseCampaignAiContextFromDb } = await import("@/lib/campaign-ai-context");
  const { fetchLongCampaignWikiMemoryPromptBlock } = await import("@/lib/campaign-wiki-ai-memory");
  const { createSupabaseAdminClient } = await import("@/utils/supabase/admin");

  const admin = createSupabaseAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("name, description, type, ai_context")
    .eq("id", campaignId)
    .maybeSingle();

  const row = campaign as {
    name?: string | null;
    description?: string | null;
    type?: string | null;
    ai_context?: Json | null;
  } | null;

  const blocks: string[] = [];
  if (row?.name?.trim()) blocks.push(`Campagna: ${row.name.trim()}`);
  if (row?.description?.trim()) blocks.push(`Sinossi:\n${row.description.trim()}`);
  blocks.push(buildCampaignContextBlock(parseCampaignAiContextFromDb(row?.ai_context ?? null)));
  if (row?.type === "long") {
    const wiki = await fetchLongCampaignWikiMemoryPromptBlock(admin, campaignId);
    if (wiki.trim()) blocks.push(wiki);
  }

  const prompt = [
    `Inventa esattamente ${count} nomi o titoli UNICI per un ${kind} in una campagna D&D 5e.`,
    "Rispondi SOLO con un array JSON di stringhe, senza markdown.",
    'Esempio: ["Nome Uno", "Nome Due"]',
    "",
    "--- CONTESTO ---",
    blocks.join("\n\n"),
    hint?.trim() ? `\n--- INDIZIO MASTER ---\n${hint.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await generateOpenRouterChat(prompt, { temperature: 0.9, maxTokens: 200 });
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === "string")
      .map((s) => s.trim())
      .filter((s) => s.length >= 2 && s.length <= 80)
      .slice(0, count);
  } catch {
    return [];
  }
}

export async function generateNameSuggestionsAction(input: {
  kind: NameGeneratorKind;
  count?: number;
  campaignId?: string;
  hint?: string;
}): Promise<GenerateNameSuggestionsResult> {
  const count = Math.max(3, Math.min(input.count ?? 5, 8));
  const local = generateLocalNameSuggestions(input.kind, count);

  try {
    if (input.campaignId && isContextualKind(input.kind)) {
      const allowed = await assertCampaignAccess(input.campaignId);
      if (allowed) {
        const aiNames = await generateAiNameBatch(
          input.campaignId,
          input.kind,
          Math.min(3, count),
          input.hint
        );
        const seen = new Set<string>();
        const merged: string[] = [];
        for (const name of [...aiNames, ...local]) {
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push(name);
          if (merged.length >= count) break;
        }
        return { success: true, names: merged };
      }
    }

    if (input.campaignId && !isContextualKind(input.kind)) {
      const allowed = await assertCampaignAccess(input.campaignId);
      if (allowed) {
        const extras: string[] = [];
        for (let i = 0; i < 2; i++) {
          const one = await generateContextualNameFromCampaign(
            input.campaignId,
            input.kind === "guild" ? "mission" : "location",
            input.hint?.trim() || `Nome per ${input.kind}`,
          );
          if (one) extras.push(one);
        }
        const seen = new Set<string>();
        const merged: string[] = [];
        for (const name of [...extras, ...local]) {
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push(name);
          if (merged.length >= count) break;
        }
        return { success: true, names: merged };
      }
    }

    return { success: true, names: local };
  } catch (err) {
    console.error("[generateNameSuggestionsAction]", err);
    return { success: true, names: local };
  }
}
