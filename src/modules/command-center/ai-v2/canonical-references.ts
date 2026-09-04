import { normalizeEntityNameKey } from "@/lib/wiki/entity-reference-parser";
import type { AiAssistantSourceRef } from "./contracts";

export type CanonicalReference = {
  targetType: "wiki" | "map";
  targetId: string;
  name: string;
};

export type CanonicalCatalogEntry = CanonicalReference;

function explicitlyMentions(message: string, name: string): boolean {
  const normalizedMessage = normalizeEntityNameKey(message);
  const normalizedName = normalizeEntityNameKey(name);
  // Very short titles (for example "Il") are not a reliable identity claim.
  return normalizedName.length >= 3 && normalizedMessage.includes(normalizedName);
}

/**
 * A canonical reference is safe only when all three facts agree: retrieval
 * returned a Wiki/map source, that exact source still exists in this campaign,
 * and the GM explicitly named its current title in the request.
 */
export function resolveCanonicalReferences(
  message: string,
  sources: AiAssistantSourceRef[],
  catalog: CanonicalCatalogEntry[],
): CanonicalReference[] {
  const catalogByKey = new Map(catalog.map((entry) => [`${entry.targetType}:${entry.targetId}`, entry]));
  const resolved = new Map<string, CanonicalReference>();

  for (const source of sources) {
    const targetType = source.sourceType === "wiki"
      ? "wiki"
      : source.sourceType === "map_description"
        ? "map"
        : null;
    if (!targetType || !source.sourceId) continue;
    const entry = catalogByKey.get(`${targetType}:${source.sourceId}`);
    if (!entry || !explicitlyMentions(message, entry.name)) continue;
    resolved.set(`${entry.targetType}:${entry.targetId}`, entry);
  }

  return [...resolved.values()];
}

export function canonicalReferenceInstruction(references: CanonicalReference[]): string {
  if (!references.length) return "";
  return `Riferimenti canonici risolti nella campagna: ${references.map((reference) => `${reference.name} (${reference.targetType === "map" ? "mappa" : "wiki"})`).join(", ")}. Il GM li ha citati esplicitamente: usali in modo naturale nella bozza se pertinenti. Non inventare altri collegamenti, tag canonici o identificatori; il server aggiungerà esclusivamente le relazioni verificate.`;
}
