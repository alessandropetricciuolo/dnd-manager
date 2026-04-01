'use server';

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { generateCharacterSheetJSON, generateRagEmbedding } from "@/lib/ai/huggingface-client";

export type GenerateSheetResult = {
  success: boolean;
  message: string;
  sheetData?: Record<string, unknown>;
};

const CHARACTER_SHEET_TEMPLATE: Record<string, unknown> = {
  ClassFilename: "Base",
  CharacterName: "",
  PlayerName: "",
  Race: "",
  ClassLevel: "",
  Subclass: "",
  Background: "",
  Alignment: "",
  Age: "",
  Height: "",
  Weight: "",
  Sex: "",
  XP: "",
  STR: "",
  STRmod: "",
  DEX: "",
  DEXmod: "",
  CON: "",
  CONmod: "",
  INT: "",
  INTmod: "",
  WIS: "",
  WISmod: "",
  CHA: "",
  CHAmod: "",
  ProfBonus: "",
  Passive: "",
  Inspiration: "",
  AC: "",
  Initiative: "",
  Speed: "",
  HPMax: "",
  HD_Value: "",
  HD_Total: "",
  ST_STR: "+0",
  ST_STR_Prof: "",
  ST_DEX: "+0",
  ST_DEX_Prof: "",
  ST_CON: "+0",
  ST_CON_Prof: "",
  ST_INT: "+0",
  ST_INT_Prof: "",
  ST_WIS: "+0",
  ST_WIS_Prof: "",
  ST_CHA: "+0",
  ST_CHA_Prof: "",
  ACRO: "+0",
  ACRO_Prof: "",
  ANIM: "+0",
  ANIM_Prof: "",
  ARC: "+0",
  ARC_Prof: "",
  ATH: "+0",
  ATH_Prof: "",
  DEC: "+0",
  DEC_Prof: "",
  HIST: "+0",
  HIST_Prof: "",
  INS: "+0",
  INS_Prof: "",
  INTI: "+0",
  INTI_Prof: "",
  INV: "+0",
  INV_Prof: "",
  MED: "+0",
  MED_Prof: "",
  NAT: "+0",
  NAT_Prof: "",
  PERC: "+0",
  PERC_Prof: "",
  PERF: "+0",
  PERF_Prof: "",
  PERS: "+0",
  PERS_Prof: "",
  REL: "+0",
  REL_Prof: "",
  SLE: "+0",
  SLE_Prof: "",
  STLTH: "+0",
  STLTH_Prof: "",
  SURV: "+0",
  SURV_Prof: "",
  Prof_LightArmor: "",
  Prof_MediumArmor: "",
  Prof_HeavyArmor: "",
  Prof_Shields: "",
  Prof_SimpleWpn: "",
  Prof_MartialWpn: "",
  Prof_Other: "",
  Wpn1_Name: "",
  Wpn1_Atk: "",
  Wpn1_Dmg: "",
  Wpn1_Type: "",
  Wpn2_Name: "",
  Wpn2_Atk: "",
  Wpn2_Dmg: "",
  Wpn2_Type: "",
  Wpn3_Name: "",
  Wpn3_Atk: "",
  Wpn3_Dmg: "",
  Wpn3_Type: "",
  Wpn4_Name: "",
  Wpn4_Atk: "",
  Wpn4_Dmg: "",
  Wpn4_Type: "",
  Features_Main:
    "--- PRIVILEGI DI CLASSE ---\n(Inserisci qui le descrizioni funzionali dei privilegi copiando i termini dai PDF)\n\n--- TALENTI ---\n(Descrizioni talenti)",
  Feat_Racial: "--- TRATTI RAZZIALI ---\n(Descrizioni tratti)",
  Inventory: "",
  Languages: "",
  CP: "",
  SP: "",
  EP: "",
  GP: "",
  PP: "",
  Gems: "",
  Cantrip_1: "",
  Cantrip_1_Desc: "",
  Cantrip_2: "",
  Cantrip_2_Desc: "",
  Cantrip_3: "",
  Cantrip_3_Desc: "",
  Cantrip_4: "",
  Cantrip_4_Desc: "",
  SpellcastingClass: "",
  SpellcastingAbility: "",
  SpellSaveDC: "",
  SpellAtkBonus: "",
  Slot_L1_1: "",
  Slot_L1_2: "",
  Slot_L1_3: "",
  Slot_L1_4: "",
  Slot_L2_1: "",
  Slot_L2_2: "",
  Slot_L2_3: "",
  Slot_L3_1: "",
  Slot_L3_2: "",
  Slot_L3_3: "",
  Slot_L4_1: "",
  Slot_L4_2: "",
  Slot_L4_3: "",
  Slot_L5_1: "",
  Slot_L5_2: "",
  Slot_L5_3: "",
  Slot_L6_1: "",
  Slot_L6_2: "",
  Slot_L7_1: "",
  Slot_L7_2: "",
  Slot_L8_1: "",
  Slot_L9_1: "",
  SpellList: [
    {
      level: "1",
      name: "",
      desc: "",
      v: "",
      s: "",
      conc: "",
      rit: "",
    },
  ],
};

function forceCharacterSheetShape(
  parsed: Record<string, unknown>,
  seed: { characterName: string; race: string; dndClass: string; level: string }
): Record<string, unknown> {
  const merged = {
    ...CHARACTER_SHEET_TEMPLATE,
    ...parsed,
  } as Record<string, unknown>;

  if (!Array.isArray(merged.SpellList)) {
    merged.SpellList = CHARACTER_SHEET_TEMPLATE.SpellList;
  }

  // Campi base sempre coerenti con input utente.
  merged.CharacterName = seed.characterName || String(merged.CharacterName ?? "");
  merged.Race = seed.race || String(merged.Race ?? "");
  merged.ClassLevel = `${seed.dndClass} ${seed.level}`.trim();
  merged.ClassFilename = "Base";

  return merged;
}

export async function generateSheetAction(
  formData: FormData
): Promise<GenerateSheetResult> {
  const characterName = (formData.get("characterName") as string | null)?.trim() ?? "";
  const race = (formData.get("race") as string | null)?.trim() ?? "";
  const dndClass = (formData.get("dndClass") as string | null)?.trim() ?? "";
  const level = (formData.get("level") as string | null)?.trim() ?? "";

  if (!race || !dndClass || !level) {
    return {
      success: false,
      message: "Compila razza, classe e livello.",
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    // La signature RPC non e' ancora tipizzata nel Database generated type.
    const runRpc = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const searchQuery = `Manuale D&D: Regole, privilegi e capacità della classe ${dndClass} fino al livello ${level}. Tratti razziali della razza ${race}.`;
    let list: Array<{ content?: string | null }> = [];
    let retrievalMode = "semantic";

    try {
      const embedding = await generateRagEmbedding(searchQuery);
      const { data: chunks, error } = await runRpc("match_manuals_knowledge", {
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: 10,
      });

      if (error) {
        return {
          success: false,
          message: `Errore RPC match_manuals_knowledge: ${error.message}`,
        };
      }
      list = (chunks ?? []) as Array<{ content?: string | null }>;
    } catch (embeddingErr) {
      // Fallback runtime: se gli embeddings non sono disponibili sul provider,
      // manteniamo operativo il generatore con retrieval testuale best-effort.
      retrievalMode = "text-fallback";
      console.error("[generateSheetAction] embedding retrieval failed, fallback text search", embeddingErr);

      const keywords = [dndClass, race]
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 2);

      const primary = keywords[0] ?? "";
      const secondary = keywords[1] ?? "";

      let query = supabase.from("manuals_knowledge").select("content").limit(10);
      if (primary) query = query.ilike("content", `%${primary}%`);
      if (secondary) query = query.ilike("content", `%${secondary}%`);
      const { data: rows, error: textErr } = await query;

      if (textErr) {
        return {
          success: false,
          message: `Errore fallback testuale manuals_knowledge: ${textErr.message}`,
        };
      }
      list = (rows ?? []) as Array<{ content?: string | null }>;
    }

    const retrievedContext = list
      .map((c) => (typeof c.content === "string" ? c.content.trim() : ""))
      .filter(Boolean)
      .join("\n\n");

    const strictPrompt = [
      `Genera la scheda per ${characterName}, un ${race} ${dndClass} di livello ${level}.`,
      "RISPETTA ESATTAMENTE la seguente struttura JSON (stesse chiavi):",
      JSON.stringify(CHARACTER_SHEET_TEMPLATE),
      "Compila i campi con i dati più probabili da contesto D&D 5e. Se un dato non è noto, lascia stringa vuota.",
      "Non aggiungere chiavi extra e non rimuovere chiavi esistenti.",
    ].join("\n\n");

    const rawJsonString = await generateCharacterSheetJSON(strictPrompt, retrievedContext);

    let sheetData: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawJsonString) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Il modello non ha restituito un oggetto JSON valido.");
      }
      sheetData = forceCharacterSheetShape(parsed as Record<string, unknown>, {
        characterName,
        race,
        dndClass,
        level,
      });
    } catch (parseError) {
      console.error("[generateSheetAction] parse JSON failed", parseError);
      console.error("[generateSheetAction] raw JSON string", rawJsonString);
      return {
        success: false,
        message: "JSON non valido restituito dal modello. Controlla i log server.",
      };
    }

    return {
      success: true,
      message: `Scheda JSON generata con successo (${race} ${dndClass} livello ${level}) [mode: ${retrievalMode}].`,
      sheetData,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Errore durante il retrieval semantico: ${error.message}`
          : "Errore imprevisto durante il retrieval semantico.",
    };
  }
}
