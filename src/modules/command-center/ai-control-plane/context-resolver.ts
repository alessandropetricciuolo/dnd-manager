import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { generateOpenRouterEmbedding } from "@/lib/ai/openrouter-client";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";
import type { ActionSupabase } from "../types/actions";
import type { CommandNoteRow } from "../types";

export type ResolvedCommandContext = {
  campaignId: string | null;
  campaignName: string | null;
  campaignType: string | null;
  aiContextSummary: string | null;
  memorySnippets: { title: string; excerpt: string }[];
  recentNotes: { title: string; content: string }[];
};

type MemoryChunkRow = {
  title: string;
  content: string;
  summary: string | null;
};

async function fetchMemorySnippets(
  campaignId: string,
  userMessage: string,
  limit = 6
): Promise<{ title: string; excerpt: string }[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: campaign } = await admin.from("campaigns").select("type").eq("id", campaignId).maybeSingle();
    if ((campaign as { type?: string } | null)?.type !== "long") return [];

    const embedding = await generateOpenRouterEmbedding(userMessage, { dimensions: 384 });
    const runRpc = admin.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>;

    const res = await runRpc("match_campaign_memory", {
      p_campaign_id: campaignId,
      query_embedding: embedding,
      match_threshold: 0.2,
      match_count: limit,
    });
    if (res.error) return [];

    const rows = (res.data ?? []) as MemoryChunkRow[];
    return rows.map((row) => ({
      title: row.title,
      excerpt: (row.summary ?? row.content).slice(0, 280),
    }));
  } catch (err) {
    console.error("[context-resolver] memory", err);
    return [];
  }
}

export async function resolveCommandContext(
  supabase: ActionSupabase,
  userId: string,
  campaignId: string | null,
  userMessage: string
): Promise<ResolvedCommandContext> {
  let campaignName: string | null = null;
  let campaignType: string | null = null;
  let aiContextSummary: string | null = null;

  if (campaignId) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name, type, ai_context")
      .eq("id", campaignId)
      .maybeSingle();
    const row = campaign as { name?: string; type?: string; ai_context?: unknown } | null;
    campaignName = row?.name ?? null;
    campaignType = row?.type ?? null;
    const parsed = parseCampaignAiContextFromDb(
      row?.ai_context as import("@/types/database.types").Json | null
    );
    if (parsed) {
      aiContextSummary = [
        parsed.narrative_tone,
        parsed.magic_level,
        parsed.mechanics_focus,
      ]
        .filter(Boolean)
        .join(" · ");
    }
  }

  const { data: notesRaw } = await supabase
    .from("command_notes")
    .select("title, content")
    .eq("created_by", userId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(5);

  const recentNotes = ((notesRaw ?? []) as Pick<CommandNoteRow, "title" | "content">[]).map((n) => ({
    title: n.title,
    content: n.content.slice(0, 400),
  }));

  const memorySnippets = campaignId
    ? await fetchMemorySnippets(campaignId, userMessage)
    : [];

  return {
    campaignId,
    campaignName,
    campaignType,
    aiContextSummary,
    memorySnippets,
    recentNotes,
  };
}

export function formatContextForPrompt(ctx: ResolvedCommandContext): string {
  const lines: string[] = [];
  if (ctx.campaignName) {
    lines.push(`Campagna: ${ctx.campaignName} (${ctx.campaignId})`);
    if (ctx.campaignType) lines.push(`Tipo campagna: ${ctx.campaignType}`);
    if (ctx.aiContextSummary) lines.push(`Contesto AI campagna: ${ctx.aiContextSummary}`);
  } else {
    lines.push("Campagna: non selezionata (proposte generiche workspace).");
  }

  if (ctx.memorySnippets.length) {
    lines.push("\nMemoria campagna (estratti):");
    for (const s of ctx.memorySnippets) {
      lines.push(`- ${s.title}: ${s.excerpt}`);
    }
  }

  if (ctx.recentNotes.length) {
    lines.push("\nNote recenti Command Center:");
    for (const n of ctx.recentNotes) {
      lines.push(`- ${n.title}: ${n.content}`);
    }
  }

  return lines.join("\n");
}
