"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Map as MapIcon, Search } from "lucide-react";
import { toast } from "sonner";

import {
  getPlayerContentAccess,
  syncPlayerContentAccess,
  type PlayerContentAccessItem,
} from "@/app/campaigns/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type CharacterContentAccessSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  playerId: string;
  playerName: string;
  characterName: string;
};

type FilterMode = "all" | "unlocked" | "locked";

function visibilityLabel(visibility: PlayerContentAccessItem["visibility"]) {
  if (visibility === "secret") return "Segreto";
  if (visibility === "selective") return "Selettivo";
  return "Pubblico";
}

function visibilityBadgeClass(visibility: PlayerContentAccessItem["visibility"]) {
  if (visibility === "secret") return "bg-rose-500/15 text-rose-300";
  if (visibility === "selective") return "bg-amber-500/15 text-amber-300";
  return "bg-emerald-500/10 text-emerald-300/90";
}

export function CharacterContentAccessSheet({
  open,
  onOpenChange,
  campaignId,
  playerId,
  playerName,
  characterName,
}: CharacterContentAccessSheetProps) {
  const [items, setItems] = useState<PlayerContentAccessItem[]>([]);
  const [draft, setDraft] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const requestedPlayerId = playerId;
    setLoading(true);
    setQuery("");
    setFilter("all");
    setItems([]);
    setDraft(new Map());
    getPlayerContentAccess(campaignId, requestedPlayerId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setItems(res.items);
        setDraft(new Map(res.items.map((i) => [`${i.type}:${i.id}`, i.hasAccess])));
      } else {
        setItems([]);
        setDraft(new Map());
        toast.error(res.message ?? "Errore nel caricamento.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, campaignId, playerId]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("it");
    return items.filter((item) => {
      const key = `${item.type}:${item.id}`;
      const access = draft.get(key) ?? item.hasAccess;
      if (filter === "unlocked" && !access) return false;
      if (filter === "locked" && access) return false;
      if (!q) return true;
      return (
        item.name.toLocaleLowerCase("it").includes(q) ||
        item.groupLabel.toLocaleLowerCase("it").includes(q)
      );
    });
  }, [items, draft, query, filter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, PlayerContentAccessItem[]>();
    for (const item of filteredItems) {
      const list = groups.get(item.groupLabel) ?? [];
      list.push(item);
      groups.set(item.groupLabel, list);
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "Mappe") return -1;
      if (b === "Mappe") return 1;
      return a.localeCompare(b, "it");
    });
  }, [filteredItems]);

  const stats = useMemo(() => {
    let unlocked = 0;
    let manageable = 0;
    for (const item of items) {
      const key = `${item.type}:${item.id}`;
      const access = draft.get(key) ?? item.hasAccess;
      if (access) unlocked += 1;
      if (item.visibility !== "public") manageable += 1;
    }
    return { unlocked, total: items.length, manageable };
  }, [items, draft]);

  const hasChanges = useMemo(() => {
    return items.some((item) => {
      const key = `${item.type}:${item.id}`;
      return (draft.get(key) ?? item.hasAccess) !== item.hasAccess;
    });
  }, [items, draft]);

  function toggleItem(item: PlayerContentAccessItem) {
    if (item.visibility === "public") return;
    const key = `${item.type}:${item.id}`;
    setDraft((prev) => {
      const next = new Map(prev);
      next.set(key, !(prev.get(key) ?? item.hasAccess));
      return next;
    });
  }

  async function handleSave() {
    const changes = items
      .filter((item) => item.visibility !== "public")
      .map((item) => {
        const key = `${item.type}:${item.id}`;
        const granted = draft.get(key) ?? item.hasAccess;
        return { id: item.id, type: item.type, granted };
      })
      .filter((change) => {
        const original = items.find((i) => i.id === change.id && i.type === change.type);
        return original && original.hasAccess !== change.granted;
      });

    if (changes.length === 0) {
      toast.info("Nessuna modifica da salvare.");
      return;
    }

    setSaving(true);
    const result = await syncPlayerContentAccess(campaignId, playerId, changes);
    setSaving(false);
    if (result.success) {
      toast.success(result.message);
      const refresh = await getPlayerContentAccess(campaignId, playerId);
      if (refresh.success) {
        setItems(refresh.items);
        setDraft(new Map(refresh.items.map((i) => [`${i.type}:${i.id}`, i.hasAccess])));
      }
    } else {
      toast.error(result.message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden border-barber-gold/40 bg-barber-dark text-barber-paper sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 space-y-1 text-left">
          <SheetTitle className="text-barber-paper">Wiki e mappe — {characterName}</SheetTitle>
          <SheetDescription className="text-barber-paper/65">
            Contenuti visibili per <span className="font-medium text-barber-paper">{playerName}</span>.
            Gli sblocchi sono legati al giocatore assegnato al personaggio.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 shrink-0 space-y-3">
          <div className="flex flex-wrap gap-2 text-xs text-barber-paper/75">
            <span className="rounded-md border border-barber-gold/25 px-2 py-1 tabular-nums">
              {stats.unlocked}/{stats.total} visibili
            </span>
            <span className="rounded-md border border-barber-gold/25 px-2 py-1 tabular-nums">
              {stats.manageable} gestibili
            </span>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-barber-paper/45" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per nome o categoria…"
              className="h-9 border-barber-gold/30 bg-barber-dark/80 pl-9 text-sm text-barber-paper"
            />
          </div>

          <div className="flex gap-1">
            {(
              [
                ["all", "Tutti"],
                ["unlocked", "Sbloccati"],
                ["locked", "Non sbloccati"],
              ] as const
            ).map(([mode, label]) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={filter === mode ? "secondary" : "ghost"}
                className={cn(
                  "h-7 px-2 text-[11px]",
                  filter === mode
                    ? "border-barber-gold/35 bg-barber-gold/15 text-barber-paper"
                    : "text-barber-paper/70 hover:bg-barber-gold/10"
                )}
                onClick={() => setFilter(mode)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2 [-webkit-overflow-scrolling:touch]">
          {loading ? (
            <p className="text-sm text-barber-paper/60">Caricamento contenuti…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-barber-paper/60">Nessun contenuto wiki o mappa in campagna.</p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-barber-paper/60">Nessun risultato con i filtri attuali.</p>
          ) : (
            <div className="space-y-4">
              {grouped.map(([groupLabel, groupItems]) => (
                <section key={groupLabel}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-barber-gold/90">
                    {groupLabel}
                  </h3>
                  <ul className="space-y-1.5">
                    {groupItems.map((item) => {
                      const key = `${item.type}:${item.id}`;
                      const access = draft.get(key) ?? item.hasAccess;
                      const isPublic = item.visibility === "public";
                      const changed = access !== item.hasAccess;
                      return (
                        <li key={key}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors",
                              isPublic
                                ? "cursor-default border-barber-gold/15 bg-barber-dark/40 opacity-90"
                                : access
                                  ? "border-emerald-600/40 bg-emerald-500/5 hover:bg-emerald-500/10"
                                  : "border-barber-gold/20 bg-barber-dark/50 hover:bg-barber-gold/5",
                              changed && "ring-1 ring-amber-400/50"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={access}
                              disabled={isPublic || saving}
                              onChange={() => toggleItem(item)}
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-barber-gold/40 text-emerald-600 focus:ring-emerald-500 disabled:opacity-60"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5 text-sm font-medium text-barber-paper">
                                {item.type === "map" ? (
                                  <MapIcon className="h-3.5 w-3.5 shrink-0 text-barber-gold/80" aria-hidden />
                                ) : (
                                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-barber-gold/80" aria-hidden />
                                )}
                                <span className="truncate">{item.name}</span>
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span
                                  className={cn(
                                    "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                    visibilityBadgeClass(item.visibility)
                                  )}
                                >
                                  {visibilityLabel(item.visibility)}
                                </span>
                                {isPublic ? (
                                  <span className="text-[10px] text-barber-paper/50">sempre visibile</span>
                                ) : changed ? (
                                  <span className="text-[10px] text-amber-300/90">modificato</span>
                                ) : null}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 border-t border-barber-gold/20 pt-3 sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            className="border-barber-gold/35 text-barber-paper hover:bg-barber-gold/10"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Chiudi
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 text-white hover:bg-emerald-500"
            disabled={loading || saving || !hasChanges}
            onClick={() => void handleSave()}
          >
            {saving ? "Salvataggio…" : "Salva modifiche"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
