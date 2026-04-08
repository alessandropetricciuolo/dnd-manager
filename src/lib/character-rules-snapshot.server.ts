import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { readExcludedManualBookKeysFromAiContextJson } from "@/lib/campaign-ai-context";
import type { Json } from "@/types/database.types";
import {
  PHB_BOOK_KEY,
  PHB_MD_FILE,
  backgroundBySlug,
  classByLabel,
  maxSpellLevelOnSheet,
  raceBySlug,
} from "@/lib/character-build-catalog";
import type { CharacterRulesSnapshotV1 } from "@/lib/character-rules-snapshot";
import {
  extractPhbSpellMarkdown,
  normalizeSpellExcerptFirstHeading,
  preloadPhbMarkdown,
} from "@/lib/server/phb-spell-excerpt";

type MkRow = { content: string | null; metadata: Record<string, unknown> | null };
const PHB_BOOK_KEY_ALIASES = new Set([
  PHB_BOOK_KEY,
  "manuale_giocatore",
  "manuale-del-giocatore",
  "phb",
]);
const PHB_FILE_ALIASES = new Set([
  PHB_MD_FILE.toLowerCase(),
  "manuale del giocatore.md",
  "manuale-giocatore.md",
]);

function metaStr(m: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!m || !(key in m)) return null;
  const v = m[key];
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}

function metaInt(m: Record<string, unknown> | null | undefined, key: string): number | null {
  const s = metaStr(m, key);
  if (s == null) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function mergeMdChunks(rows: MkRow[]): string {
  const sorted = [...rows].sort((a, b) => {
    const ia = metaInt(a.metadata, "chunk_index");
    const ib = metaInt(b.metadata, "chunk_index");
    if (ia != null && ib != null) return ia - ib;
    if (ia != null) return -1;
    if (ib != null) return 1;
    return 0;
  });
  return sorted
    .map((r) => (typeof r.content === "string" ? r.content.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
}

/** Estrae blocchi ###/## TRUCCHETTI e N° LIVELLO fino al livello massimo (liste cap. 11). */
function extractSpellListByMaxLevel(raw: string, maxSpellLevel: number): string {
  if (maxSpellLevel < 0 || !raw.trim()) return "";
  const lines = raw.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let take = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const m =
      trimmed.match(/^(#{2,3})\s+(TRUCCHETTI(?:\s*\(LIVELLO\s*0\))?)\s*$/i) ||
      trimmed.match(/^(#{2,3})\s+(\d+)°\s*LIVELLO\s*$/i);
    if (m) {
      if (/TRUCCHETTI/i.test(m[2] ?? "")) {
        take = maxSpellLevel >= 0;
      } else {
        const lvl = Number.parseInt(m[2] ?? "0", 10);
        take = Number.isFinite(lvl) && lvl >= 1 && lvl <= maxSpellLevel;
      }
      if (take) out.push(line);
      continue;
    }
    if (take) out.push(line);
  }
  const text = out.join("\n").trim();
  const MAX = 14_000;
  if (text.length > MAX) {
    return `${text.slice(0, MAX).trim()}\n\n_(Lista troncata per dimensione.)_`;
  }
  return text;
}

function normalizeHeadingForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[*_`>#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function headingMatchesSpellName(headingRaw: string, spellRaw: string): boolean {
  const heading = normalizeHeadingForMatch(headingRaw);
  const spell = normalizeHeadingForMatch(spellRaw);
  if (!heading || !spell) return false;
  if (heading === spell) return true;
  // Solo titolo con suffisso tra parentesi, es. "BENEDIZIONE (RITUALE)" — non "BENEDIZIONE DELL'OSCURO".
  if (heading.startsWith(`${spell} (`)) return true;
  return false;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSpellEntryFromMarkdown(raw: string, spellName: string): string {
  const txt = raw.replace(/\r/g, "");
  const head = new RegExp(
    `^#{1,6}\\s+${escapeRegExp(spellName)}(?:\\s*\\([^)]*\\))?\\s*$`,
    "im"
  );
  const m = head.exec(txt);
  if (!m || m.index < 0) return "";
  const start = m.index;
  const rest = txt.slice(start + m[0].length);
  const next = /^#{1,6}\s+.+$/m.exec(rest);
  const end = next && typeof next.index === "number" ? start + m[0].length + next.index : txt.length;
  return txt.slice(start, end).trim();
}

/**
 * Rimuove artefatti d’impaginazione OCR (numeri pagina isolati, header «CAPITOLO 11 | …») in coda o in mezzo al testo,
 * e unifica il primo titolo ATX a livello H1 (anche per estratti da manuals_knowledge).
 */
function sanitizeSpellExcerpt(md: string): string {
  let t = md.trim().replace(/\r/g, "");
  t = t.replace(/\nCAPITOLO\s+\d+\s*\|[^\n]*/gi, "");
  const lines = t.split("\n");
  const cleaned: string[] = [];
  for (const line of lines) {
    const s = line.trim();
    if (/^\d{3}$/.test(s)) continue;
    if (/^CAPITOLO\s+\d+\s*\|/i.test(s)) continue;
    cleaned.push(line);
  }
  t = cleaned.join("\n");
  while (/\n\d{1,4}\s*$/.test(t)) {
    t = t.replace(/\n\d{1,4}\s*$/g, "").trim();
  }
  return normalizeSpellExcerptFirstHeading(t.trim()).trim();
}

/** Il primo titolo ATX del testo deve essere l’incantesimo richiesto (evita chunk «BENEDIZIONE DELL'OSCURO» per «Benedizione»). */
function excerptFirstHeadingMatchesSpell(md: string, spellRaw: string): boolean {
  const m = md.replace(/\r/g, "").match(/^#{1,6}\s+(.+?)(?:\s+#+\s*)?$/m);
  if (!m) return false;
  const title = normalizeHeadingForMatch(m[1].trim());
  const spell = normalizeHeadingForMatch(spellRaw);
  if (!title || !spell) return false;
  if (title === spell) return true;
  if (title.startsWith(`${spell} (`)) return true;
  return false;
}

async function resolveRequestOriginForPhb(): Promise<string | null> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    const xf = h.get("x-forwarded-proto");
    const proto =
      xf && xf.trim() !== ""
        ? xf.split(",")[0].trim()
        : host.includes("localhost") || host.startsWith("127.")
          ? "http"
          : "https";
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}

/**
 * Ingest v3: per molte voci il `chapter` nel metadata è il titolo H1 locale (es. nome incantesimo), non «INCANTESIMI».
 * Accettiamo anche sezione heading = nome incantesimo o breadcrumb che cita cap. 11.
 */
function rowLooksLikeSpellsAppendixChunk(r: MkRow, spellName: string): boolean {
  const ch = (metaStr(r.metadata, "chapter") ?? "").toUpperCase();
  if (ch.includes("INCANTESIMI") || ch.includes("CAPITOLO 11")) return true;
  const sec = metaStr(r.metadata, "section_heading") ?? metaStr(r.metadata, "section_title") ?? "";
  if (headingMatchesSpellName(sec, spellName)) return true;
  const hn = normalizeHeadingForMatch(sec);
  const sn = normalizeHeadingForMatch(spellName);
  return !!(hn && sn && hn === sn);
}

function filterExcluded(rows: MkRow[], excluded: string[]): MkRow[] {
  if (!excluded.length) return rows;
  const ex = new Set(excluded);
  return rows.filter((r) => {
    const k = metaStr(r.metadata, "manual_book_key");
    if (k && ex.has(k)) return false;
    return true;
  });
}

function isPhbLikeRow(row: MkRow): boolean {
  const k = (metaStr(row.metadata, "manual_book_key") ?? "").trim().toLowerCase();
  const f = (metaStr(row.metadata, "file_name") ?? "").trim().toLowerCase();
  if (k && PHB_BOOK_KEY_ALIASES.has(k)) return true;
  if (f && (PHB_FILE_ALIASES.has(f) || f.includes("giocatore"))) return true;
  return false;
}

async function fetchRowsContentIlike(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  ilike: string,
  excluded: string[]
): Promise<MkRow[]> {
  const { data, error } = await admin
    .from("manuals_knowledge" as "campaign_characters")
    .select("content, metadata")
    .eq("metadata->>file_name", PHB_MD_FILE)
    .eq("metadata->>manual_book_key", PHB_BOOK_KEY)
    .ilike("content", ilike)
    .limit(36);
  if (error) {
    console.error("[character-rules-snapshot] fetchRowsContentIlike", error);
    return [];
  }
  let out = filterExcluded((data ?? []) as MkRow[], excluded);
  if (out.length > 0) return out;
  const { data: looseData, error: looseErr } = await admin
    .from("manuals_knowledge" as "campaign_characters")
    .select("content, metadata")
    .ilike("content", ilike)
    .limit(120);
  if (looseErr) {
    console.error("[character-rules-snapshot] fetchRowsContentIlike fallback", looseErr);
    return [];
  }
  out = filterExcluded(((looseData ?? []) as MkRow[]).filter(isPhbLikeRow), excluded);
  return out;
}

async function fetchRowsSectionHeading(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  sectionHeading: string,
  excluded: string[]
): Promise<MkRow[]> {
  const { data, error } = await admin
    .from("manuals_knowledge" as "campaign_characters")
    .select("content, metadata")
    .eq("metadata->>file_name", PHB_MD_FILE)
    .eq("metadata->>manual_book_key", PHB_BOOK_KEY)
    .eq("metadata->>section_heading", sectionHeading)
    .limit(36);
  if (error) {
    console.error("[character-rules-snapshot] fetchRowsSectionHeading", error);
    return [];
  }
  let out = filterExcluded((data ?? []) as MkRow[], excluded);
  if (out.length > 0) return out;
  const { data: looseData, error: looseErr } = await admin
    .from("manuals_knowledge" as "campaign_characters")
    .select("content, metadata")
    .eq("metadata->>section_heading", sectionHeading)
    .limit(120);
  if (looseErr) {
    console.error("[character-rules-snapshot] fetchRowsSectionHeading fallback", looseErr);
    return [];
  }
  out = filterExcluded(((looseData ?? []) as MkRow[]).filter(isPhbLikeRow), excluded);
  return out;
}

async function fetchRowsChapter(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  chapter: string,
  excluded: string[]
): Promise<MkRow[]> {
  const { data, error } = await admin
    .from("manuals_knowledge" as "campaign_characters")
    .select("content, metadata")
    .eq("metadata->>file_name", PHB_MD_FILE)
    .eq("metadata->>manual_book_key", PHB_BOOK_KEY)
    .eq("metadata->>chapter", chapter)
    .limit(80);
  if (error) {
    console.error("[character-rules-snapshot] fetchRowsChapter", error);
    return [];
  }
  let out = filterExcluded((data ?? []) as MkRow[], excluded);
  if (out.length > 0) return out;
  const { data: looseData, error: looseErr } = await admin
    .from("manuals_knowledge" as "campaign_characters")
    .select("content, metadata")
    .eq("metadata->>chapter", chapter)
    .limit(180);
  if (looseErr) {
    console.error("[character-rules-snapshot] fetchRowsChapter fallback", looseErr);
    return [];
  }
  out = filterExcluded(((looseData ?? []) as MkRow[]).filter(isPhbLikeRow), excluded);
  return out;
}

async function fetchRowsBySectionKey(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  sectionKey: string,
  chapter: string | null,
  excluded: string[]
): Promise<MkRow[]> {
  if (!sectionKey.trim()) return [];
  let q = admin
    .from("manuals_knowledge" as "campaign_characters")
    .select("content, metadata")
    .eq("metadata->>section_key", sectionKey)
    .limit(220);
  if (chapter?.trim()) q = q.eq("metadata->>chapter", chapter.trim());
  const { data, error } = await q;
  if (error) {
    console.error("[character-rules-snapshot] fetchRowsBySectionKey", error);
    return [];
  }
  return filterExcluded(((data ?? []) as MkRow[]).filter(isPhbLikeRow), excluded);
}

function clipBackgroundRules(md: string): string {
  const MAX = 6_000;
  if (md.length <= MAX) return md;
  return `${md.slice(0, MAX).trim()}\n\n_(Background PHB: testo troncato.)_`;
}

function inferUnlockLevel(text: string): number {
  const t = text.replace(/\r/g, " ");
  const m =
    t.match(/\b(?:a partire dal|al|all['’])\s+(\d+)\s*°\s*livello\b/i) ??
    t.match(/\b(?:quando arriva al)\s+(\d+)\s*°\s*livello\b/i) ??
    t.match(/\b(?:poi di nuovo all['’])\s+(\d+)\s*°\s*livello\b/i);
  const n = m?.[1] ? Number.parseInt(m[1], 10) : 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function filterClassRulesByLevel(md: string, level: number): string {
  const src = md.replace(/\r/g, "").trim();
  if (!src) return "";
  const lines = src.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length && !/^#{1,6}\s+/.test(lines[i].trim())) {
    out.push(lines[i]);
    i += 1;
  }

  type Section = { heading: string; body: string[] };
  const sections: Section[] = [];
  while (i < lines.length) {
    if (!/^#{1,6}\s+/.test(lines[i].trim())) {
      if (sections.length === 0) {
        out.push(lines[i]);
      } else {
        sections[sections.length - 1].body.push(lines[i]);
      }
      i += 1;
      continue;
    }
    const heading = lines[i];
    i += 1;
    const body: string[] = [];
    while (i < lines.length && !/^#{1,6}\s+/.test(lines[i].trim())) {
      body.push(lines[i]);
      i += 1;
    }
    sections.push({ heading, body });
  }

  for (const sec of sections) {
    if (/^#{1,6}\s+equipaggiamento\b/i.test(sec.heading.trim())) {
      continue;
    }
    const unlock = inferUnlockLevel([sec.heading, ...sec.body].join("\n"));
    if (unlock <= level) {
      if (out.length > 0 && out[out.length - 1].trim() !== "") out.push("");
      out.push(sec.heading, ...sec.body);
    }
  }

  return out.join("\n").trim();
}

function parseSpellNamesFromList(md: string): string[] {
  if (!md.trim()) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of md.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^#{1,6}\s*/.test(line)) continue;
    if (/^_*\s*(TRUCCHETTI|\d+°\s*LIVELLO)\s*_*\s*$/i.test(line)) continue;
    const core = line
      .replace(/^(?:[-*]|\d+[.)])\s+/, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s*\([^)]*\)\s*$/g, "")
      .replace(/[;,:.]+$/g, "")
      .trim();
    if (!core || core.length < 2 || core.length > 60) continue;
    const key = core.toLocaleLowerCase("it");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(core);
  }
  return out;
}

function spellRowQualityForMerge(r: MkRow, s: string): number {
  const sec = normalizeHeadingForMatch(metaStr(r.metadata, "section_heading") ?? "");
  const sn = normalizeHeadingForMatch(s);
  if (sec && sec === sn) return 0;
  const c = typeof r.content === "string" ? r.content : "";
  if (c && excerptFirstHeadingMatchesSpell(c, s)) return 1;
  return 2;
}

async function fetchSpellDetails(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  spellNames: string[],
  excluded: string[],
  requestOrigin: string | null
): Promise<Record<string, string> | null> {
  await preloadPhbMarkdown(requestOrigin);

  const out: Record<string, string> = {};
  let chapterIncantesimiMerged = "";
  let chapterIncantesimiLoaded = false;

  const loadChapterIncantesimi = async (): Promise<string> => {
    if (chapterIncantesimiLoaded) return chapterIncantesimiMerged;
    chapterIncantesimiLoaded = true;
    const { data, error } = await admin
      .from("manuals_knowledge" as "campaign_characters")
      .select("content, metadata")
      .ilike("metadata->>chapter", "%INCANTESIMI%")
      .limit(1200);
    if (error) return "";
    const rawRows = (data ?? []) as MkRow[];
    const byBook = filterExcluded(rawRows, excluded);
    const phbRows = byBook.filter(isPhbLikeRow);
    const rows = phbRows.length ? phbRows : byBook;
    chapterIncantesimiMerged = mergeMdChunks(rows).trim();
    return chapterIncantesimiMerged;
  };

  const assignFromMerged = (s: string, merged: string, _sectionKey: string | null) => {
    if (!merged) return false;
    const sliced = extractSpellEntryFromMarkdown(merged, s);
    const pick =
      sliced && excerptFirstHeadingMatchesSpell(sliced, s) ? sliced : merged;
    if (!excerptFirstHeadingMatchesSpell(pick, s)) return false;
    out[s] = sanitizeSpellExcerpt(pick);
    return true;
  };

  for (const s of spellNames.slice(0, 24)) {
    const fromPhbFirst = extractPhbSpellMarkdown(s);
    if (fromPhbFirst.trim() && excerptFirstHeadingMatchesSpell(fromPhbFirst, s)) {
      out[s] = sanitizeSpellExcerpt(fromPhbFirst);
      continue;
    }

    const upper = s.toUpperCase().trim();
    let rows: MkRow[] = [];

    const { data, error } = await admin
      .from("manuals_knowledge" as "campaign_characters")
      .select("content, metadata")
      .eq("metadata->>section_heading", upper)
      .limit(50);
    if (!error) {
      rows = filterExcluded(((data ?? []) as MkRow[]).filter(isPhbLikeRow), excluded).filter((r) =>
        rowLooksLikeSpellsAppendixChunk(r, s)
      );
    }
    if (!rows.length) {
      const { data: headingRows, error: headingErr } = await admin
        .from("manuals_knowledge" as "campaign_characters")
        .select("content, metadata")
        .ilike("metadata->>section_heading", `%${upper}%`)
        .limit(80);
      if (!headingErr) {
        rows = filterExcluded(((headingRows ?? []) as MkRow[]).filter(isPhbLikeRow), excluded).filter((r) => {
          if (!rowLooksLikeSpellsAppendixChunk(r, s)) return false;
          const h = normalizeHeadingForMatch(metaStr(r.metadata, "section_heading") ?? "");
          return headingMatchesSpellName(h, s);
        });
      }
    }
    if (!rows.length) {
      const { data: titleRows, error: titleErr } = await admin
        .from("manuals_knowledge" as "campaign_characters")
        .select("content, metadata")
        .ilike("metadata->>section_title", `%${upper}%`)
        .limit(120);
      if (!titleErr) {
        rows = filterExcluded(((titleRows ?? []) as MkRow[]).filter(isPhbLikeRow), excluded).filter((r) => {
          if (!rowLooksLikeSpellsAppendixChunk(r, s)) return false;
          const t = metaStr(r.metadata, "section_title") ?? "";
          return headingMatchesSpellName(t, s);
        });
      }
    }
    if (!rows.length) {
      const { data: contentRows, error: contentErr } = await admin
        .from("manuals_knowledge" as "campaign_characters")
        .select("content, metadata")
        .ilike("content", `%# ${s}%`)
        .limit(120);
      if (!contentErr) {
        rows = filterExcluded(((contentRows ?? []) as MkRow[]).filter(isPhbLikeRow), excluded).filter((r) =>
          rowLooksLikeSpellsAppendixChunk(r, s)
        );
      }
    }
    if (rows.length) {
      if (rows.length > 1) {
        rows = [...rows].sort((a, b) => spellRowQualityForMerge(a, s) - spellRowQualityForMerge(b, s));
      }
      const sectionKey = metaStr(rows[0]?.metadata, "section_key");
      const chapter = metaStr(rows[0]?.metadata, "chapter");
      if (sectionKey) {
        const expanded = await fetchRowsBySectionKey(admin, sectionKey, chapter, excluded);
        if (expanded.length) rows = expanded;
      }
      const merged = mergeMdChunks(rows).trim();
      if (assignFromMerged(s, merged, sectionKey)) continue;
    }

    const chapterMd = await loadChapterIncantesimi();
    if (chapterMd) {
      const fromChapter = extractSpellEntryFromMarkdown(chapterMd, s);
      if (fromChapter && excerptFirstHeadingMatchesSpell(fromChapter, s)) {
        out[s] = sanitizeSpellExcerpt(fromChapter);
        continue;
      }
    }
  }
  return Object.keys(out).length ? out : null;
}

export async function recomputeCharacterRulesSnapshot(input: {
  campaignId: string;
  level: number;
  characterClass: string | null;
  classSubclass: string | null;
  raceSlug: string | null;
  subclassSlug: string | null;
  backgroundSlug: string | null;
}): Promise<CharacterRulesSnapshotV1> {
  const warnings: string[] = [];
  const level = Math.max(1, Math.min(20, Math.floor(input.level || 1)));
  const admin = createSupabaseAdminClient();
  const { data: camp } = await admin.from("campaigns").select("ai_context").eq("id", input.campaignId).single();
  const excluded = readExcludedManualBookKeysFromAiContextJson(
    (camp as { ai_context?: Json | null } | null)?.ai_context ?? null
  );
  if (excluded.includes(PHB_BOOK_KEY)) {
    warnings.push("Manuale del Giocatore escluso nei paletti campagna: snapshot regole vuoto.");
    return {
      version: 1,
      computedAt: new Date().toISOString(),
      level,
      raceSlug: input.raceSlug,
      subraceSlug: input.subclassSlug,
      classLabel: input.characterClass,
      classSubclass: input.classSubclass,
      backgroundSlug: input.backgroundSlug,
      raceTraitsMd: "",
      subraceTraitsMd: null,
      classPrivilegesMd: "",
      classSubclassMd: null,
      spellcastingMd: null,
      spellsListMd: null,
      spellsDetailsMd: null,
      backgroundRulesMd: null,
      warnings,
    };
  }

  const classDef = classByLabel(input.characterClass);
  const raceDef = raceBySlug(input.raceSlug);
  const bgDef = backgroundBySlug(input.backgroundSlug);

  let raceTraitsMd = "";
  if (raceDef) {
    if (raceDef.traitsContentAnchor) {
      const rows = await fetchRowsContentIlike(admin, `%${raceDef.traitsContentAnchor}%`, excluded);
      raceTraitsMd = mergeMdChunks(rows);
    } else {
      const rows = await fetchRowsSectionHeading(admin, raceDef.traitsSectionHeading, excluded);
      raceTraitsMd = mergeMdChunks(rows);
    }
    if (!raceTraitsMd.trim()) warnings.push(`Tratti razza non trovati in manuals_knowledge per «${raceDef.label}».`);
  }

  let subraceTraitsMd: string | null = null;
  if (raceDef?.subraces?.length && input.subclassSlug?.trim()) {
    const sr = raceDef.subraces.find((sub) => sub.slug === input.subclassSlug);
    if (sr) {
      const rows = await fetchRowsSectionHeading(admin, sr.sectionHeading, excluded);
      subraceTraitsMd = mergeMdChunks(rows) || null;
      if (!subraceTraitsMd?.trim())
        warnings.push(`Sottorazza «${sr.label}»: nessun estratto trovato (ingest PHB?).`);
    }
  }

  let classPrivilegesMd = "";
  if (classDef) {
    let rows = await fetchRowsContentIlike(admin, `%${classDef.privilegesAnchor}%`, excluded);
    const sectionKey = metaStr(rows[0]?.metadata, "section_key");
    const chapter = metaStr(rows[0]?.metadata, "chapter");
    if (sectionKey) {
      const expanded = await fetchRowsBySectionKey(admin, sectionKey, chapter, excluded);
      if (expanded.length) rows = expanded;
    }
    classPrivilegesMd = filterClassRulesByLevel(mergeMdChunks(rows), level);
    if (!classPrivilegesMd.trim())
      warnings.push(`Privilegi di classe non trovati per «${classDef.label}». Verifica ingest ${PHB_MD_FILE}.`);
  }

  let classSubclassMd: string | null = null;
  if (classDef && input.classSubclass?.trim()) {
    const rowByHeading = await fetchRowsSectionHeading(admin, input.classSubclass.trim().toUpperCase(), excluded);
    classSubclassMd = mergeMdChunks(rowByHeading) || null;
    if (!classSubclassMd?.trim()) {
      const byContent = await fetchRowsContentIlike(admin, `%${input.classSubclass.trim()}%`, excluded);
      classSubclassMd = mergeMdChunks(byContent) || null;
    }
    classSubclassMd = classSubclassMd ? filterClassRulesByLevel(classSubclassMd, level) : null;
    if (!classSubclassMd?.trim()) {
      warnings.push(`Sottoclasse «${input.classSubclass}»: estratto non trovato nel PHB.`);
    }
  }

  let spellcastingMd: string | null = null;
  if (classDef?.spellcastingAnchor) {
    const rows = await fetchRowsContentIlike(admin, `%${classDef.spellcastingAnchor}%`, excluded);
    spellcastingMd = mergeMdChunks(rows) || null;
    if (!spellcastingMd?.trim()) warnings.push(`Regole incantesimi di classe non trovate per «${classDef.label}».`);
  }

  let spellsListMd: string | null = null;
  const maxSpl = maxSpellLevelOnSheet(classDef, level);
  if (classDef?.spellList && maxSpl >= 0) {
    let listRows: MkRow[] = [];
    if (classDef.spellList.style === "h1") {
      listRows = await fetchRowsChapter(admin, classDef.spellList.chapter, excluded);
    } else {
      listRows = await fetchRowsSectionHeading(admin, classDef.spellList.sectionHeading, excluded);
    }
    const mergedList = mergeMdChunks(listRows);
    spellsListMd = extractSpellListByMaxLevel(mergedList, maxSpl) || null;
    if (!spellsListMd?.trim())
      warnings.push(`Lista incantesimi non trovata o vuota per «${classDef.label}» (capitolo PHB).`);
  }
  const spellNames = parseSpellNamesFromList(spellsListMd ?? "");
  const requestOrigin = spellNames.length ? await resolveRequestOriginForPhb() : null;
  const spellsDetailsMd = spellNames.length
    ? await fetchSpellDetails(admin, spellNames, excluded, requestOrigin)
    : null;

  let backgroundRulesMd: string | null = null;
  if (bgDef) {
    const rows = await fetchRowsContentIlike(admin, `%${bgDef.opener}%`, excluded);
    const merged = mergeMdChunks(rows);
    backgroundRulesMd = merged.trim() ? clipBackgroundRules(merged) : null;
    if (!backgroundRulesMd?.trim()) warnings.push(`Background PHB «${bgDef.label}»: estratto non trovato.`);
  }

  return {
    version: 1,
    computedAt: new Date().toISOString(),
    level,
    raceSlug: input.raceSlug,
    subraceSlug: input.subclassSlug,
    classLabel: input.characterClass,
    classSubclass: input.classSubclass,
    backgroundSlug: input.backgroundSlug,
    raceTraitsMd,
    subraceTraitsMd,
    classPrivilegesMd,
    classSubclassMd,
    spellcastingMd,
    spellsListMd,
    spellsDetailsMd,
    backgroundRulesMd,
    warnings,
  };
}
