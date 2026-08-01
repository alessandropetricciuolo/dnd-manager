import { isGmPanelType, type GmLayoutItem, type GmStoredLayout, type GmWorkspaceMode } from "./types";

export const GM_SCREEN_LAYOUT_KEY_PREFIX = "gm-screen-layout-v1:";

export function gmScreenLayoutStorageKey(campaignId: string): string {
  return `${GM_SCREEN_LAYOUT_KEY_PREFIX}${campaignId}`;
}

function sanitizeItem(raw: unknown): GmLayoutItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.i !== "string" || !item.i.trim()) return null;
  if (!isGmPanelType(item.type)) return null;
  const x = Number(item.x);
  const y = Number(item.y);
  const w = Number(item.w);
  const h = Number(item.h);
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return null;
  const out: GmLayoutItem = {
    i: item.i,
    type: item.type,
    x: Math.max(0, Math.trunc(x)),
    y: Math.max(0, Math.trunc(y)),
    w: Math.max(1, Math.trunc(w)),
    h: Math.max(1, Math.trunc(h)),
  };
  if (typeof item.title === "string" && item.title.trim()) out.title = item.title.trim();
  if (item.props && typeof item.props === "object" && !Array.isArray(item.props)) {
    out.props = item.props as Record<string, unknown>;
  }
  if (typeof item.minW === "number" && Number.isFinite(item.minW)) out.minW = Math.max(1, Math.trunc(item.minW));
  if (typeof item.minH === "number" && Number.isFinite(item.minH)) out.minH = Math.max(1, Math.trunc(item.minH));
  return out;
}

export function sanitizeStoredLayout(raw: unknown): GmStoredLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Record<string, unknown>;
  if (parsed.version !== 1) return null;
  const mode = parsed.mode === "closure" ? "closure" : parsed.mode === "session" ? "session" : null;
  if (!mode) return null;
  if (!Array.isArray(parsed.items)) return null;
  const items = parsed.items.map(sanitizeItem).filter((item): item is GmLayoutItem => item != null);
  return { version: 1, mode, items };
}

export function loadGmScreenLayout(campaignId: string): GmStoredLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(gmScreenLayoutStorageKey(campaignId));
    if (!raw) return null;
    return sanitizeStoredLayout(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGmScreenLayout(campaignId: string, layout: GmStoredLayout): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(gmScreenLayoutStorageKey(campaignId), JSON.stringify(layout));
  } catch {
    // ignore quota / private mode
  }
}

export function clearGmScreenLayout(campaignId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(gmScreenLayoutStorageKey(campaignId));
  } catch {
    // ignore
  }
}

export function toStoredLayout(mode: GmWorkspaceMode, items: GmLayoutItem[]): GmStoredLayout {
  return { version: 1, mode, items };
}
