export type WarRoomTabKey = "calendar" | "my-campaigns" | "all-campaigns" | "sessions";

export function resolveWarRoomTab(key: string | null | undefined): WarRoomTabKey | null {
  if (!key) return null;
  const normalized = key.toLowerCase().replace("#", "").trim();
  if (normalized === "calendar" || normalized === "calendario") return "calendar";
  if (normalized === "my-campaigns" || normalized === "mie-saghe" || normalized === "saghe") return "my-campaigns";
  if (["all-campaigns", "bacheca", "bandi", "avventure"].includes(normalized)) return "all-campaigns";
  if (["sessions", "sessioni", "biglietti", "prenotazioni"].includes(normalized)) return "sessions";
  return null;
}
