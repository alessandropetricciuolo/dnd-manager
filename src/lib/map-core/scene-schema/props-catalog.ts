/** Preset props per Scene Editor (Fase 4). */

export const SCENE_PROP_KINDS = [
  "barrel",
  "crate",
  "table",
  "chair",
  "torch",
  "pillar",
  "statue",
  "boulder",
  "campfire",
  "altar",
  "star",
  "stairs",
  "coffin",
] as const;

export type ScenePropKindV1 = (typeof SCENE_PROP_KINDS)[number];

export type ScenePropCatalogEntry = {
  kind: ScenePropKindV1;
  label: string;
  /** Dimensione base in pixel canvas (larghezza approssimativa). */
  baseSize: number;
};

export const SCENE_PROP_CATALOG: ScenePropCatalogEntry[] = [
  { kind: "barrel", label: "Barile", baseSize: 48 },
  { kind: "crate", label: "Cassa", baseSize: 56 },
  { kind: "table", label: "Tavolo", baseSize: 80 },
  { kind: "chair", label: "Sedia", baseSize: 40 },
  { kind: "torch", label: "Torcia", baseSize: 28 },
  { kind: "pillar", label: "Colonna", baseSize: 44 },
  { kind: "statue", label: "Statua", baseSize: 52 },
  { kind: "boulder", label: "Roccia", baseSize: 64 },
  { kind: "campfire", label: "Fuoco", baseSize: 56 },
  { kind: "altar", label: "Altare", baseSize: 72 },
  { kind: "star", label: "Marcatura", baseSize: 32 },
  { kind: "stairs", label: "Scale", baseSize: 64 },
  { kind: "coffin", label: "Bara", baseSize: 48 },
];

export function isScenePropKind(value: string): value is ScenePropKindV1 {
  return (SCENE_PROP_KINDS as readonly string[]).includes(value);
}

export function scenePropCatalogEntry(kind: ScenePropKindV1): ScenePropCatalogEntry {
  return SCENE_PROP_CATALOG.find((e) => e.kind === kind) ?? SCENE_PROP_CATALOG[0];
}
