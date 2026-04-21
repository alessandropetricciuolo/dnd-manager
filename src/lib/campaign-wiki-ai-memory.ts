import type { Json } from "@/types/database.types";

const MAX_MEMORY_BLOCK_CHARS = 14_000;
const MAX_WIKI_MEMORY_CHARS = 9_000;
const MAX_CHARACTER_MEMORY_CHARS = MAX_MEMORY_BLOCK_CHARS - MAX_WIKI_MEMORY_CHARS;
const MAX_ENTRY_BODY_CHARS = 3_200;
const MAX_CHARACTER_BACKGROUND_CHARS = 2_200;

export function extractWikiContentBody(content: Json | null): string {
  if (content == null) return "";
  if (typeof content === "object" && !Array.isArray(content)) {
    const body = (content as Record<string, unknown>).body;
    if (typeof body === "string") return body.trim();
  }
  return "";
}

function normalizeMemoryText(text: string): string {
  return text.replace(/\r/g, "").trim();
}

function truncateMemoryText(text: string, maxChars: number): string {
  const normalized = normalizeMemoryText(text);
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}…`;
}

/**
 * Blocco testo per prompt IA: solo campagne `long`.
 * Include:
 * - voci wiki con `include_in_campaign_ai_memory = true`
 * - background narrativi dei PG della campagna
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

  type CharacterMemoryRow = {
    id: string;
    name: string;
    level: number | null;
    character_class: string | null;
    class_subclass: string | null;
    background: string | null;
    updated_at: string;
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

  const { data: charactersRaw, error: charErr } = await admin
    .from("campaign_characters")
    .select("id, name, level, character_class, class_subclass, background, updated_at")
    .eq("campaign_id", campaignId)
    .order("updated_at", { ascending: true });

  if (charErr) {
    console.error("[fetchLongCampaignWikiMemoryPromptBlock][campaign_characters]", charErr);
  }

  const rows = ((rowsRaw ?? []) as MemRow[]).filter((r) => r.include_in_campaign_ai_memory === true);
  const characters = (charactersRaw ?? []) as CharacterMemoryRow[];

  const exclude = options?.excludeEntityId;
  const wikiParts: string[] = [];
  const characterParts: string[] = [];
  let wikiTotal = 0;
  let characterTotal = 0;

  for (const row of rows) {
    if (exclude && row.id === exclude) continue;
    const body = extractWikiContentBody(row.content as Json);
    if (!body) continue;
    const text = truncateMemoryText(body, MAX_ENTRY_BODY_CHARS);
    const entry = `### ${row.name} (${row.type})\n${text}`;
    if (wikiTotal + entry.length + 2 > MAX_WIKI_MEMORY_CHARS) break;
    wikiParts.push(entry);
    wikiTotal += entry.length + 2;
  }

  for (const character of characters) {
    const background = typeof character.background === "string" ? character.background.trim() : "";
    if (!background) continue;

    const levelLabel =
      typeof character.level === "number" && Number.isFinite(character.level)
        ? `Livello ${character.level}`
        : null;
    const classLabel = character.class_subclass?.trim() || character.character_class?.trim() || null;
    const meta = [levelLabel, classLabel].filter(Boolean).join(" • ");
    const title = meta ? `### ${character.name} (${meta})` : `### ${character.name}`;
    const text = truncateMemoryText(background, MAX_CHARACTER_BACKGROUND_CHARS);
    const entry = `${title}\n${text}`;
    if (characterTotal + entry.length + 2 > MAX_CHARACTER_MEMORY_CHARS) break;
    characterParts.push(entry);
    characterTotal += entry.length + 2;
  }

  if (!wikiParts.length && !characterParts.length) return "";

  const sections: string[] = [];
  if (wikiParts.length) {
    sections.push(
      [
        "## Voci wiki canoniche",
        wikiParts.join("\n\n---\n\n"),
      ].join("\n\n")
    );
  }
  if (characterParts.length) {
    sections.push(
      [
        "## Background dei personaggi giocanti",
        "Questi background fanno parte del canone narrativo della campagna e vanno rispettati quando generi PNG, luoghi, eventi, legami e conseguenze.",
        characterParts.join("\n\n---\n\n"),
      ].join("\n\n")
    );
  }

  return [
    "Memoria di campagna (cronaca condivisa delle campagne lunghe). Ogni nuovo elemento deve restare coerente con questi fatti, nomi, luoghi e background dei personaggi; non contraddirli a meno che non sia esplicitamente richiesto.",
    sections.join("\n\n====\n\n"),
  ].join("\n\n");
}
