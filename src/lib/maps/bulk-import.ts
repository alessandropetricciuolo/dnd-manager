import { parseSafeExternalUrl } from "../security/url";

export const MAP_IMPORT_TYPES = { world: "Mondo", continent: "Continente", city: "Città", dungeon: "Dungeon", district: "Quartiere", building: "Edificio" } as const;
export type ImportMap = { key: string; name: string; map_type: keyof typeof MAP_IMPORT_TYPES; image_url: string; description: string | null; visibility: "secret" | "public"; parent_key: string | null; parent_map_id: string | null };
export type ExistingMap = { id: string; map_type: string; name?: string };
export function parseMapImport(input: unknown): ImportMap[] {
  if (!Array.isArray(input) || !input.length || input.length > 100) throw new Error("Inserisci da 1 a 100 mappe.");
  const keys = new Set<string>();
  const rows = input.map((value, i): ImportMap => {
    const fail = (message: string): never => { throw new Error(`Voce ${i + 1}: ${message}`); };
    if (!value || typeof value !== "object" || Array.isArray(value)) return fail("oggetto non valido.");
    const v = value as Record<string, unknown>;
    const str = (key: string, max: number, required = false): string | null => {
      if (v[key] == null && !required) return null;
      if (typeof v[key] !== "string" || !(v[key] as string).trim() || (v[key] as string).length > max) return fail(`${key} non valido (massimo ${max} caratteri).`);
      return (v[key] as string).trim();
    };
    const key = str("key", 100, true)!;
    if (keys.has(key)) return fail(`key duplicata: ${key}.`);
    keys.add(key);
    const map_type = str("map_type", 20, true)!;
    if (!Object.hasOwn(MAP_IMPORT_TYPES, map_type)) return fail("map_type non valido.");
    const image_url = parseSafeExternalUrl(str("image_url", 2048, true)!);
    if (!image_url) return fail("image_url deve essere un URL HTTPS pubblico.");
    const visibility = v.visibility ?? "secret";
    if (visibility !== "secret" && visibility !== "public") return fail("visibility deve essere secret o public.");
    const parent_key = str("parent_key", 100);
    const parent_map_id = str("parent_map_id", 36);
    if (parent_key && parent_map_id) return fail("usa solo parent_key oppure parent_map_id.");
    if (parent_map_id && !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(parent_map_id)) return fail("parent_map_id non valido.");
    return { key, name: str("name", 200, true)!, map_type: map_type as ImportMap["map_type"], image_url, description: str("description", 10000), visibility, parent_key, parent_map_id };
  });
  const sorted: ImportMap[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byKey = new Map(rows.map(r => [r.key, r]));
  const visit = (row: ImportMap) => {
    if (visited.has(row.key)) return;
    if (visiting.has(row.key)) throw new Error(`Gerarchia circolare: ${row.key}.`);
    visiting.add(row.key);
    if (row.parent_key) {
      const parent = byKey.get(row.parent_key);
      if (!parent) throw new Error(`${row.name}: parent_key ${row.parent_key} non trovata.`);
      visit(parent);
    }
    visiting.delete(row.key); visited.add(row.key); sorted.push(row);
  };
  rows.forEach(visit);
  return sorted;
}

export function validateMapImportHierarchy(rows: ImportMap[], existing: ExistingMap[], isLong: boolean) {
  const local = new Map(rows.map(r => [r.key, r]));
  const saved = new Map(existing.map(r => [r.id, r]));
  if (isLong && rows.filter(r => r.map_type === "world").length + existing.filter(r => r.map_type === "world").length > 1) throw new Error("È consentita una sola mappa Mondo per campagna.");
  for (const row of rows) {
    const parent = row.parent_key ? local.get(row.parent_key) : row.parent_map_id ? saved.get(row.parent_map_id) : null;
    if ((row.parent_key || row.parent_map_id) && !parent) throw new Error(`${row.name}: genitore non presente nella campagna.`);
    if (!isLong && parent) throw new Error(`${row.name}: la gerarchia richiede una campagna lunga.`);
    if (isLong && row.map_type === "world" && parent) throw new Error(`${row.name}: il Mondo non può avere un genitore.`);
    const required = row.map_type === "continent" ? "world" : row.map_type === "city" ? "continent" : null;
    if (isLong && required && parent?.map_type !== required) throw new Error(`${row.name}: richiede un genitore di tipo ${required}.`);
  }
}
