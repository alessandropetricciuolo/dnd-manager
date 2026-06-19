import type { ImageBenchmarkCategory } from "./types";
import { SITE_IMAGE_MODEL } from "@/lib/ai/openrouter-image-preview";

/** Modello OpenRouter usato per tutte le generazioni immagine del sito. */
export { SITE_IMAGE_MODEL };

/** Alias per compatibilità benchmark (un solo modello). */
export const OPENROUTER_IMAGE_BENCHMARK_MODELS = [SITE_IMAGE_MODEL] as const;

export type OpenRouterImageBenchmarkModel = (typeof OPENROUTER_IMAGE_BENCHMARK_MODELS)[number];

export const IMAGE_BENCHMARK_CATEGORIES: ImageBenchmarkCategory[] = [
  "NPC fantasy",
  "Mostro",
  "Luogo",
  "Oggetto magico",
  "Handout",
  "Locandina",
  "Token portrait",
  "Mappa / ambiente",
];

export const IMAGE_BENCHMARK_ASPECT_RATIOS = [
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
] as const;

export const MAX_PROMPTS_PER_RUN = 10;
export const BENCHMARK_CONCURRENCY = 2;

export type PresetPrompt = {
  id: string;
  category: ImageBenchmarkCategory;
  label: string;
  prompt: string;
  aspectRatio: string;
};

export const PRESET_BENCHMARK_PROMPTS: PresetPrompt[] = [
  {
    id: "npc-guild-master",
    category: "NPC fantasy",
    label: "Maestro di gilda",
    aspectRatio: "1:1",
    prompt:
      "Ritratto fantasy realistico di un vecchio maestro di gilda, volto segnato, barba grigia intrecciata, occhi chiari quasi bianchi, mantello blu scuro con dettagli dorati, atmosfera cinematografica, sfondo scuro, luce morbida laterale, alta qualità, senza testo, senza watermark.",
  },
  {
    id: "monster-corrupted-dragon",
    category: "Mostro",
    label: "Drago corrotto",
    aspectRatio: "16:9",
    prompt:
      "Creatura fantasy oscura simile a un drago corrotto, scaglie nere e viola, occhi teal luminosi, corpo parzialmente nascosto nella nebbia, posa minacciosa, concept art cinematografica, dettagli elevati, senza testo, senza watermark.",
  },
  {
    id: "magic-d20",
    category: "Oggetto magico",
    label: "Dado magico",
    aspectRatio: "1:1",
    prompt:
      "Antico dado a venti facce magico sospeso in aria, cristallo teal luminoso, rune incise, sfondo scuro, luce volumetrica, stile fantasy premium, immagine centrata, senza testo, senza watermark.",
  },
  {
    id: "handout-parchment",
    category: "Handout",
    label: "Pergamena",
    aspectRatio: "4:3",
    prompt:
      "Pergamena fantasy antica appoggiata su tavolo di legno scuro, sigillo in ceralacca rosso, mappa incompleta disegnata a mano, piccole rune ai bordi, atmosfera misteriosa, alta qualità, senza testo leggibile, senza watermark.",
  },
  {
    id: "poster-session",
    category: "Locandina",
    label: "Locandina sessione",
    aspectRatio: "9:16",
    prompt:
      "Poster fantasy cinematografico per una sessione di gioco di ruolo, gruppo di avventurieri davanti a un portale luminoso, città medievale sullo sfondo, atmosfera epica e misteriosa, composizione verticale, spazio libero in alto per titolo, senza testo, senza watermark.",
  },
  {
    id: "token-dwarf-warrior",
    category: "Token portrait",
    label: "Token nano guerriero",
    aspectRatio: "1:1",
    prompt:
      "Ritratto centrato di un guerriero nano fantasy, elmo ammaccato, barba rossa, armatura pesante, espressione severa, sfondo semplice scuro, leggibile anche in piccolo formato, senza testo, senza watermark.",
  },
];
