import { createDefaultSfxPad, type SfxPadConfig } from "@/lib/gm-audio-forge/types";
import { isValidSfxPadIconKey } from "@/lib/gm-audio-forge/sfx-pad-icons";

export type SfxPadRemoteSlot = {
  slotIndex: number;
  iconKey: string;
  etichetta: string;
};

export type SfxPadRemoteSnapshot = {
  slots: SfxPadRemoteSlot[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function toSfxPadRemoteSnapshot(sfxPad: SfxPadConfig): SfxPadRemoteSnapshot {
  const def = createDefaultSfxPad();
  const slots: SfxPadRemoteSlot[] = [];
  for (let i = 0; i < 12; i++) {
    const s = sfxPad.slots.find((x) => x.slotIndex === i) ?? def.slots[i]!;
    slots.push({
      slotIndex: i,
      iconKey: s.iconKey,
      etichetta: s.etichetta,
    });
  }
  return { slots };
}

export function parseSfxPadRemoteSnapshot(raw: unknown): SfxPadRemoteSnapshot | null {
  if (!isRecord(raw)) return null;
  const slotsIn = Array.isArray(raw.slots) ? raw.slots : [];
  const def = createDefaultSfxPad();
  const slots: SfxPadRemoteSlot[] = [];

  for (let i = 0; i < 12; i++) {
    const fromRaw = slotsIn.find(
      (x) => isRecord(x) && typeof x.slotIndex === "number" && x.slotIndex === i
    );
    const fallback = def.slots[i]!;
    if (isRecord(fromRaw)) {
      const iconKey =
        typeof fromRaw.iconKey === "string" && isValidSfxPadIconKey(fromRaw.iconKey)
          ? fromRaw.iconKey
          : typeof fromRaw.iconKey === "string" && fromRaw.iconKey.trim()
            ? fromRaw.iconKey.trim()
            : fallback.iconKey;
      slots.push({
        slotIndex: i,
        iconKey,
        etichetta: typeof fromRaw.etichetta === "string" ? fromRaw.etichetta : fallback.etichetta,
      });
    } else {
      slots.push({
        slotIndex: i,
        iconKey: fallback.iconKey,
        etichetta: fallback.etichetta,
      });
    }
  }

  return slots.length === 12 ? { slots } : null;
}
