"use server";

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { CampaignMemorySourceType } from "@/lib/campaign-memory-indexer";
import {
  buildCampaignMemoryExportFileName,
  buildCampaignMemoryMarkdown,
  summarizeCampaignMemoryExport,
  type CampaignMemoryExportChunk,
  type CampaignMemoryExportMode,
} from "@/lib/campaign-memory-markdown-export";

type CampaignMemoryExportResult =
  | {
      success: true;
      fileName: string;
      markdown: string;
      chunkCount: number;
      sourceCount: number;
      estimatedBytes: number;
      sourceCounts: Record<CampaignMemorySourceType, number>;
    }
  | {
      success: false;
      message: string;
      needsIndex?: boolean;
      chunkCount?: number;
    };

function memorySchemaMissingMessage(): string {
  return "Lo schema della memoria interrogabile non è ancora disponibile su Supabase. Applica la migration della tabella `campaign_memory_chunks` e dell'RPC `match_campaign_memory`, poi riprova.";
}

async function ensureGmOrAdminForCampaign(campaignId: string): Promise<
  | {
      ok: true;
      admin: ReturnType<typeof createSupabaseAdminClient>;
      campaignName: string;
    }
  | { ok: false; message: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, message: "Devi essere autenticato." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") {
    return { ok: false, message: "Solo GM e Admin possono esportare la memoria di campagna." };
  }

  const admin = createSupabaseAdminClient();
  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .select("name, type")
    .eq("id", campaignId)
    .maybeSingle();
  if (campaignError || !campaign) {
    return { ok: false, message: "Campagna non trovata." };
  }
  const row = campaign as { name?: string | null; type?: string | null };
  if (row.type !== "long") {
    return { ok: false, message: "L'export memoria è disponibile solo per campagne lunghe." };
  }
  return {
    ok: true,
    admin,
    campaignName: row.name?.trim() || "Campagna lunga",
  };
}

export async function exportCampaignMemoryMarkdownAction(
  campaignId: string,
  mode: CampaignMemoryExportMode
): Promise<CampaignMemoryExportResult> {
  const access = await ensureGmOrAdminForCampaign(campaignId);
  if (!access.ok) return { success: false, message: access.message };

  try {
    const { data, error, count } = await access.admin
      .from("campaign_memory_chunks")
      .select("id, campaign_id, source_type, source_id, chunk_index, title, content, summary, metadata", {
        count: "exact",
      })
      .eq("campaign_id", campaignId)
      .order("source_type", { ascending: true })
      .order("updated_at", { ascending: false })
      .order("chunk_index", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const chunks = ((data ?? []) as Array<{
      id: string;
      campaign_id: string;
      source_type: CampaignMemorySourceType;
      source_id: string;
      chunk_index: number;
      title: string;
      content: string;
      summary: string | null;
      metadata: Record<string, unknown> | null;
    }>).map(
      (row): CampaignMemoryExportChunk => ({
        id: row.id,
        campaignId: row.campaign_id,
        sourceType: row.source_type,
        sourceId: row.source_id,
        chunkIndex: row.chunk_index,
        title: row.title,
        content: row.content,
        summary: row.summary,
        metadata: row.metadata,
      })
    );

    const chunkCount = count ?? chunks.length;
    if (!chunkCount || !chunks.length) {
      return {
        success: false,
        message:
          "La memoria della campagna non è ancora indicizzata. Premi \"Reindicizza memoria\" prima di esportare il file Markdown.",
        needsIndex: true,
        chunkCount: chunkCount ?? 0,
      };
    }

    const markdown = buildCampaignMemoryMarkdown(chunks, mode, {
      campaignName: access.campaignName,
    });
    const fileName = buildCampaignMemoryExportFileName(access.campaignName, mode);
    const summary = summarizeCampaignMemoryExport(chunks);

    return {
      success: true,
      fileName,
      markdown,
      chunkCount: summary.chunkCount,
      sourceCount: summary.sourceCount,
      sourceCounts: summary.sourceCounts,
      estimatedBytes: Buffer.byteLength(markdown, "utf8"),
    };
  } catch (error) {
    console.error("[exportCampaignMemoryMarkdownAction]", error);
    return {
      success: false,
      message:
        error instanceof Error && /campaign_memory_chunks|match_campaign_memory/i.test(error.message)
          ? memorySchemaMissingMessage()
          : error instanceof Error
            ? error.message
            : "Errore durante l'export della memoria campagna.",
    };
  }
}
