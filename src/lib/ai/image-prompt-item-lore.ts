/** Framing e negative dedicati agli oggetti wiki (product shot, niente soggetti). */

export const ITEM_OBJECT_TECHNICAL_LINE =
  "isolated fantasy object product shot, single item as the only subject, centered in frame, clean dark or neutral background, high detail, photorealistic, cinematic lighting, fantasy artifact illustration";

export const ITEM_OBJECT_NEGATIVE_HINT =
  "people, person, human, character, NPC, hero, warrior, adventurer, figure, face, portrait, crowd, full-body character, standing character, person holding the object as main focus, wearer, model posing with the item, scenic group shot";

export function buildItemTechnicalLine(): string {
  return ITEM_OBJECT_TECHNICAL_LINE;
}

export function buildItemNegativeHints(): string {
  return ITEM_OBJECT_NEGATIVE_HINT;
}

/**
 * Lore: nessun framing obbligatorio (può essere oggetto, soggetto, mappa, scena…).
 * Lo stile arriva dai paletti campagna, non da vincoli di composizione.
 */
export function buildLoreTechnicalLine(): string {
  return "";
}
