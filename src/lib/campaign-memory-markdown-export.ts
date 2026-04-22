import type { CampaignMemorySourceType } from "@/lib/campaign-memory-indexer";

export type CampaignMemoryExportMode = "full" | "compact";

export type CampaignMemoryExportChunk = {
  id: string;
  campaignId: string;
  sourceType: CampaignMemorySourceType;
  sourceId: string;
  chunkIndex: number;
  title: string;
  content: string;
  summary: string | null;
  metadata: Record<string, unknown> | null;
};

type CampaignMemoryExportSource = {
  key: string;
  sourceType: CampaignMemorySourceType;
  sourceId: string;
  title: string;
  chunks: CampaignMemoryExportChunk[];
  metadata: Record<string, unknown> | null;
  summary: string | null;
  timestamp: string | null;
  isPrivate: boolean;
};

type BuildMarkdownOptions = {
  campaignName: string;
  exportedAt?: Date;
  compactMaxChars?: number;
};

const SOURCE_TYPE_ORDER: CampaignMemorySourceType[] = [
  "wiki",
  "character_background",
  "session_summary",
  "session_note",
  "gm_note",
  "secret_whisper",
];

const SOURCE_TYPE_LABEL: Record<CampaignMemorySourceType, string> = {
  wiki: "Wiki canonica",
  character_background: "Background PG",
  session_summary: "Session summary",
  session_note: "Note private sessione",
  gm_note: "Note GM",
  secret_whisper: "Secret whispers",
};

const DEFAULT_COMPACT_MAX_CHARS = 24_000;

function metaString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!meta || !(key in meta)) return null;
  const value = meta[key];
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return null;
}

function metaBool(meta: Record<string, unknown> | null | undefined, key: string): boolean {
  if (!meta || !(key in meta)) return false;
  return meta[key] === true;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(date: Date): string {
  return date.toISOString().split("T")[0];
}

function escapeInline(value: string): string {
  return value.replace(/\|/g, "\\|").trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function excerpt(text: string, limit = 280): string | null {
  const clean = normalizeWhitespace(text);
  if (!clean) return null;
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit).trim()}…`;
}

function joinChunkBodies(chunks: CampaignMemoryExportChunk[]): string {
  return chunks
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((chunk) => normalizeWhitespace(chunk.content))
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function detectTimestamp(source: CampaignMemoryExportChunk): string | null {
  return (
    metaString(source.metadata, "updated_at") ??
    metaString(source.metadata, "scheduled_at") ??
    metaString(source.metadata, "created_at") ??
    null
  );
}

function sourceHeading(sourceType: CampaignMemorySourceType): string {
  return SOURCE_TYPE_LABEL[sourceType];
}

function sourcePrivacyLabel(source: CampaignMemoryExportSource): string {
  return source.isPrivate ? "GM-only" : "Condivisibile";
}

function buildMetaLines(source: CampaignMemoryExportSource): string[] {
  const lines: string[] = [];
  const meta = source.metadata ?? {};
  const timestamp = source.timestamp;

  switch (source.sourceType) {
    case "wiki": {
      const entityType = metaString(meta, "entity_type");
      const tags = Array.isArray(meta.tags) ? meta.tags.filter((tag) => typeof tag === "string") : [];
      const globalStatus = metaString(meta, "global_status");
      if (entityType) lines.push(`Tipo entità: ${entityType}`);
      if (tags.length) lines.push(`Tag: ${tags.join(", ")}`);
      if (globalStatus) lines.push(`Stato globale: ${globalStatus}`);
      break;
    }
    case "character_background": {
      const level = metaString(meta, "level");
      const characterClass = metaString(meta, "character_class");
      const subclass = metaString(meta, "class_subclass");
      const race = metaString(meta, "race_slug");
      const backgroundSlug = metaString(meta, "background_slug");
      if (level) lines.push(`Livello: ${level}`);
      if (subclass || characterClass) lines.push(`Classe: ${subclass ?? characterClass}`);
      if (race) lines.push(`Razza: ${race}`);
      if (backgroundSlug) lines.push(`Background regole: ${backgroundSlug}`);
      break;
    }
    case "session_summary":
    case "session_note": {
      const chapter = metaString(meta, "chapter_title");
      const scheduledAt = metaString(meta, "scheduled_at");
      const partyId = metaString(meta, "party_id");
      if (chapter) lines.push(`Capitolo: ${chapter}`);
      if (scheduledAt) lines.push(`Data sessione: ${scheduledAt}`);
      if (partyId) lines.push(`Party ID: ${partyId}`);
      break;
    }
    case "gm_note": {
      const sessionId = metaString(meta, "session_id");
      lines.push(sessionId ? `Collegata a sessione: ${sessionId}` : "Nota globale di campagna");
      break;
    }
    case "secret_whisper": {
      const sender = metaString(meta, "sender_label");
      const receiver = metaString(meta, "receiver_label");
      const hasImage = metaBool(meta, "has_image");
      if (sender) lines.push(`Mittente: ${sender}`);
      if (receiver) lines.push(`Destinatario: ${receiver}`);
      if (hasImage) lines.push("Contiene immagine allegata");
      break;
    }
  }

  if (timestamp) lines.push(`Timestamp fonte: ${timestamp}`);
  lines.push(`Visibilità: ${sourcePrivacyLabel(source)}`);
  return lines;
}

function groupSources(chunks: CampaignMemoryExportChunk[]): CampaignMemoryExportSource[] {
  const map = new Map<string, CampaignMemoryExportSource>();
  for (const chunk of chunks) {
    const key = `${chunk.sourceType}:${chunk.sourceId}`;
    const existing = map.get(key);
    if (existing) {
      existing.chunks.push(chunk);
      if (!existing.summary && chunk.summary) existing.summary = chunk.summary;
      continue;
    }
    map.set(key, {
      key,
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      title: chunk.title,
      chunks: [chunk],
      metadata: chunk.metadata ?? null,
      summary: chunk.summary ?? null,
      timestamp: detectTimestamp(chunk),
      isPrivate: metaBool(chunk.metadata, "is_private"),
    });
  }

  return [...map.values()].sort((a, b) => {
    const typeCmp = SOURCE_TYPE_ORDER.indexOf(a.sourceType) - SOURCE_TYPE_ORDER.indexOf(b.sourceType);
    if (typeCmp !== 0) return typeCmp;
    const timeA = a.timestamp ? Date.parse(a.timestamp) : 0;
    const timeB = b.timestamp ? Date.parse(b.timestamp) : 0;
    if (timeA !== timeB) return timeB - timeA;
    return a.title.localeCompare(b.title, "it");
  });
}

function buildSourceCounts(sources: CampaignMemoryExportSource[]): Record<CampaignMemorySourceType, number> {
  return {
    wiki: sources.filter((source) => source.sourceType === "wiki").length,
    character_background: sources.filter((source) => source.sourceType === "character_background").length,
    session_summary: sources.filter((source) => source.sourceType === "session_summary").length,
    session_note: sources.filter((source) => source.sourceType === "session_note").length,
    gm_note: sources.filter((source) => source.sourceType === "gm_note").length,
    secret_whisper: sources.filter((source) => source.sourceType === "secret_whisper").length,
  };
}

function renderOverviewTable(sources: CampaignMemoryExportSource[]): string {
  const counts = buildSourceCounts(sources);
  const rows = SOURCE_TYPE_ORDER.map((sourceType) => {
    return `| ${sourceHeading(sourceType)} | ${counts[sourceType]} |`;
  });
  return [
    "| Sezione | Fonti |",
    "| --- | ---: |",
    ...rows,
  ].join("\n");
}

function renderFullSource(source: CampaignMemoryExportSource): string {
  const body = joinChunkBodies(source.chunks);
  const metaLines = buildMetaLines(source).map((line) => `- ${line}`);
  return [
    `### ${source.title}`,
    ...metaLines,
    "",
    body || "_Nessun contenuto testuale disponibile._",
  ].join("\n");
}

function renderCompactSource(source: CampaignMemoryExportSource): string {
  const merged = joinChunkBodies(source.chunks);
  const compactBody = excerpt(merged, 1800) ?? "_Nessun contenuto testuale disponibile._";
  const metaSummary = [
    source.isPrivate ? "GM-only" : "Condivisibile",
    source.timestamp ? `timestamp ${source.timestamp}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return [
    `### ${source.title}`,
    metaSummary ? `_${metaSummary}_` : "",
    source.summary ? `Sintesi: ${source.summary}` : "",
    "",
    compactBody,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildCampaignMemoryMarkdown(
  chunks: CampaignMemoryExportChunk[],
  mode: CampaignMemoryExportMode,
  options: BuildMarkdownOptions
): string {
  const exportedAt = options.exportedAt ?? new Date();
  const grouped = groupSources(chunks);
  const intro = [
    `# Memoria Campagna: ${options.campaignName}`,
    "",
    `Modalità export: ${mode === "full" ? "Dump completo" : "Prompt compatto per altre AI"}`,
    `Esportato il: ${formatDateTime(exportedAt)}`,
    `Fonti indicizzate esportate: ${grouped.length}`,
    `Chunk totali esportati: ${chunks.length}`,
    "",
    "## Riepilogo sorgenti",
    renderOverviewTable(grouped),
  ];

  if (mode === "full") {
    const sections = SOURCE_TYPE_ORDER.map((sourceType) => {
      const sources = grouped.filter((source) => source.sourceType === sourceType);
      if (!sources.length) return null;
      return [
        `## ${sourceHeading(sourceType)}`,
        sources.map(renderFullSource).join("\n\n---\n\n"),
      ].join("\n\n");
    }).filter(Boolean);

    return [...intro, "", ...sections].join("\n");
  }

  const compactMaxChars = options.compactMaxChars ?? DEFAULT_COMPACT_MAX_CHARS;
  const promptIntro = [
    "## Istruzioni per un'altra IA",
    "Usa solo le informazioni presenti sotto come memoria canonica della campagna.",
    "Le sezioni marcate come `GM-only` contengono materiale sensibile del master e non devono essere semplificate in modo player-facing.",
    "Se emergono contraddizioni o buchi informativi, dichiaralo esplicitamente invece di inventare.",
    "",
  ];

  const renderedSections: string[] = [];
  let consumedChars = 0;

  for (const sourceType of SOURCE_TYPE_ORDER) {
    const sources = grouped.filter((source) => source.sourceType === sourceType);
    if (!sources.length) continue;

    const renderedSources: string[] = [];
    for (const source of sources) {
      const block = renderCompactSource(source);
      if (consumedChars + block.length > compactMaxChars && renderedSections.length > 0) {
        renderedSources.push("_[Troncato per mantenere il prompt compatto entro il limite previsto.]_");
        break;
      }
      renderedSources.push(block);
      consumedChars += block.length;
    }

    renderedSections.push([`## ${sourceHeading(sourceType)}`, renderedSources.join("\n\n")].join("\n\n"));
    if (consumedChars >= compactMaxChars) break;
  }

  return [...intro, "", ...promptIntro, ...renderedSections].join("\n");
}

export function buildCampaignMemoryExportFileName(
  campaignName: string,
  mode: CampaignMemoryExportMode,
  exportedAt?: Date
): string {
  const date = formatDateOnly(exportedAt ?? new Date());
  const safeSlug = slugify(campaignName) || "campaign-memory";
  return `${safeSlug}-memory-${mode}-${date}.md`;
}

export function summarizeCampaignMemoryExport(
  chunks: CampaignMemoryExportChunk[]
): {
  chunkCount: number;
  sourceCount: number;
  sourceCounts: Record<CampaignMemorySourceType, number>;
} {
  const grouped = groupSources(chunks);
  return {
    chunkCount: chunks.length,
    sourceCount: grouped.length,
    sourceCounts: buildSourceCounts(grouped),
  };
}
