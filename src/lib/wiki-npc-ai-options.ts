/** Opzioni UX per generazione NPC wiki AI (allineate al catalogo PG/manuali). */

import { RACE_OPTIONS } from "@/lib/character-build-catalog";

export const WIKI_NPC_LEVEL_OPTIONS = Array.from({ length: 20 }, (_, i) => String(i + 1));

/** Classi di PNG (Guida del DM, capitolo 4 — Creare i Personaggi Non Giocanti). */
export const WIKI_NPC_ONLY_CLASS_OPTIONS: string[] = [
  "Adepto",
  "Aristocratico",
  "Combattente",
  "Esperto",
  "Popolano",
];

/** Classi degli avventurieri (Player's Handbook). */
export const WIKI_ADVENTURER_CLASS_OPTIONS: string[] = [
  "Artefice",
  "Barbaro",
  "Bardo",
  "Chierico",
  "Druido",
  "Guerriero",
  "Ladro",
  "Mago",
  "Monaco",
  "Paladino",
  "Ranger",
  "Stregone",
  "Warlock",
];

/** Gruppi per i select del campo Classe NPC. */
export const WIKI_NPC_CLASS_GROUPS: { label: string; options: string[] }[] = [
  { label: "Classi PNG", options: WIKI_NPC_ONLY_CLASS_OPTIONS },
  { label: "Classi degli avventurieri", options: WIKI_ADVENTURER_CLASS_OPTIONS },
];

/** Lista piatta (classi PNG + avventurieri), usata per validazioni e selettori semplici. */
export const WIKI_NPC_CLASS_OPTIONS: string[] = [
  ...WIKI_NPC_ONLY_CLASS_OPTIONS,
  ...WIKI_ADVENTURER_CLASS_OPTIONS,
];

export const WIKI_NPC_RACE_OPTIONS: string[] = Array.from(
  new Set(
    RACE_OPTIONS.flatMap((race) => [
      race.label,
      ...(race.subraces?.map((sub) => sub.label) ?? []),
    ])
  )
).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
