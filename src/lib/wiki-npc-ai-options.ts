/** Opzioni UX per generazione NPC wiki AI (allineate al catalogo PG/manuali). */

import { RACE_OPTIONS } from "@/lib/character-build-catalog";

export const WIKI_NPC_LEVEL_OPTIONS = Array.from({ length: 20 }, (_, i) => String(i + 1));

/**
 * Classi selezionabili per gli NPC wiki: classi del Player's Handbook
 * più le due opzioni di classe per PNG della Guida del DM, capitolo 4
 * («Opzioni di Classe dei Nemici»).
 */
export const WIKI_NPC_CLASS_OPTIONS: string[] = [
  "Artefice",
  "Barbaro",
  "Bardo",
  "Chierico",
  "Chierico (Dominio della Morte)",
  "Druido",
  "Guerriero",
  "Ladro",
  "Mago",
  "Monaco",
  "Paladino",
  "Paladino (Apostata)",
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
