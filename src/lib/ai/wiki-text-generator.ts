'use server';

import type { Json } from "@/types/database.types";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { generateAiText, generateRagEmbedding, HuggingFaceInferenceError } from "@/lib/ai/huggingface-client";
import {
  parseCampaignAiContextFromDb,
  readExcludedManualBookKeysFromAiContextJson,
} from "@/lib/campaign-ai-context";
import { fetchLongCampaignWikiMemoryPromptBlock } from "@/lib/campaign-wiki-ai-memory";

export type WikiMarkdownEntityType = "npc" | "location" | "item" | "lore" | "monster" | "magic_item";

export type WikiMarkdownExtraParams = {
  cr?: string;
  rarity?: string;
  /** Per NPC: valori espliciti per retrieval mirato sui manuali. */
  npcRace?: string;
  npcClass?: string;
  npcLevel?: string;
  /**
   * Statblock mostro già estratto dal bestiario indicizzato (testo meccanico senza riscrittura LLM).
   * Accostato a narrativa generata con priorità alla memoria di campagna.
   */
  verbatimMonsterStatblock?: string;
};

export type ExtractedWikiStats = {
  ac: string | null;
  hp: string | null;
  cr: string | null;
};

export type ExtractedNpcTraits = {
  race: string | null;
  class: string | null;
  age: string | null;
};

export type GenerateWikiMarkdownResult =
  | {
      success: true;
      description: string;
      statblock: string;
      stats?: ExtractedWikiStats;
      npcTraits?: ExtractedNpcTraits;
    }
  | { success: false; message: string };

function cleanSingleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function buildKeywordCandidates(name: string, userPrompt: string): string[] {
  const base = `${name} ${userPrompt}`.toLowerCase();
  const cleaned = base.replace(/[^a-z0-9àèéìòóù/\s-]/gi, " ");
  const stopwords = new Set([
    "un",
    "una",
    "uno",
    "il",
    "lo",
    "la",
    "i",
    "gli",
    "le",
    "di",
    "del",
    "della",
    "dei",
    "degli",
    "delle",
    "che",
    "con",
    "per",
    "nel",
    "nella",
    "nello",
    "vuole",
    "sempre",
    "mondo",
  ]);

  const words = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !stopwords.has(w));

  const unique = Array.from(new Set([name.toLowerCase().trim(), ...words]));
  return unique.slice(0, 8);
}

function splitPromptByDash(userPrompt: string): { retrievalPrompt: string; narrativePrompt: string } {
  const raw = userPrompt.trim();
  if (!raw) return { retrievalPrompt: "", narrativePrompt: "" };
  const dashIdx = raw.indexOf("-");
  if (dashIdx < 0) {
    return { retrievalPrompt: raw, narrativePrompt: raw };
  }
  const left = raw.slice(0, dashIdx).trim();
  const right = raw.slice(dashIdx + 1).trim();
  return {
    retrievalPrompt: left || raw,
    narrativePrompt: right || left || raw,
  };
}

function extractStatsFromMarkdown(markdown: string): ExtractedWikiStats {
  const source = markdown.replace(/\r/g, "");

  const acMatch =
    source.match(/(?:Classe\s+Armatura|Armor\s+Class|CA)\*{0,2}\s*[:\-]\s*(\d{1,3})/i) ??
    source.match(/\bAC\*{0,2}\s*[:\-]\s*(\d{1,3})/i) ??
    source.match(/\|\s*(?:Classe\s+Armatura|Armor\s+Class|CA)\s*\|\s*(\d{1,3})\s*\|/i);

  const hpMatch =
    source.match(/(?:Punti\s+Vita|Hit\s+Points|HP|PF)\*{0,2}\s*[:\-]\s*(\d{1,4})/i) ??
    source.match(/\bHP\*{0,2}\s*[:\-]\s*(\d{1,4})/i) ??
    source.match(/\|\s*(?:Punti\s+Vita|Hit\s+Points|HP|PF)\s*\|\s*(\d{1,4})\s*\|/i);

  const crMatch =
    source.match(/(?:Grado\s+di\s+Sfida|Challenge\s+Rating|CR|GS)\*{0,2}\s*[:\-]\s*([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)/i) ??
    source.match(/\bCR\*{0,2}\s*[:\-]\s*([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)/i) ??
    source.match(/\|\s*(?:Grado\s+di\s+Sfida|Challenge\s+Rating|CR|GS)\s*\|\s*([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)\s*\|/i);

  return {
    ac: acMatch?.[1] ?? null,
    hp: hpMatch?.[1] ?? null,
    cr: crMatch?.[1]?.trim() ?? null,
  };
}

function splitNarrativeAndMechanics(raw: string): { description: string; statblock: string } {
  const source = raw.replace(/\r/g, "").trim();
  const narrativeMatch = source.match(/\[NARRATIVA\]([\s\S]*?)\[MECCANICA\]/i);
  const mechanicMatch = source.match(/\[MECCANICA\]([\s\S]*)/i);

  if (narrativeMatch || mechanicMatch) {
    const description = narrativeMatch ? narrativeMatch[1].trim() : source;
    const statblock = mechanicMatch ? mechanicMatch[1].trim() : "";
    return { description, statblock };
  }

  // Fallback euristico se il modello non rispetta i tag.
  const mechanicHeading =
    source.match(/\n#{1,6}\s*(stat\s*block|meccanica|scheda\s*tecnica|dati\s*meccanici)\b/i) ??
    source.match(/\n\*\*(stat\s*block|meccanica|scheda\s*tecnica|dati\s*meccanici)\*\*/i);

  if (mechanicHeading && typeof mechanicHeading.index === "number") {
    const splitAt = mechanicHeading.index;
    const description = source.slice(0, splitAt).trim();
    const statblock = source.slice(splitAt).trim();
    return { description: description || source, statblock };
  }

  // Ultimo fallback: se sembra uno statblock tabellare, consideralo meccanica.
  const looksMechanical =
    /\b(?:CA|AC|HP|PF|GS|CR|Classe Armatura|Punti Vita|Challenge Rating)\b/i.test(source) &&
    /\|/.test(source);

  if (looksMechanical) {
    return { description: "", statblock: source };
  }

  const description = source;
  const statblock = "";
  return { description, statblock };
}

function sanitizeMarkdownResponse(raw: string): string {
  return raw
    .replace(/^```markdown\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function looksLikePromptLeakage(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("as per format standard") ||
    t.includes("they said") ||
    t.includes("actually they said") ||
    t.includes("means we should") ||
    t.includes("possibly they want")
  );
}

function hasStrictNarrativeMechanicsSections(text: string): boolean {
  const narrative = text.match(/\[NARRATIVA\]([\s\S]*?)\[MECCANICA\]/i);
  const mechanics = text.match(/\[MECCANICA\]([\s\S]*)/i);
  const narrativeBody = narrative?.[1]?.trim() ?? "";
  const mechanicsBody = mechanics?.[1]?.trim() ?? "";
  return narrativeBody.length > 12 && mechanicsBody.length > 12;
}

function filterRowsByExcludedManuals<T extends { metadata?: unknown }>(rows: T[], excluded: string[]): T[] {
  if (!excluded.length) return rows;
  const ex = new Set(excluded);
  return rows.filter((r) => {
    const m = r.metadata as Record<string, unknown> | null | undefined;
    const k = m?.manual_book_key;
    if (typeof k !== "string") return true;
    return !ex.has(k);
  });
}

function campaignMemoryPriorityBlock(wikiMemory: string): string {
  const mem = wikiMemory.trim();
  if (!mem) {
    return [
      "REGOLA PRIORITARIA — Memoria di campagna: quando attiva, le voci wiki segnate per la cronaca canon hanno priorità su qualsiasi descrizione generica del modello su personaggi, luoghi e eventi.",
    ].join("\n");
  }
  return [
    mem,
    "",
    "REGOLA PRIORITARIA: il testo sopra (memoria / cronaca di campagna) HA PRECEDENZA su ipotesi generiche. Se entra in conflitto con una descrizione «tipica» del multiverso D&D, segui SEMPRE la memoria di campagna per nomi propri, relazioni, fatti accaduti e interpretazione della creatura o del PNG nel mondo.",
  ].join("\n");
}

function extractNpcTraitsFromMarkdown(markdown: string): ExtractedNpcTraits {
  const source = markdown.replace(/\r/g, "");
  const raceMatch =
    source.match(/(?:Razza|Race)\*{0,2}\s*[:\-]\s*([^\n|]+)/i) ??
    source.match(/\|\s*(?:Razza|Race)\s*\|\s*([^\n|]+)\|/i);
  const classMatch =
    source.match(/(?:Classe|Class)\*{0,2}\s*[:\-]\s*([^\n|]+)/i) ??
    source.match(/\|\s*(?:Classe|Class)\s*\|\s*([^\n|]+)\|/i);
  const ageMatch =
    source.match(/(?:Et[aà]|Age)\*{0,2}\s*[:\-]\s*([^\n|]+)/i) ??
    source.match(/\|\s*(?:Et[aà]|Age)\s*\|\s*([^\n|]+)\|/i);

  const pick = (v?: string | null) => {
    const t = v?.trim() ?? "";
    return t ? t : null;
  };

  return {
    race: pick(raceMatch?.[1]),
    class: pick(classMatch?.[1]),
    age: pick(ageMatch?.[1]),
  };
}

export async function generateWikiMarkdownAction(
  campaignId: string,
  entityType: WikiMarkdownEntityType,
  name: string,
  userPrompt: string,
  extraParams: WikiMarkdownExtraParams = {}
): Promise<GenerateWikiMarkdownResult> {
  const safeName = cleanSingleLine(name ?? "");
  const safeUserPrompt = cleanSingleLine(userPrompt ?? "");
  const { retrievalPrompt, narrativePrompt } = splitPromptByDash(safeUserPrompt);
  const safeRetrievalPrompt = cleanSingleLine(retrievalPrompt);
  const safeNarrativePrompt = cleanSingleLine(narrativePrompt);
  if (!campaignId) return { success: false, message: "Campagna non valida." };
  if (!safeName) return { success: false, message: "Inserisci un nome valido." };

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, message: "Devi essere autenticato." };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Solo GM e Admin possono generare contenuti AI." };
    }

    const admin = createSupabaseAdminClient();
    const { data: campaign, error: campaignError } = await admin
      .from("campaigns")
      .select("ai_context, type")
      .eq("id", campaignId)
      .single();
    if (campaignError) {
      return { success: false, message: campaignError.message ?? "Impossibile leggere la campagna." };
    }

    const ctx = parseCampaignAiContextFromDb((campaign as { ai_context: Json | null } | null)?.ai_context ?? null);
    const wikiMemory =
      (campaign as { type?: string }).type === "long"
        ? await fetchLongCampaignWikiMemoryPromptBlock(admin, campaignId)
        : "";
    const loreTone = ctx?.narrative_tone?.trim() || "fantasy epico e coerente con D&D 5e";
    const magicLevel = ctx?.magic_level?.trim() || "livello di magia standard D&D 5e";
    const mechanics = ctx?.mechanics_focus?.trim() || "regole ufficiali D&D 5e";
    const cr = cleanSingleLine(extraParams.cr ?? "");
    const rarity = cleanSingleLine(extraParams.rarity ?? "");
    const excludedManuals = readExcludedManualBookKeysFromAiContextJson(
      (campaign as { ai_context: Json | null } | null)?.ai_context ?? null
    );

    const normalizedType: Exclude<WikiMarkdownEntityType, "magic_item"> =
      entityType === "magic_item" ? "item" : entityType;

    const templateInstructionMap: Record<Exclude<WikiMarkdownEntityType, "magic_item">, string> = {
      monster: [
        "Genera una scheda MONSTRO in Markdown pronta per wiki GM.",
        "Usa sezioni in quest'ordine:",
        "1) # Nome",
        "2) > Tag: Mostro, CR",
        "3) ## Panoramica",
        "4) ## Stat Block (tabella markdown con CA, PF, Velocita', FOR, DES, COS, INT, SAG, CAR, TS, Abilita', Sensi, Linguaggi, CR, PE)",
        "5) ## Tratti",
        "6) ## Azioni",
        "7) ## Reazioni (se presenti)",
        "8) ## Azioni Leggendarie (se presenti)",
        "9) ## Tattiche e uso al tavolo",
      ].join("\n"),
      npc: [
        "Genera una scheda NPC in Markdown pronta per wiki GM.",
        "Usa sezioni in quest'ordine:",
        "1) # Nome",
        "2) > Tag: NPC",
        "3) ## Profilo Rapido",
        "4) - Razza: <valore>",
        "5) - Classe: <valore>",
        "6) - Età: <valore>",
        "7) ## Aspetto",
        "8) ## Tratti Caratteriali",
        "9) ### Ideali",
        "10) ### Legami",
        "11) ### Difetti",
        "12) ## Ruolo / Occupazione",
        "13) ## Segreti / Rumors",
      ].join("\n"),
      location: [
        "Genera una scheda LUOGO in Markdown pronta per wiki GM.",
        "Usa sezioni in quest'ordine:",
        "1) # Nome",
        "2) > Tag: Luogo",
        "3) ## Atmosfera / Clima",
        "4) ## Punti di Interesse principali",
        "5) ## Abitanti notevoli",
        "6) ## Spunti per Avventure (Plot Hooks)",
      ].join("\n"),
      item: [
        "Genera una scheda OGGETTO MAGICO in Markdown pronta per wiki GM.",
        "Usa sezioni in quest'ordine:",
        "1) # Nome",
        "2) > Tag: Oggetto Magico, Rarita', Sintonia",
        "3) ## Tipologia / Rarita'",
        "4) ## Requisiti di Sintonia",
        "5) ## Aspetto Visivo",
        "6) ## Meccaniche / Regole esatte",
      ].join("\n"),
      lore: [
        "Genera una scheda LORE narrativa in Markdown pronta per wiki GM.",
        "Usa sezioni in quest'ordine:",
        "1) # Titolo",
        "2) > Tag: Lore",
        "3) ## Contesto Storico",
        "4) ## Fazioni Coinvolte",
        "5) ## Impatto attuale sul mondo",
      ].join("\n"),
    };

    const paramLine =
      normalizedType === "monster"
        ? `Parametro richiesto: CR target = ${cr || "scegli un CR bilanciato rispetto alle regole."}`
        : normalizedType === "item"
          ? `Parametro richiesto: Rarita' target = ${rarity || "scegli una rarita' coerente e bilanciata."}`
          : "Parametro richiesto: mantieni coerenza con ambientazione, tono e regole della campagna.";

    const runRpc = admin.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>;

    type RagRow = { content?: string | null; metadata?: Record<string, unknown> | null };

    let prompt = "";
    let prebuiltMarkdown: string | null = null;

    if (normalizedType === "monster" && extraParams.verbatimMonsterStatblock?.trim()) {
      const verbatim = extraParams.verbatimMonsterStatblock.trim();
      const narrativePrompt = [
        campaignMemoryPriorityBlock(wikiMemory),
        `Tono narrativo campagna: ${loreTone}`,
        `Livello di magia: ${magicLevel}`,
        "",
        `Il mostro "${safeName}" userà lo statblock copiato dal manuale indicizzato (testo sotto [MECCANICA], senza riscrittura). NON inventare né elencare CA, PF, punteggi caratteristica, TS, azioni, danni o CD.`,
        `Richiesta narrativa e di trama: ${safeNarrativePrompt || "Nessuna istruzione aggiuntiva."}`,
        "",
        "Scrivi solo parte descrittiva (aspetto, comportamento, ruolo nella storia), in Markdown.",
        "Apri con il tag esatto [NARRATIVA] sulla prima riga, poi il contenuto. Non usare [MECCANICA].",
      ]
        .filter(Boolean)
        .join("\n");
      let narrativeRaw = "";
      try {
        narrativeRaw = (await generateAiText(narrativePrompt)).trim();
      } catch (e) {
        const msg =
          e instanceof HuggingFaceInferenceError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Errore generazione narrativa.";
        return { success: false, message: msg };
      }
      narrativeRaw = narrativeRaw
        .replace(/^```(?:markdown)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      if (/^\[NARRATIVA\]/i.test(narrativeRaw)) {
        narrativeRaw = narrativeRaw.replace(/^\[NARRATIVA\]\s*/i, "").trim();
      }
      prebuiltMarkdown = `[NARRATIVA]\n${narrativeRaw}\n\n[MECCANICA]\n\n${verbatim}`;
    } else if (normalizedType === "monster") {
      const searchQuery = `Regole, privilegi e statblock completo del mostro: ${safeName}. Dettagli tecnici: ${safeRetrievalPrompt || "nessuno"}.`;
      let technicalContext = "";
      try {
        const embedding = await generateRagEmbedding(searchQuery);
        let lastFiltered: RagRow[] = [];
        let rpcError: { message: string } | null = null;
        for (const threshold of [0.35, 0.28, 0.2]) {
          const res = await runRpc("match_manuals_knowledge", {
            query_embedding: embedding,
            match_threshold: threshold,
            match_count: 10,
          });
          rpcError = res.error;
          if (rpcError) break;
          const list = filterRowsByExcludedManuals((res.data ?? []) as RagRow[], excludedManuals);
          lastFiltered = list;
          if (list.some((c) => typeof c.content === "string" && c.content.trim().length > 0)) {
            break;
          }
        }

        if (rpcError) {
          return { success: false, message: `Errore RPC match_manuals_knowledge: ${rpcError.message}` };
        }

        const list = lastFiltered;
        technicalContext = list
          .map((c) => (typeof c.content === "string" ? c.content.trim() : ""))
          .filter(Boolean)
          .join("\n\n");
      } catch (ragError) {
        console.error("[generateWikiMarkdownAction] semantic RAG failed, fallback text", ragError);
        const keywords = buildKeywordCandidates(safeName, safeRetrievalPrompt || safeUserPrompt);

        try {
          const orExpr = keywords.map((kw) => `content.ilike.%${kw}%`).join(",");
          const { data: rows, error: textErr } = await admin
            .from("manuals_knowledge")
            .select("content, metadata")
            .or(orExpr)
            .limit(24);
          if (textErr) {
            return {
              success: false,
              message: `Errore fallback retrieval testuale manuals_knowledge: ${textErr.message}`,
            };
          }
          const filtered = filterRowsByExcludedManuals((rows ?? []) as RagRow[], excludedManuals);
          technicalContext = filtered
            .map((r) => (typeof r.content === "string" ? r.content.trim() : ""))
            .filter(Boolean)
            .join("\n\n");
        } catch (fallbackErr) {
          console.error("[generateWikiMarkdownAction] text fallback failed", fallbackErr);
          return { success: false, message: "Errore durante il retrieval tecnico dei manuali." };
        }
      }

      if (!technicalContext.trim()) {
        return {
          success: false,
          message:
            excludedManuals.length > 0
              ? "Nessun estratto dai manuali ammessi (verifica i manuali non esclusi nei paletti campagna)."
              : "Nessuna informazione tecnica trovata nei manuali per questo mostro.",
        };
      }

      prompt = [
        "Sei un motore di formattazione.",
        campaignMemoryPriorityBlock(wikiMemory),
        `[CONTESTO TECNICO]:\n${technicalContext}`,
        `RICHIESTA SPECIFICA DELL'UTENTE: Il nome dell'entità è "${safeName}". Segui queste istruzioni per i dettagli: "${safeNarrativePrompt || "Nessuna istruzione aggiuntiva."}".`,
        `Nome mostro richiesto: ${safeName}`,
        `Grado di Sfida target: ${cr || "1"}`,
        "Usa ESCLUSIVAMENTE il [CONTESTO TECNICO] fornito (fonte: manuali importati).",
        "Se contiene lo statblock di un mostro diverso, ignoralo.",
        "Se non contiene nulla di pertinente, restituisci solo: NO_TECHNICAL_DATA",
        `Se contiene i dati, compila il template Markdown copiando i valori numerici e le azioni dal contesto senza alterarli:`,
        templateInstructionMap.monster,
        "Devi dividere la tua risposta esattamente in due parti usando questi delimitatori esatti: inizia la descrizione narrativa con il tag [NARRATIVA] e inizia lo statblock con il tag [MECCANICA]. Non inserire testo prima di [NARRATIVA].",
        "NO parole extra prima o dopo.",
      ]
        .filter((s) => typeof s === "string" && s.trim().length > 0)
        .join("\n\n");
    } else if (normalizedType === "npc") {
      const npcRace = cleanSingleLine(extraParams.npcRace ?? "");
      const npcClass = cleanSingleLine(extraParams.npcClass ?? "");
      const npcLevel = cleanSingleLine(extraParams.npcLevel ?? "");
      if (!npcRace || !npcClass || !npcLevel) {
        return {
          success: false,
          message:
            "Per gli NPC con AI devi indicare razza, classe e livello (menu sotto l'assistente) così il sistema usa solo i manuali ammessi.",
        };
      }
      const searchQuery = `D&D 5e razza ${npcRace}: tratti, taglia, velocità. Classe ${npcClass} livello ${npcLevel}: privilegi di classe, tabella progressione, sottoclasse se presente. ${safeRetrievalPrompt || ""}`;
      let technicalContext = "";
      try {
        const embedding = await generateRagEmbedding(searchQuery);
        let picked: RagRow[] = [];
        let rpcError: { message: string } | null = null;
        for (const threshold of [0.34, 0.26, 0.18]) {
          const res = await runRpc("match_manuals_knowledge", {
            query_embedding: embedding,
            match_threshold: threshold,
            match_count: 14,
          });
          rpcError = res.error;
          if (rpcError) break;
          const list = filterRowsByExcludedManuals((res.data ?? []) as RagRow[], excludedManuals);
          if (list.some((c) => typeof c.content === "string" && c.content.trim().length > 0)) {
            picked = list;
            break;
          }
        }
        if (rpcError) {
          return { success: false, message: `Errore RPC match_manuals_knowledge: ${rpcError.message}` };
        }
        technicalContext = picked
          .map((c) => (typeof c.content === "string" ? c.content.trim() : ""))
          .filter(Boolean)
          .join("\n\n");
      } catch (ragError) {
        console.error("[generateWikiMarkdownAction] NPC RAG failed, fallback", ragError);
        const keywords = buildKeywordCandidates(`${npcRace} ${npcClass} ${npcLevel}`, safeUserPrompt);
        try {
          const orExpr = keywords.map((kw) => `content.ilike.%${kw}%`).join(",");
          const { data: rows, error: textErr } = await admin
            .from("manuals_knowledge")
            .select("content, metadata")
            .or(orExpr)
            .limit(24);
          if (textErr) {
            return { success: false, message: `Errore retrieval NPC: ${textErr.message}` };
          }
          const filtered = filterRowsByExcludedManuals((rows ?? []) as RagRow[], excludedManuals);
          technicalContext = filtered
            .map((r) => (typeof r.content === "string" ? r.content.trim() : ""))
            .filter(Boolean)
            .join("\n\n");
        } catch (fallbackErr) {
          console.error("[generateWikiMarkdownAction] NPC text fallback failed", fallbackErr);
          return { success: false, message: "Errore durante il retrieval dai manuali per l'NPC." };
        }
      }
      if (!technicalContext.trim()) {
        return {
          success: false,
          message:
            excludedManuals.length > 0
              ? "Nessun estratto utile dai manuali ammessi per questa razza/classe. Controlla esclusioni o prova altri termini nella richiesta (prima del -)."
              : "Nessun estratto dai manuali per questa razza/classe/livello.",
        };
      }
      prompt = [
        "Sei un motore di compilazione per schede NPC D&D 5e.",
        campaignMemoryPriorityBlock(wikiMemory),
        `[CONTESTO TECNICO — solo dai manuali importati]:\n${technicalContext}`,
        `Nome PNG: ${safeName}`,
        `Razza (vincolata): ${npcRace}`,
        `Classe (vincolata): ${npcClass}`,
        `Livello (vincolato): ${npcLevel}`,
        `Richiesta narrativa/aggiuntiva: ${safeNarrativePrompt || "Nessuna."}`,
        "Per la parte [MECCANICA] usa ESCLUSIVAMENTE privilegi e numeri supportati dal CONTESTO TECNICO (tiri salvezza, CD, attacchi, PF se deducibili). Non inventare privilegi non presenti.",
        "La [NARRATIVA] (personalità, aspetto, storia nel mondo) deve rispettare la memoria di campagna quando presente.",
        templateInstructionMap.npc,
        "Nelle righe Profilo Rapido, usa esattamente la razza, classe ed età coerenti con le istruzioni (età puoi dedurla dalla richiesta o indicare un valore plausibile).",
        "Apri con [NARRATIVA] poi dopo [MECCANICA] come da formato standard.",
        "Rispondi SOLO in Markdown, senza JSON.",
      ]
        .filter((s) => typeof s === "string" && s.trim().length > 0)
        .join("\n\n");
    } else {
      prompt = [
        "Sei un Senior D&D 5e Content Designer.",
        campaignMemoryPriorityBlock(wikiMemory),
        `Tono campagna: ${loreTone}`,
        `Livello magia: ${magicLevel}`,
        `Focus meccanico: ${mechanics}`,
        `Tipo elemento: ${normalizedType}`,
        `RICHIESTA SPECIFICA DELL'UTENTE: Il nome dell'entità è "${safeName}". Segui queste istruzioni per i dettagli: "${safeNarrativePrompt || "Nessuna istruzione aggiuntiva."}".`,
        `Nome elemento: ${safeName}`,
        paramLine,
        templateInstructionMap[normalizedType],
        "Devi dividere la tua risposta esattamente in due parti usando questi delimitatori esatti: inizia la descrizione narrativa con il tag [NARRATIVA] e inizia lo statblock con il tag [MECCANICA]. Non inserire testo prima di [NARRATIVA].",
        "Rispondi SOLO con Markdown valido, senza JSON e senza testo extra prima/dopo.",
      ]
        .filter((s) => typeof s === "string" && s.trim().length > 0)
        .join("\n\n");
    }

    let markdown = "";
    try {
      if (prebuiltMarkdown) {
        markdown = prebuiltMarkdown;
      } else {
        const first = sanitizeMarkdownResponse((await generateAiText(prompt)).trim());
        const firstBad = looksLikePromptLeakage(first) || !hasStrictNarrativeMechanicsSections(first);
        if (!firstBad || first === "NO_TECHNICAL_DATA") {
          markdown = first;
        } else {
          const repairPrompt = [
            "Correggi l'output precedente: era fuori formato o includeva meta-ragionamento.",
            "Regole NON negoziabili:",
            "1) Inizia ESATTAMENTE con [NARRATIVA] come prima riga.",
            "2) Poi inserisci [MECCANICA] e solo contenuto meccanico pertinente.",
            "3) Nessun commento sul prompt, nessun 'they said', nessun testo meta.",
            "4) Mantieni lo stesso contenuto utile, ripulito e ben formattato.",
            "",
            "OUTPUT DA CORREGGERE:",
            first,
          ].join("\n");
          markdown = sanitizeMarkdownResponse((await generateAiText(repairPrompt)).trim());
        }
      }
    } catch (err) {
      const msg =
        err instanceof HuggingFaceInferenceError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Errore generazione testo AI.";
      return { success: false, message: msg };
    }

    const normalized = sanitizeMarkdownResponse(markdown);

    if (normalized === "NO_TECHNICAL_DATA") {
      return {
        success: false,
        message: "Nessuna informazione tecnica trovata nei manuali per questo mostro.",
      };
    }

    if (!normalized) {
      return { success: false, message: "Il modello non ha restituito contenuto markdown." };
    }

    if (looksLikePromptLeakage(normalized)) {
      return {
        success: false,
        message:
          "Il modello ha restituito un output fuori formato (meta-ragionamento). Riprova: il sistema ha bloccato la risposta non valida.",
      };
    }

    const { description, statblock } = splitNarrativeAndMechanics(normalized);
    const extractedStats = normalizedType === "monster"
      ? (() => {
          const fromStatblock = extractStatsFromMarkdown(statblock || "");
          if (fromStatblock.ac || fromStatblock.hp || fromStatblock.cr) return fromStatblock;
          return extractStatsFromMarkdown(normalized);
        })()
      : undefined;
    const extractedNpcTraits = normalizedType === "npc"
      ? (() => {
          const fromMd = (() => {
            const fromStatblock = extractNpcTraitsFromMarkdown(statblock || "");
            if (fromStatblock.race || fromStatblock.class || fromStatblock.age) return fromStatblock;
            return extractNpcTraitsFromMarkdown(normalized);
          })();
          const raceFallback = cleanSingleLine(extraParams.npcRace ?? "");
          const classFallback = cleanSingleLine(extraParams.npcClass ?? "");
          return {
            race: (fromMd.race?.trim() || raceFallback) || null,
            class: (fromMd.class?.trim() || classFallback) || null,
            age: fromMd.age,
          };
        })()
      : undefined;

    return {
      success: true,
      description,
      statblock,
      stats: extractedStats,
      npcTraits: extractedNpcTraits,
    };
  } catch (err) {
    console.error("[generateWikiMarkdownAction]", err);
    return { success: false, message: "Errore imprevisto durante la generazione." };
  }
}
