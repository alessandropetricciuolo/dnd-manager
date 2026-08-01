/** Condizioni D&D 5e (PHB Appendice A) — etichette IT per lookup regole. */
export const PHB_CONDITIONS = [
  "Accecato",
  "Affascinato",
  "Afferrato",
  "Assordato",
  "Avvelenato",
  "Incapacitato",
  "Indebolimento",
  "Invisibile",
  "Paralizzato",
  "Pietrificato",
  "Privo di sensi",
  "Prono",
  "Spaventato",
  "Stordito",
  "Trattenuto",
] as const;

export type PhbCondition = (typeof PHB_CONDITIONS)[number];

/** Query preferita per la ricerca semantica/frase nei manuali. */
export function conditionSearchQuery(condition: PhbCondition | "all"): string {
  if (condition === "all") return "APPENDICE A: CONDIZIONI";
  return condition.toUpperCase();
}
