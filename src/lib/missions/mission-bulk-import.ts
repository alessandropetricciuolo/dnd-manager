/**
 * Formato JSON per import massivo missioni (admin).
 * Supporta: array alla radice oppure oggetto { "version": 1, "missions": [...] }.
 */

export type BulkMissionImportItem = {
  grade: string;
  title: string;
  committente: string;
  ubicazione: string;
  paga: string;
  urgenza: string;
  description: string;
  /** Intero ≥ 0; se assente → 0 */
  points_reward: number;
};

function strField(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (v === undefined || v === null) return "";
  return typeof v === "string" ? v.trim() : String(v).trim();
}

function pointsRewardFrom(row: Record<string, unknown>): number {
  const v = row.points_reward;
  if (v === undefined || v === null) return 0;
  const n = typeof v === "number" ? v : Number.parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

/** Esempio per prompt esterni / documentazione */
export const MISSION_BULK_IMPORT_JSON_EXAMPLE = `{
  "version": 1,
  "missions": [
    {
      "grade": "C",
      "title": "Disinfestazione cantina",
      "committente": "Locanda del Pino Nero",
      "ubicazione": "Borgogrea, quartiere basso",
      "paga": "50 mo + vitto",
      "urgenza": "Entro 3 giorni",
      "description": "Ratti giganti hanno rotto le bottleneck della cantina. Minimizzare danni al vino.",
      "points_reward": 2
    }
  ]
}`;

export function parseMissionBulkImportJson(raw: string):
  | { ok: true; items: BulkMissionImportItem[] }
  | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "JSON non valido. Controlla virgole, virgolette e parentesi." };
  }

  let list: unknown[];
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed != null && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).missions)) {
    list = (parsed as Record<string, unknown>).missions as unknown[];
  } else {
    return {
      ok: false,
      error: 'Formato non valido. Usa un array di missioni oppure { "missions": [ ... ] }.',
    };
  }

  const items: BulkMissionImportItem[] = [];

  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (row == null || typeof row !== "object") {
      return { ok: false, error: `Missione ${i + 1}: deve essere un oggetto.` };
    }
    const r = row as Record<string, unknown>;
    const grade = strField(r, "grade");
    const title = strField(r, "title");
    const committente = strField(r, "committente");
    const ubicazione = strField(r, "ubicazione");
    const paga = strField(r, "paga");
    const urgenza = strField(r, "urgenza");
    const description = strField(r, "description");

    if (!grade || !title || !committente || !ubicazione || !paga || !urgenza || !description) {
      return {
        ok: false,
        error: `Missione ${i + 1}: servono stringhe non vuote per grade, title, committente, ubicazione, paga, urgenza, description.`,
      };
    }

    items.push({
      grade,
      title,
      committente,
      ubicazione,
      paga,
      urgenza,
      description,
      points_reward: pointsRewardFrom(r),
    });
  }

  if (items.length === 0) {
    return { ok: false, error: "Nessuna missione nell'array." };
  }

  return { ok: true, items };
}
