/** Opzioni UX per generazione NPC wiki AI (allineate al catalogo PG/manuali). */

import { RACE_OPTIONS } from "@/lib/character-build-catalog";

export const WIKI_NPC_LEVEL_OPTIONS = Array.from({ length: 20 }, (_, i) => String(i + 1));

export const WIKI_NPC_CLASS_OPTIONS: string[] = [
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

export const WIKI_NPC_RACE_OPTIONS: string[] = Array.from(
  new Set(
    RACE_OPTIONS.flatMap((race) => [
      race.label,
      ...(race.subraces?.map((sub) => sub.label) ?? []),
    ])
  )
).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
