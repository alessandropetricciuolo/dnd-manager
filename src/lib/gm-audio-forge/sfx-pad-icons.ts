import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Circle,
  CloudRain,
  Flame,
  Footprints,
  Moon,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Volume2,
  Wind,
  Zap,
} from "lucide-react";

export const SFX_PAD_SLOT_COUNT = 12;

/** Icone selezionabili per il pad (chiave = nome export Lucide). */
export const SFX_PAD_ICON_OPTIONS = [
  "Bell",
  "Skull",
  "Flame",
  "Zap",
  "Volume2",
  "Wind",
  "CloudRain",
  "Swords",
  "Shield",
  "Footprints",
  "Moon",
  "Sparkles",
] as const;

export type SfxPadIconKey = (typeof SFX_PAD_ICON_OPTIONS)[number];

const ICON_MAP: Record<string, LucideIcon> = {
  Bell,
  Skull,
  Flame,
  Zap,
  Volume2,
  Wind,
  CloudRain,
  Swords,
  Shield,
  Footprints,
  Moon,
  Sparkles,
};

export function getSfxPadIconComponent(key: string): LucideIcon {
  return ICON_MAP[key] ?? Circle;
}

export function isValidSfxPadIconKey(key: string): key is SfxPadIconKey {
  return (SFX_PAD_ICON_OPTIONS as readonly string[]).includes(key);
}
