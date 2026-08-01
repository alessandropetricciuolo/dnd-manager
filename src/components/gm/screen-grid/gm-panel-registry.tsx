"use client";

import type { ComponentType, ReactNode } from "react";
import type { GmPanelDefaultSize, GmPanelType } from "./types";
import { InitiativePanel } from "./panels/initiative-panel";
import { NotesPanel } from "./panels/notes-panel";
import { PlayersXpPanel } from "./panels/players-xp-panel";
import { TimePanel } from "./panels/time-panel";
import { CalendarPanel } from "./panels/calendar-panel";
import { EconomyPanel } from "./panels/economy-panel";
import { MissionsPanel } from "./panels/missions-panel";
import { MapsPanel, FowPanel } from "./panels/maps-fow-panels";
import { GalleryPanel, WhispersPanel, AudioPanel } from "./panels/tool-sheet-panels";
import { RulesLookupPanel } from "./panels/rules-lookup-panel";
import { SpellsLookupPanel } from "./panels/spells-lookup-panel";
import { MonsterStatPanel } from "./panels/monster-stat-panel";
import { WikiEntityPanel } from "./panels/wiki-entity-panel";

export type GmPanelDefinition = {
  type: GmPanelType;
  label: string;
  category: "tools" | "lookup" | "session";
  defaultSize: GmPanelDefaultSize;
  /** If true, panel can appear multiple times (e.g. multiple monster stats). */
  allowMultiple?: boolean;
  render: (props: Record<string, unknown>) => ReactNode;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

const TOOL_PANELS: GmPanelDefinition[] = [
  {
    type: "initiative",
    label: "Initiative",
    category: "tools",
    defaultSize: { w: 5, h: 16, minW: 3, minH: 6 },
    render: () => <InitiativePanel />,
  },
  {
    type: "notes",
    label: "Note GM",
    category: "tools",
    defaultSize: { w: 4, h: 12, minW: 2, minH: 4 },
    render: () => <NotesPanel />,
  },
  {
    type: "playersXp",
    label: "PG / XP",
    category: "tools",
    defaultSize: { w: 3, h: 16, minW: 2, minH: 6 },
    render: () => <PlayersXpPanel />,
  },
  {
    type: "time",
    label: "Tempo",
    category: "session",
    defaultSize: { w: 4, h: 5, minW: 2, minH: 3 },
    render: () => <TimePanel />,
  },
  {
    type: "calendar",
    label: "Calendario",
    category: "session",
    defaultSize: { w: 4, h: 12, minW: 2, minH: 5 },
    render: () => <CalendarPanel />,
  },
  {
    type: "economy",
    label: "Economia",
    category: "session",
    defaultSize: { w: 6, h: 16, minW: 3, minH: 6 },
    render: () => <EconomyPanel />,
  },
  {
    type: "missions",
    label: "Missioni",
    category: "tools",
    defaultSize: { w: 4, h: 10, minW: 2, minH: 4 },
    render: () => <MissionsPanel />,
  },
  {
    type: "maps",
    label: "Mappe",
    category: "tools",
    defaultSize: { w: 3, h: 4, minW: 2, minH: 2 },
    render: () => <MapsPanel />,
  },
  {
    type: "fow",
    label: "FOW / Esplorazione",
    category: "tools",
    defaultSize: { w: 3, h: 4, minW: 2, minH: 2 },
    render: () => <FowPanel />,
  },
  {
    type: "gallery",
    label: "Regia immagini",
    category: "tools",
    defaultSize: { w: 3, h: 4, minW: 2, minH: 2 },
    render: () => <GalleryPanel />,
  },
  {
    type: "whispers",
    label: "Sussurri",
    category: "tools",
    defaultSize: { w: 3, h: 4, minW: 2, minH: 2 },
    render: () => <WhispersPanel />,
  },
  {
    type: "audio",
    label: "Audio",
    category: "tools",
    defaultSize: { w: 3, h: 4, minW: 2, minH: 2 },
    render: () => <AudioPanel />,
  },
];

const LOOKUP_PANELS: GmPanelDefinition[] = [
  {
    type: "rulesLookup",
    label: "Regole",
    category: "lookup",
    defaultSize: { w: 4, h: 14, minW: 2, minH: 5 },
    allowMultiple: true,
    render: (props) => <RulesLookupPanel initialQuery={asString(props.query)} />,
  },
  {
    type: "spellsLookup",
    label: "Incantesimi",
    category: "lookup",
    defaultSize: { w: 4, h: 14, minW: 2, minH: 5 },
    allowMultiple: true,
    render: (props) => <SpellsLookupPanel initialQuery={asString(props.query)} />,
  },
  {
    type: "monsterStat",
    label: "Statblock mostro",
    category: "lookup",
    defaultSize: { w: 4, h: 16, minW: 2, minH: 6 },
    allowMultiple: true,
    render: (props) => (
      <MonsterStatPanel
        entityId={asString(props.entityId)}
        name={asString(props.name)}
        bestiaryChunkId={asString(props.bestiaryChunkId)}
      />
    ),
  },
  {
    type: "wikiEntity",
    label: "Scheda wiki",
    category: "lookup",
    defaultSize: { w: 4, h: 14, minW: 2, minH: 5 },
    allowMultiple: true,
    render: (props) => (
      <WikiEntityPanel entityId={asString(props.entityId)} initialQuery={asString(props.query)} />
    ),
  },
];

export const GM_PANEL_REGISTRY: Record<GmPanelType, GmPanelDefinition> = [
  ...TOOL_PANELS,
  ...LOOKUP_PANELS,
].reduce(
  (acc, def) => {
    acc[def.type] = def;
    return acc;
  },
  {} as Record<GmPanelType, GmPanelDefinition>
);

export const GM_ADD_MENU_GROUPS: { label: string; types: GmPanelType[] }[] = [
  {
    label: "Strumenti sessione",
    types: ["initiative", "notes", "playersXp", "time", "calendar", "economy", "missions"],
  },
  {
    label: "Regia",
    types: ["maps", "fow", "gallery", "whispers", "audio"],
  },
  {
    label: "Lookup",
    types: ["rulesLookup", "spellsLookup", "monsterStat", "wikiEntity"],
  },
];

export function getPanelLabel(type: GmPanelType): string {
  return GM_PANEL_REGISTRY[type]?.label ?? type;
}

/** Satisfy TS unused import check for ComponentType if needed by consumers. */
export type GmPanelComponent = ComponentType<Record<string, unknown>>;
