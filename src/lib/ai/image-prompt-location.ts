/** Luoghi specifici (bottega, macellaio…) vs panorama/città genitore. */
export const VENUE_SUBJECT_PATTERN =
  /\b(bottega|negozi[oa]?|locanda|taverna|osteria|emporio|macell(?:aio|eria)|fabbro|forgia|officina|mercato|alchimista|farmacia|birreria|panett(?:eria|ere)|biblioteca|tempio|cripta)\b/i;

export type LocationSceneKind =
  | "interior_commerce"
  | "interior_tavern"
  | "interior_worship"
  | "interior_generic"
  | "exterior";

export function haystackHasSpecificVenueSubject(haystack: string): boolean {
  return VENUE_SUBJECT_PATTERN.test(haystack);
}

export function detectLocationSceneKind(text: string): LocationSceneKind {
  const t = text.toLowerCase();
  if (/\b(macell(?:aio|eria)|bottega|negozi[oa]?|emporio|mercato|officina|forgia|fabbro|panett(?:eria|ere))\b/.test(t)) {
    return "interior_commerce";
  }
  if (/\b(locanda|taverna|osteria|birreria)\b/.test(t)) {
    return "interior_tavern";
  }
  if (/\b(tempio|cripta|santuario|chiesa|cattedrale)\b/.test(t)) {
    return "interior_worship";
  }
  if (/\b(interno|dentro|all'interno|stanza|camera|sala)\b/.test(t)) {
    return "interior_generic";
  }
  return "exterior";
}

export function buildLocationTechnicalLine(sceneKind: LocationSceneKind): string {
  switch (sceneKind) {
    case "interior_commerce":
      return "interior shop scene, eye-level view, detailed workshop or storefront inside, no wide cityscape, photorealistic, cinematic lighting, fantasy location art";
    case "interior_tavern":
      return "interior tavern scene, warm ambient light, wooden furnishings, no exterior panorama, photorealistic, cinematic lighting, fantasy location art";
    case "interior_worship":
      return "interior sacred architecture, atmospheric light, photorealistic, cinematic lighting, fantasy location art";
    case "interior_generic":
      return "interior architectural scene, enclosed space, photorealistic, cinematic lighting, fantasy location art";
    default:
      return "environmental wide shot, high detail, photorealistic, cinematic lighting, fantasy location art";
  }
}

export const LOCATION_INTERIOR_NEGATIVE_HINT =
  "wide cityscape, harbor panorama, exterior-only establishing shot, aerial view, map table scene, group of investigators studying documents, crowded street overview";

/** Ancoraggi visivi per evitare scene generiche quando il soggetto è un locale specifico. */
export function augmentLocationVisualAnchors(description: string): string {
  const d = description.trim();
  if (!d) return d;
  const anchors: string[] = [];

  if (/\b(macell(?:aio|eria))\b/i.test(d)) {
    anchors.push(
      "medieval butcher shop interior: meat hooks, hanging carcasses, wooden cutting block, cleavers, stone or tiled floor, sawdust, iron hooks on ceiling beams"
    );
  } else if (/\b(bottega|negozi[oa]?|emporio)\b/i.test(d)) {
    anchors.push(
      "medieval shop interior: wooden counter, shelves with goods, hanging tools, warm lantern light, enclosed room"
    );
  }
  if (/\b(locanda|taverna|osteria|birreria)\b/i.test(d)) {
    anchors.push(
      "medieval tavern interior: wooden tables, hearth or candles, barrels, tankards, smoky atmosphere"
    );
  }
  if (/\b(fabbro|forgia|officina)\b/i.test(d)) {
    anchors.push("medieval forge interior: anvil, bellows, glowing coals, tools on walls");
  }
  if (/\b(tempio|cripta|santuario)\b/i.test(d)) {
    anchors.push("sacred interior: stone arches, altar or shrine, votive candles, hushed atmosphere");
  }

  if (!anchors.length) return d;
  return `${d}\nScene anchors: ${anchors.join(" | ")}`;
}
