import type { Json } from "@/types/database.types";

const MAX_MEMORY_BLOCK_CHARS = 14_000;
const MAX_ENTRY_BODY_CHARS = 3_200;

export function extractWikiContentBody(content: Json | null): string {
  if (content == null) return "";
  if (typeof content === "object" && !Array.isArray(content)) {
    const body = (content as Record<string, unknown>).body;
    if (typeof body === "string") return body.trim();
  }
  return "";
}

/**
 * Blocco testo per prompt IA: solo campagne `long`, solo voci con `include_in_campaign_ai_memory`.
 */
type AdminClient = ReturnType<typeof import("@/utils/supabase/admin").createSupabaseAdminClient>;

export async function fetchLongCampaignWikiMemoryPromptBlock(
  admin: AdminClient,
  campaignId: string,
  options?: { excludeEntityId?: string }
): Promise<string> {
  const { data: camp, error } = await admin.from("campaigns").select("type").eq("id", campaignId).maybeSingle();

  if (error || !camp) return "";
  const campaignType = (camp as { type?: string | null }).type;
  if (campaignType !== "long") return "";

  type MemRow = {
    id: string;
    name: string;
    type: string;
    content: Json;
    updated_at: string;
    include_in_campaign_ai_memory?: boolean;
  };

  const { data: rowsRaw, error: qErr } = await admin
    .from("wiki_entities")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("updated_at", { ascending: true });

  if (qErr) {
    console.error("[fetchLongCampaignWikiMemoryPromptBlock]", qErr);
    return "";
  }

  const rows = ((rowsRaw ?? []) as MemRow[]).filter((r) => r.include_in_campaign_ai_memory === true);

  const exclude = options?.excludeEntityId;
  const parts: string[] = [];
  let total = 0;

  for (const row of rows) {
    if (exclude && row.id === exclude) continue;
    const body = extractWikiContentBody(row.content as Json);
    if (!body) continue;
    let text = body;
    if (text.length > MAX_ENTRY_BODY_CHARS) {
      text = `${text.slice(0, MAX_ENTRY_BODY_CHARS)}…`;
    }
    const entry = `### ${row.name} (${row.type})\n${text}`;
    if (total + entry.length + 2 > MAX_MEMORY_BLOCK_CHARS) break;
    parts.push(entry);
    total += entry.length + 2;
  }

  if (!parts.length) return "";

  return [
    "Memoria di campagna (cronaca condivisa — solo voci wiki che hai incluso nel canone IA). Ogni nuovo elemento deve restare coerente con questi fatti, nomi e luoghi; non contraddirli a meno che non sia esplicitamente richiesto.",
    parts.join("\n\n---\n\n"),
  ].join("\n\n");
}
