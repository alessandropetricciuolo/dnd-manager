import { generateRagEmbedding } from "@/lib/ai/huggingface-client";
import { extractWikiContentBody } from "@/lib/campaign-wiki-ai-memory";
import type { Json } from "@/types/database.types";

type AdminClient = ReturnType<typeof import("@/utils/supabase/admin").createSupabaseAdminClient>;

export const CAMPAIGN_MEMORY_SOURCE_TYPES = [
  "wiki",
  "character_background",
  "session_summary",
  "session_note",
  "gm_note",
  "secret_whisper",
] as const;

export type CampaignMemorySourceType = (typeof CAMPAIGN_MEMORY_SOURCE_TYPES)[number];

type CampaignMemoryChunkInsert = {
  campaign_id: string;
  source_type: CampaignMemorySourceType;
  source_id: string;
  chunk_index: number;
  title: string;
  content: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  embedding?: number[];
};

type WikiMemoryRow = {
  id: string;
  campaign_id: string;
  name: string;
  type: string;
  content: Json;
  updated_at: string;
  tags?: string[] | null;
  include_in_campaign_ai_memory?: boolean;
  is_core?: boolean | null;
  global_status?: string | null;
};

type CharacterMemoryRow = {
  id: string;
  campaign_id: string;
  name: string;
  level: number | null;
  character_class: string | null;
  class_subclass: string | null;
  race_slug: string | null;
  background_slug: string | null;
  background: string | null;
  updated_at: string;
};

type SessionMemoryRow = {
  id: string;
  campaign_id: string;
  title: string | null;
  scheduled_at: string;
  chapter_title: string | null;
  party_id: string | null;
  status: string;
  session_summary?: string | null;
  gm_private_notes?: string | null;
  updated_at: string;
};

type GmNoteMemoryRow = {
  id: string;
  campaign_id: string;
  session_id: string | null;
  title: string;
  content: string;
  updated_at: string;
};

type WhisperMemoryRow = {
  id: string;
  campaign_id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  image_url: string | null;
  created_at: string;
};

const TARGET_CHUNK_CHARS = 900;
const HARD_CHUNK_CHARS = 1200;
const SUMMARY_CHARS = 220;

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function excerpt(text: string, limit = SUMMARY_CHARS): string | null {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return null;
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trim()}…`;
}

function splitLongParagraph(paragraph: string, maxChars = HARD_CHUNK_CHARS): string[] {
  const clean = normalizeWhitespace(paragraph);
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const sentenceParts = clean
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (sentenceParts.length <= 1) {
    const chunks: string[] = [];
    for (let i = 0; i < clean.length; i += maxChars) {
      chunks.push(clean.slice(i, i + maxChars).trim());
    }
    return chunks.filter(Boolean);
  }

  const out: string[] = [];
  let current = "";
  for (const sentence of sentenceParts) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) out.push(current.trim());
    if (sentence.length > maxChars) {
      out.push(...splitLongParagraph(sentence, maxChars));
      current = "";
      continue;
    }
    current = sentence;
  }
  if (current) out.push(current.trim());
  return out;
}

function chunkText(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .flatMap((paragraph) => splitLongParagraph(paragraph, HARD_CHUNK_CHARS))
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= TARGET_CHUNK_CHARS || !current) {
      current = next;
      if (current.length > HARD_CHUNK_CHARS) {
        chunks.push(current.trim());
        current = "";
      }
      continue;
    }
    chunks.push(current.trim());
    current = paragraph;
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

function withHeader(title: string, lines: Array<string | null | undefined>, body: string): string {
  return normalizeWhitespace([title, ...lines.filter(Boolean), "", body].join("\n"));
}

async function isLongCampaign(admin: AdminClient, campaignId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("campaigns")
    .select("type")
    .eq("id", campaignId)
    .maybeSingle();
  if (error || !data) return false;
  return (data as { type?: string | null }).type === "long";
}

export async function deleteCampaignMemorySource(
  admin: AdminClient,
  campaignId: string,
  sourceType: CampaignMemorySourceType,
  sourceId: string
): Promise<void> {
  const { error } = await admin
    .from("campaign_memory_chunks")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
  if (error) {
    throw new Error(`[campaign-memory] delete ${sourceType}:${sourceId} failed: ${error.message}`);
  }
}

async function upsertCampaignMemoryChunks(
  admin: AdminClient,
  campaignId: string,
  sourceType: CampaignMemorySourceType,
  sourceId: string,
  chunks: CampaignMemoryChunkInsert[]
): Promise<void> {
  if (!chunks.length) {
    await deleteCampaignMemorySource(admin, campaignId, sourceType, sourceId);
    return;
  }

  const prepared: CampaignMemoryChunkInsert[] = [];
  for (const chunk of chunks) {
    const embedding = await generateRagEmbedding(chunk.content);
    prepared.push({ ...chunk, embedding });
  }

  await deleteCampaignMemorySource(admin, campaignId, sourceType, sourceId);

  const { error } = await admin.from("campaign_memory_chunks").insert(prepared as never);
  if (error) {
    throw new Error(`[campaign-memory] upsert ${sourceType}:${sourceId} failed: ${error.message}`);
  }
}

function buildWikiChunks(row: WikiMemoryRow): CampaignMemoryChunkInsert[] {
  if (row.include_in_campaign_ai_memory !== true) return [];
  const body = extractWikiContentBody(row.content);
  if (!body) return [];

  const text = withHeader(
    `${row.name} (${row.type})`,
    [
      row.tags?.length ? `Tag: ${row.tags.join(", ")}` : null,
      row.is_core ? `Stato globale: ${row.global_status ?? "alive"}` : null,
      `Ultimo aggiornamento: ${row.updated_at}`,
      "Fonte: voce wiki canonica della campagna.",
    ],
    body
  );

  return chunkText(text).map((content, index) => ({
    campaign_id: row.campaign_id,
    source_type: "wiki",
    source_id: row.id,
    chunk_index: index,
    title: row.name,
    content,
    summary: excerpt(body),
    metadata: {
      entity_type: row.type,
      name: row.name,
      tags: row.tags ?? [],
      is_core: row.is_core ?? false,
      global_status: row.global_status ?? null,
      updated_at: row.updated_at,
      is_private: false,
    },
  }));
}

function buildCharacterChunks(row: CharacterMemoryRow): CampaignMemoryChunkInsert[] {
  const background = normalizeWhitespace(row.background ?? "");
  if (!background) return [];

  const metaBits = [
    row.level != null ? `Livello ${row.level}` : null,
    row.class_subclass?.trim() || row.character_class?.trim() || null,
    row.race_slug?.trim() ? `Razza: ${row.race_slug}` : null,
    row.background_slug?.trim() ? `Background regole: ${row.background_slug}` : null,
  ].filter(Boolean);

  const text = withHeader(
    `Background di ${row.name}`,
    [metaBits.length ? metaBits.join(" • ") : null, `Ultimo aggiornamento: ${row.updated_at}`],
    background
  );

  return chunkText(text).map((content, index) => ({
    campaign_id: row.campaign_id,
    source_type: "character_background",
    source_id: row.id,
    chunk_index: index,
    title: row.name,
    content,
    summary: excerpt(background),
    metadata: {
      character_name: row.name,
      level: row.level,
      character_class: row.character_class,
      class_subclass: row.class_subclass,
      race_slug: row.race_slug,
      background_slug: row.background_slug,
      updated_at: row.updated_at,
      is_private: false,
    },
  }));
}

function buildSessionChunks(row: SessionMemoryRow): CampaignMemoryChunkInsert[] {
  const label = row.title?.trim() || row.chapter_title?.trim() || "Sessione";
  const commonMeta = {
    session_title: row.title,
    chapter_title: row.chapter_title,
    scheduled_at: row.scheduled_at,
    party_id: row.party_id,
  };

  const chunks: CampaignMemoryChunkInsert[] = [];
  const summary = normalizeWhitespace(row.session_summary ?? "");
  if (row.status === "completed" && summary) {
    for (const [index, content] of chunkText(
      withHeader(
        `Riassunto sessione: ${label}`,
        [
          row.chapter_title?.trim() ? `Capitolo: ${row.chapter_title}` : null,
          `Data sessione: ${row.scheduled_at}`,
          "Fonte: cronaca pubblica della sessione.",
        ],
        summary
      )
    ).entries()) {
      chunks.push({
        campaign_id: row.campaign_id,
        source_type: "session_summary",
        source_id: row.id,
        chunk_index: index,
        title: label,
        content,
        summary: excerpt(summary),
        metadata: {
          ...commonMeta,
          updated_at: row.updated_at,
          is_private: false,
        },
      });
    }
  }

  const notes = normalizeWhitespace(row.gm_private_notes ?? "");
  if (notes) {
    for (const [index, content] of chunkText(
      withHeader(
        `Note private GM: ${label}`,
        [
          row.chapter_title?.trim() ? `Capitolo: ${row.chapter_title}` : null,
          `Data sessione: ${row.scheduled_at}`,
          "Fonte: note private del GM sulla sessione.",
        ],
        notes
      )
    ).entries()) {
      chunks.push({
        campaign_id: row.campaign_id,
        source_type: "session_note",
        source_id: row.id,
        chunk_index: index,
        title: label,
        content,
        summary: excerpt(notes),
        metadata: {
          ...commonMeta,
          updated_at: row.updated_at,
          is_private: true,
        },
      });
    }
  }

  return chunks;
}

function buildGmNoteChunks(row: GmNoteMemoryRow): CampaignMemoryChunkInsert[] {
  const title = row.title?.trim() || "Nota GM";
  const noteBody = normalizeWhitespace(row.content);
  const payload = noteBody || title;
  if (!payload) return [];

  return chunkText(
    withHeader(
      `Nota GM: ${title}`,
      [row.session_id ? `Collegata alla sessione: ${row.session_id}` : "Nota globale di campagna."],
      noteBody || title
    )
  ).map((content, index) => ({
    campaign_id: row.campaign_id,
    source_type: "gm_note",
    source_id: row.id,
    chunk_index: index,
    title,
    content,
    summary: excerpt(noteBody || title),
    metadata: {
      note_title: title,
      session_id: row.session_id,
      updated_at: row.updated_at,
      is_private: true,
    },
  }));
}

function buildWhisperChunks(
  row: WhisperMemoryRow,
  senderLabel: string,
  receiverLabel: string
): CampaignMemoryChunkInsert[] {
  const message = normalizeWhitespace(row.message ?? "");
  const title = `Whisper ${senderLabel} → ${receiverLabel}`;
  const body = message || (row.image_url ? "Sussurro con immagine allegata e senza testo." : "");
  if (!body) return [];

  return chunkText(
    withHeader(
      title,
      [
        `Mittente: ${senderLabel}`,
        `Destinatario: ${receiverLabel}`,
        `Creato il: ${row.created_at}`,
        "Fonte: sussurro segreto GM/player.",
      ],
      body
    )
  ).map((content, index) => ({
    campaign_id: row.campaign_id,
    source_type: "secret_whisper",
    source_id: row.id,
    chunk_index: index,
    title,
    content,
    summary: excerpt(body),
    metadata: {
      sender_id: row.sender_id,
      receiver_id: row.receiver_id,
      sender_label: senderLabel,
      receiver_label: receiverLabel,
      created_at: row.created_at,
      has_image: Boolean(row.image_url),
      is_private: true,
    },
  }));
}

export async function syncWikiEntityToCampaignMemory(
  admin: AdminClient,
  entityId: string,
  options?: { campaignId?: string }
): Promise<void> {
  const { data } = await admin
    .from("wiki_entities")
    .select("id, campaign_id, name, type, content, updated_at, tags, include_in_campaign_ai_memory, is_core, global_status")
    .eq("id", entityId)
    .maybeSingle();

  if (!data) {
    if (options?.campaignId) await deleteCampaignMemorySource(admin, options.campaignId, "wiki", entityId);
    return;
  }

  const row = data as WikiMemoryRow;
  if (!(await isLongCampaign(admin, row.campaign_id))) {
    await deleteCampaignMemorySource(admin, row.campaign_id, "wiki", row.id);
    return;
  }

  await upsertCampaignMemoryChunks(admin, row.campaign_id, "wiki", row.id, buildWikiChunks(row));
}

export async function syncCharacterBackgroundToCampaignMemory(
  admin: AdminClient,
  characterId: string,
  options?: { campaignId?: string }
): Promise<void> {
  const { data } = await admin
    .from("campaign_characters")
    .select("id, campaign_id, name, level, character_class, class_subclass, race_slug, background_slug, background, updated_at")
    .eq("id", characterId)
    .maybeSingle();

  if (!data) {
    if (options?.campaignId) {
      await deleteCampaignMemorySource(admin, options.campaignId, "character_background", characterId);
    }
    return;
  }

  const row = data as CharacterMemoryRow;
  if (!(await isLongCampaign(admin, row.campaign_id))) {
    await deleteCampaignMemorySource(admin, row.campaign_id, "character_background", row.id);
    return;
  }

  await upsertCampaignMemoryChunks(
    admin,
    row.campaign_id,
    "character_background",
    row.id,
    buildCharacterChunks(row)
  );
}

export async function syncSessionToCampaignMemory(
  admin: AdminClient,
  sessionId: string,
  options?: { campaignId?: string }
): Promise<void> {
  const { data } = await admin
    .from("sessions")
    .select("id, campaign_id, title, scheduled_at, chapter_title, party_id, status, session_summary, gm_private_notes, updated_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!data) {
    if (options?.campaignId) {
      await Promise.all([
        deleteCampaignMemorySource(admin, options.campaignId, "session_summary", sessionId),
        deleteCampaignMemorySource(admin, options.campaignId, "session_note", sessionId),
      ]);
    }
    return;
  }

  const row = data as SessionMemoryRow;
  if (!(await isLongCampaign(admin, row.campaign_id))) {
    await Promise.all([
      deleteCampaignMemorySource(admin, row.campaign_id, "session_summary", row.id),
      deleteCampaignMemorySource(admin, row.campaign_id, "session_note", row.id),
    ]);
    return;
  }

  const chunks = buildSessionChunks(row);
  const summaryChunks = chunks.filter((chunk) => chunk.source_type === "session_summary");
  const noteChunks = chunks.filter((chunk) => chunk.source_type === "session_note");

  await upsertCampaignMemoryChunks(admin, row.campaign_id, "session_summary", row.id, summaryChunks);
  await upsertCampaignMemoryChunks(admin, row.campaign_id, "session_note", row.id, noteChunks);
}

export async function syncGmNoteToCampaignMemory(
  admin: AdminClient,
  noteId: string,
  options?: { campaignId?: string }
): Promise<void> {
  const { data } = await admin
    .from("gm_notes")
    .select("id, campaign_id, session_id, title, content, updated_at")
    .eq("id", noteId)
    .maybeSingle();

  if (!data) {
    if (options?.campaignId) await deleteCampaignMemorySource(admin, options.campaignId, "gm_note", noteId);
    return;
  }

  const row = data as GmNoteMemoryRow;
  if (!(await isLongCampaign(admin, row.campaign_id))) {
    await deleteCampaignMemorySource(admin, row.campaign_id, "gm_note", row.id);
    return;
  }

  await upsertCampaignMemoryChunks(admin, row.campaign_id, "gm_note", row.id, buildGmNoteChunks(row));
}

export async function syncSecretWhisperToCampaignMemory(
  admin: AdminClient,
  whisperId: string,
  options?: { campaignId?: string }
): Promise<void> {
  const { data } = await admin
    .from("secret_whispers")
    .select("id, campaign_id, sender_id, receiver_id, message, image_url, created_at")
    .eq("id", whisperId)
    .maybeSingle();

  if (!data) {
    if (options?.campaignId) {
      await deleteCampaignMemorySource(admin, options.campaignId, "secret_whisper", whisperId);
    }
    return;
  }

  const row = data as WhisperMemoryRow;
  if (!(await isLongCampaign(admin, row.campaign_id))) {
    await deleteCampaignMemorySource(admin, row.campaign_id, "secret_whisper", row.id);
    return;
  }

  const participantIds = [row.sender_id, row.receiver_id];
  const { data: profilesRaw } = await admin
    .from("profiles")
    .select("id, first_name, last_name, display_name")
    .in("id", participantIds);

  const profiles = (profilesRaw ?? []) as Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
  }>;
  const nameMap = new Map<string, string>();
  for (const profile of profiles) {
    const full = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
    nameMap.set(profile.id, full || profile.display_name?.trim() || `Utente ${profile.id.slice(0, 8)}`);
  }

  const senderLabel = nameMap.get(row.sender_id) ?? `Utente ${row.sender_id.slice(0, 8)}`;
  const receiverLabel = nameMap.get(row.receiver_id) ?? `Utente ${row.receiver_id.slice(0, 8)}`;

  await upsertCampaignMemoryChunks(
    admin,
    row.campaign_id,
    "secret_whisper",
    row.id,
    buildWhisperChunks(row, senderLabel, receiverLabel)
  );
}

export async function countCampaignMemoryChunks(admin: AdminClient, campaignId: string): Promise<number> {
  const { count, error } = await admin
    .from("campaign_memory_chunks")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);
  if (error) {
    throw new Error(`[campaign-memory] count failed: ${error.message}`);
  }
  return count ?? 0;
}

export async function reindexCampaignMemory(admin: AdminClient, campaignId: string): Promise<void> {
  if (!(await isLongCampaign(admin, campaignId))) {
    const { error } = await admin
      .from("campaign_memory_chunks")
      .delete()
      .eq("campaign_id", campaignId);
    if (error) {
      throw new Error(`[campaign-memory] cleanup failed: ${error.message}`);
    }
    return;
  }

  const [
    wikiRes,
    charRes,
    sessionRes,
    noteRes,
    whisperRes,
  ] = await Promise.all([
    admin
      .from("wiki_entities")
      .select("id, campaign_id, name, type, content, updated_at, tags, include_in_campaign_ai_memory, is_core, global_status")
      .eq("campaign_id", campaignId)
      .order("updated_at", { ascending: false }),
    admin
      .from("campaign_characters")
      .select("id, campaign_id, name, level, character_class, class_subclass, race_slug, background_slug, background, updated_at")
      .eq("campaign_id", campaignId)
      .order("updated_at", { ascending: false }),
    admin
      .from("sessions")
      .select("id, campaign_id, title, scheduled_at, chapter_title, party_id, status, session_summary, gm_private_notes, updated_at")
      .eq("campaign_id", campaignId)
      .order("scheduled_at", { ascending: false }),
    admin
      .from("gm_notes")
      .select("id, campaign_id, session_id, title, content, updated_at")
      .eq("campaign_id", campaignId)
      .order("updated_at", { ascending: false }),
    admin
      .from("secret_whispers")
      .select("id")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false }),
  ]);

  if (wikiRes.error) throw new Error(wikiRes.error.message);
  if (charRes.error) throw new Error(charRes.error.message);
  if (sessionRes.error) throw new Error(sessionRes.error.message);
  if (noteRes.error) throw new Error(noteRes.error.message);
  if (whisperRes.error) throw new Error(whisperRes.error.message);

  for (const row of (wikiRes.data ?? []) as WikiMemoryRow[]) {
    await upsertCampaignMemoryChunks(admin, campaignId, "wiki", row.id, buildWikiChunks(row));
  }
  for (const row of (charRes.data ?? []) as CharacterMemoryRow[]) {
    await upsertCampaignMemoryChunks(
      admin,
      campaignId,
      "character_background",
      row.id,
      buildCharacterChunks(row)
    );
  }
  for (const row of (sessionRes.data ?? []) as SessionMemoryRow[]) {
    const built = buildSessionChunks(row);
    await upsertCampaignMemoryChunks(
      admin,
      campaignId,
      "session_summary",
      row.id,
      built.filter((chunk) => chunk.source_type === "session_summary")
    );
    await upsertCampaignMemoryChunks(
      admin,
      campaignId,
      "session_note",
      row.id,
      built.filter((chunk) => chunk.source_type === "session_note")
    );
  }
  for (const row of (noteRes.data ?? []) as GmNoteMemoryRow[]) {
    await upsertCampaignMemoryChunks(admin, campaignId, "gm_note", row.id, buildGmNoteChunks(row));
  }
  for (const row of (whisperRes.data ?? []) as Array<{ id: string }>) {
    await syncSecretWhisperToCampaignMemory(admin, row.id, { campaignId });
  }
}
