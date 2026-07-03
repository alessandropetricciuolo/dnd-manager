/**
 * Estrae il primo oggetto JSON bilanciato da una risposta LLM (anche con markdown o testo extra).
 */
export function extractBalancedJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    const inner = extractBalancedJsonObject(fence[1].trim());
    if (inner.startsWith("{")) return inner;
  }

  const start = trimmed.indexOf("{");
  if (start === -1) return trimmed;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }

  const end = trimmed.lastIndexOf("}");
  if (end > start) return trimmed.slice(start, end + 1);
  return trimmed.slice(start);
}

/** Ripara errori JSON comuni nei output LLM (virgolette smart, trailing comma). */
export function repairLooseJsonText(jsonText: string): string {
  return jsonText
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

export function parseJsonObjectFromLlm(raw: string): { ok: true; value: Record<string, unknown> } | { ok: false } {
  const candidates = [
    extractBalancedJsonObject(raw),
    raw.trim(),
  ];

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);

    for (const text of [candidate, repairLooseJsonText(candidate)]) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return { ok: true, value: parsed as Record<string, unknown> };
        }
      } catch {
        // try next
      }
    }
  }

  return { ok: false };
}
