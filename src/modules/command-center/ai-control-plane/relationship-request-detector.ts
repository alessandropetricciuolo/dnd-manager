export type DetectedRelationshipRequest = {
  sourceName: string;
  targetName: string;
  label: string;
  userPrompt: string;
};

const RELATIONSHIP_VERBS =
  /\b(collega(?:mi)?|collegare|unisci|aggiungi\s+(?:una\s+)?relazione|crea(?:mi)?\s+(?:una\s+)?relazione|linka)\b/i;
const RELATIONSHIP_NOUN = /\brelazione\s+(?:tra|fra)\b/i;

function cleanEntityName(raw: string): string {
  return raw.trim().replace(/^["'«]|["'»]$/g, "").trim();
}

function looksLikeRelationshipCreate(message: string): boolean {
  const t = message.trim();
  if (t.length < 8) return false;
  if (RELATIONSHIP_VERBS.test(t)) return true;
  if (RELATIONSHIP_NOUN.test(t)) return true;
  if (/\b(?:è|e')\s+(?:alleato|nemic[oa]|custode|amico|parente|rivale|socio|padrone)\b/i.test(t)) return true;
  if (/\bsi\s+trova\s+(?:a|in|presso)\b/i.test(t)) return true;
  return false;
}

function parseRelationshipFields(
  message: string
): { sourceName: string; targetName: string; label: string } | null {
  const t = message.trim();

  let m = t.match(
    /\bcollega(?:mi)?\s+(.+?)\s+(?:a(?:l(?:la|lo|le)?|gli|i)?|con)\s+(.+?)(?:\s+(?:come|con\s+(?:l[''])?etichetta|con\s+relazione)\s+(.+))?$/i
  );
  if (m?.[1] && m[2]) {
    return {
      sourceName: cleanEntityName(m[1]),
      targetName: cleanEntityName(m[2]),
      label: m[3] ? cleanEntityName(m[3]) : "collegato a",
    };
  }

  m = t.match(/\brelazione\s+(?:tra|fra)\s+(.+?)\s+e\s+(.+?)(?:\s*[:\-]\s*(.+))?$/i);
  if (m?.[1] && m[2]) {
    return {
      sourceName: cleanEntityName(m[1]),
      targetName: cleanEntityName(m[2]),
      label: m[3] ? cleanEntityName(m[3]) : "relazione",
    };
  }

  m = t.match(/^(.+?)\s+(?:è|e')\s+(\S+(?:\s+\S+)?)\s+(?:di|del|della|dei|degli|delle)\s+(.+)$/i);
  if (m?.[1] && m[2] && m[3]) {
    return {
      sourceName: cleanEntityName(m[1]),
      label: cleanEntityName(m[2]),
      targetName: cleanEntityName(m[3]),
    };
  }

  m = t.match(/^(.+?)\s+si\s+trova\s+(?:a|in|presso)\s+(.+)$/i);
  if (m?.[1] && m[2]) {
    return {
      sourceName: cleanEntityName(m[1]),
      targetName: cleanEntityName(m[2]),
      label: "si trova a",
    };
  }

  return null;
}

export function detectRelationshipCreateRequest(message: string): DetectedRelationshipRequest | null {
  const userPrompt = message.trim();
  const parsed = parseRelationshipFields(userPrompt);
  if (parsed && parsed.sourceName.length >= 2 && parsed.targetName.length >= 2 && parsed.label.trim()) {
    return {
      ...parsed,
      label: parsed.label.trim(),
      userPrompt,
    };
  }

  if (!looksLikeRelationshipCreate(userPrompt)) return null;
  return null;
}

/** Aggiorna etichetta o entità se il messaggio di refine lo specifica. */
export function refineRelationshipRequest(
  message: string,
  current: DetectedRelationshipRequest
): DetectedRelationshipRequest {
  const trimmed = message.trim();
  const labelOnly = trimmed.match(/^(?:etichetta|relazione|label)\s*[:\-]?\s*(.+)$/i);
  if (labelOnly?.[1]?.trim()) {
    return { ...current, label: cleanEntityName(labelOnly[1]), userPrompt: trimmed };
  }

  const redetected = detectRelationshipCreateRequest(trimmed);
  if (redetected) return redetected;

  return { ...current, userPrompt: `${current.userPrompt}\n${trimmed}` };
}
