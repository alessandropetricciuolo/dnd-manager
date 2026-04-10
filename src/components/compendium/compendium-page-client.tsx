"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCompendiumDataAction,
  type CompendiumCampaign,
  type CompendiumElement,
} from "@/lib/actions/compendium-actions";
import { ALL_CAMPAIGNS_KEY } from "@/lib/compendium/constants";

type CompendiumType = CompendiumElement["type"];

const TYPE_FILTERS: Array<{ key: "Tutti" | CompendiumType; label: string }> = [
  { key: "Tutti", label: "Tutti" },
  { key: "Mostro", label: "Mostri" },
  { key: "NPC", label: "NPC" },
  { key: "Oggetto", label: "Oggetti" },
  { key: "Luogo", label: "Luoghi" },
  { key: "Lore", label: "Lore" },
];

function badgeClass(type: CompendiumType): string {
  switch (type) {
    case "Mostro":
      return "bg-red-900/40 text-red-200 border-red-500/40";
    case "NPC":
      return "bg-sky-900/40 text-sky-200 border-sky-500/40";
    case "Oggetto":
      return "bg-amber-900/40 text-amber-200 border-amber-500/40";
    case "Luogo":
      return "bg-emerald-900/40 text-emerald-200 border-emerald-500/40";
    case "Lore":
      return "bg-violet-900/40 text-violet-200 border-violet-500/40";
    default:
      return "bg-zinc-800 text-zinc-200 border-zinc-600";
  }
}

function findDetailValue(details: Record<string, string>, targetKey: string): string | null {
  const hit = Object.entries(details).find(([k]) => k.trim().toLowerCase() === targetKey.toLowerCase());
  const value = hit?.[1]?.trim();
  return value ? value : null;
}

function npcQuickFacts(details: Record<string, string>): Array<{ label: string; value: string }> {
  const race = findDetailValue(details, "race");
  const npcClass = findDetailValue(details, "class");
  const age = findDetailValue(details, "age");
  return [
    race ? { label: "Razza", value: race } : null,
    npcClass ? { label: "Classe", value: npcClass } : null,
    age ? { label: "Età", value: age } : null,
  ].filter((v): v is { label: string; value: string } => Boolean(v));
}

function isNpcType(type: CompendiumType): boolean {
  return type === "NPC";
}

export function CompendiumPageClient() {
  const searchParams = useSearchParams();
  const campaignIdFromUrl = searchParams.get("campaignId");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeType, setActiveType] = useState<"Tutti" | CompendiumType>("Tutti");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "details" | "tags">("description");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [campaigns, setCampaigns] = useState<CompendiumCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [elements, setElements] = useState<CompendiumElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(debouncedSearch);

  const loadCompendium = useCallback(async (campaignId?: string | null, silent?: boolean) => {
    if (silent) {
      setIsSyncing(true);
    } else {
      setIsLoading(true);
    }
    const result = await getCompendiumDataAction(campaignId);
    if (!result.success) {
      setLoadError(result.error);
      setElements([]);
      if (silent) setIsSyncing(false);
      if (!silent) setIsLoading(false);
      return;
    }

    setCampaigns(result.data.campaigns);
    setSelectedCampaignId(result.data.selectedCampaignId);
    setElements(result.data.elements);
    setLoadError(null);
    setSelectedId((current) =>
      current && result.data.elements.some((item) => item.id === current) ? current : null
    );
    if (silent) setIsSyncing(false);
    if (!silent) setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadCompendium(campaignIdFromUrl, false);
  }, [campaignIdFromUrl, loadCompendium]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 180);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void loadCompendium(selectedCampaignId, true);
    }, 15000);
    return () => clearInterval(timer);
  }, [selectedCampaignId, loadCompendium]);

  useEffect(() => {
    if (!selectedCampaignId) return;

    const handleFocusRefresh = () => {
      void loadCompendium(selectedCampaignId, true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadCompendium(selectedCampaignId, true);
      }
    };

    window.addEventListener("focus", handleFocusRefresh);
    window.addEventListener("online", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocusRefresh);
      window.removeEventListener("online", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [selectedCampaignId, loadCompendium]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return elements.filter((el) => {
      const typeMatch = activeType === "Tutti" || el.type === activeType;
      if (!typeMatch) return false;
      if (!q) return true;

      return el.searchText.includes(q);
    });
  }, [deferredSearch, activeType, elements]);

  const selectedIndex = useMemo(
    () => (selectedId ? filtered.findIndex((el) => el.id === selectedId) : -1),
    [filtered, selectedId]
  );
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : null;
  const selectedNpcFacts = useMemo(
    () => (selected && isNpcType(selected.type) ? npcQuickFacts(selected.details) : []),
    [selected]
  );
  const selectedDetailEntries = useMemo(() => {
    if (!selected) return [] as Array<[string, string]>;
    const entries = Object.entries(selected.details);
    if (!isNpcType(selected.type)) return entries;
    return entries.filter(([k]) => {
      const key = k.trim().toLowerCase();
      return key !== "race" && key !== "class" && key !== "age";
    });
  }, [selected]);

  function openCard(id: string) {
    setSelectedId(id);
    setActiveTab("description");
  }

  function goPrev() {
    if (!filtered.length || selectedIndex < 0) return;
    const nextIdx = (selectedIndex - 1 + filtered.length) % filtered.length;
    setSelectedId(filtered[nextIdx].id);
    setActiveTab("description");
  }

  function goNext() {
    if (!filtered.length || selectedIndex < 0) return;
    const nextIdx = (selectedIndex + 1) % filtered.length;
    setSelectedId(filtered[nextIdx].id);
    setActiveTab("description");
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-[#110f10] via-[#151315] to-[#1a1718] px-4 py-8 text-barber-paper md:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-barber-gold/25 bg-barber-dark/75 p-4 md:sticky md:top-20 md:h-fit">
          <h1 className="text-lg font-semibold text-barber-gold">Compendio</h1>
          <p className="mt-1 text-xs text-barber-paper/65">
            Dati live dalle wiki delle tue campagne. Le card si aggiornano automaticamente.
          </p>

          <div className="mt-4 space-y-2">
            <label htmlFor="campaign-select" className="text-xs font-medium text-barber-paper/85">
              Campagna
            </label>
            <select
              id="campaign-select"
              value={selectedCampaignId ?? ""}
              onChange={(e) => void loadCompendium(e.target.value, false)}
              className="h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark/90 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
            >
              {campaigns.length === 0 && <option value="">Nessuna campagna disponibile</option>}
              {campaigns.length > 0 && (
                <option value={ALL_CAMPAIGNS_KEY}>
                  Tutte le campagne
                </option>
              )}
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>

            {selectedCampaignId && selectedCampaignId !== ALL_CAMPAIGNS_KEY && (
              <Link
                href={`/campaigns/${selectedCampaignId}?tab=gm`}
                className="inline-flex h-9 w-full items-center justify-center rounded-md border border-violet-500/35 bg-violet-500/15 px-3 text-xs font-medium text-violet-200 transition hover:bg-violet-500/25"
              >
                Apri sezione Solo GM campagna
              </Link>
            )}

            <button
              type="button"
              onClick={() => void loadCompendium(selectedCampaignId, false)}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-xs text-barber-paper/90 transition hover:bg-barber-gold/10"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Aggiorna ora
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <label htmlFor="compendium-search" className="text-xs font-medium text-barber-paper/85">
              Cerca per nome o descrizione
            </label>
            <input
              id="compendium-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Es. fuoco, bardo, rovine..."
              className="h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark/90 px-3 text-sm text-barber-paper placeholder:text-barber-paper/45 focus:outline-none focus:ring-2 focus:ring-barber-gold"
            />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-barber-paper/85">Filtra per tipo</p>
            <div className="flex flex-wrap gap-2 md:flex-col">
              {TYPE_FILTERS.map((f) => {
                const active = activeType === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setActiveType(f.key)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs transition",
                      active
                        ? "border-barber-gold bg-barber-gold/20 text-barber-gold"
                        : "border-barber-gold/30 bg-transparent text-barber-paper/85 hover:bg-barber-gold/10",
                    ].join(" ")}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-barber-paper/70">
              {filtered.length} risultati{activeType !== "Tutti" ? ` • filtro: ${activeType}` : ""}
            </p>
            {isSyncing && (
              <p className="text-xs text-barber-paper/50">Sincronizzazione...</p>
            )}
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-barber-gold/20 bg-barber-dark/60 p-8 text-center text-sm text-barber-paper/70">
              Caricamento compendio...
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-red-500/25 bg-red-950/20 p-8 text-center text-sm text-red-200">
              {loadError}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-barber-gold/20 bg-barber-dark/60 p-8 text-center text-sm text-barber-paper/70">
              Nessun elemento trovato con i filtri correnti.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((el) => (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => openCard(el.id)}
                  className="group w-full rounded-xl border border-barber-gold/20 bg-barber-dark/65 p-3 text-left transition hover:border-barber-gold/45 hover:bg-barber-dark/85"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md border border-barber-gold/20 bg-black/30">
                      <Image src={el.imageUrl} alt={el.name} fill className="object-cover" unoptimized />
                    </div>
                    <div className="min-w-0 flex-1">
                      {el.type === "NPC" && npcQuickFacts(el.details).length > 0 && (
                        <div className="mb-1 flex flex-wrap gap-1.5">
                          {npcQuickFacts(el.details).map((fact) => (
                            <span
                              key={`${el.id}-npc-fact-${fact.label}`}
                              className="rounded border border-sky-500/30 bg-sky-950/30 px-2 py-0.5 text-[11px] text-sky-100"
                            >
                              {fact.label}: {fact.value}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h2 className="line-clamp-1 text-base font-semibold text-barber-paper group-hover:text-barber-gold">
                          {el.name}
                        </h2>
                        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] ${badgeClass(el.type)}`}>
                          {el.type}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm text-barber-paper/80">{el.shortDesc}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {el.tags.slice(0, 4).map((tag) => (
                          <span
                            key={`${el.id}-${tag}`}
                            className="rounded border border-barber-gold/20 bg-barber-dark/80 px-2 py-0.5 text-[11px] text-barber-paper/75"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setActiveTab("description");
          }
        }}
      >
        <DialogContent className="flex h-[92vh] max-h-[92vh] max-w-6xl flex-col overflow-hidden border-barber-gold/40 bg-barber-dark pr-14 text-barber-paper sm:pr-16">
          {selected && (
            <>
              <DialogHeader className="pr-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-[11px] ${badgeClass(selected.type)}`}>
                    {selected.type}
                  </span>
                  <div className="mr-10 flex items-center gap-2 sm:mr-12">
                    <button
                      type="button"
                      onClick={goPrev}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-barber-gold/35 text-barber-paper hover:bg-barber-gold/10"
                      aria-label="Elemento precedente"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-barber-gold/35 text-barber-paper hover:bg-barber-gold/10"
                      aria-label="Elemento successivo"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mb-2 text-xs text-barber-paper/60">
                  {selectedIndex + 1} / {filtered.length}
                </div>
                <DialogTitle className="text-barber-gold">{selected.name}</DialogTitle>
                {selectedNpcFacts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedNpcFacts.map((fact) => (
                      <span
                        key={`selected-npc-fact-${selected.id}-${fact.label}`}
                        className="rounded border border-sky-500/30 bg-sky-950/30 px-2 py-0.5 text-[11px] text-sky-100"
                      >
                        {fact.label}: {fact.value}
                      </span>
                    ))}
                  </div>
                )}
              </DialogHeader>

              <div
                className="mt-3 min-h-0 flex-1"
                onTouchStart={(e) => setTouchStartX(e.changedTouches[0]?.clientX ?? null)}
                onTouchEnd={(e) => {
                  if (touchStartX == null) return;
                  const endX = e.changedTouches[0]?.clientX ?? touchStartX;
                  const delta = endX - touchStartX;
                  if (delta > 50) goPrev();
                  if (delta < -50) goNext();
                  setTouchStartX(null);
                }}
              >
                <div className="grid h-full grid-cols-[minmax(190px,38%)_minmax(0,1fr)] gap-4">
                  <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-lg border border-barber-gold/30 bg-black/20">
                    <Image
                      src={selected.imageUrl}
                      alt={selected.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab("description")}
                        className={[
                          "rounded-md border px-4 py-2 text-sm font-medium transition",
                          activeTab === "description"
                            ? "border-barber-gold bg-barber-gold/20 text-barber-gold"
                            : "border-barber-gold/25 text-barber-paper/85 hover:bg-barber-gold/10",
                        ].join(" ")}
                      >
                        Descrizione
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("details")}
                        className={[
                          "rounded-md border px-3 py-1.5 text-xs transition",
                          activeTab === "details"
                            ? "border-barber-gold bg-barber-gold/20 text-barber-gold"
                            : "border-barber-gold/25 text-barber-paper/85 hover:bg-barber-gold/10",
                        ].join(" ")}
                      >
                        Altre info
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("tags")}
                        className={[
                          "rounded-md border px-3 py-1.5 text-xs transition",
                          activeTab === "tags"
                            ? "border-barber-gold bg-barber-gold/20 text-barber-gold"
                            : "border-barber-gold/25 text-barber-paper/85 hover:bg-barber-gold/10",
                        ].join(" ")}
                      >
                        Tag
                      </button>
                    </div>

                    {activeTab === "description" && (
                      <div className="rounded-lg border border-barber-gold/25 bg-barber-dark/70 p-4">
                        <p className="mb-3 text-sm text-barber-paper/75">{selected.shortDesc}</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/90">
                          {selected.content}
                        </p>
                      </div>
                    )}

                    {activeTab === "details" && (
                      <div className="rounded-lg border border-barber-gold/25 bg-barber-dark/70 p-4">
                        {selectedNpcFacts.length > 0 && (
                          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {selectedNpcFacts.map((fact) => (
                              <div
                                key={`npc-fact-details-${selected.id}-${fact.label}`}
                                className="min-h-16 rounded-md border border-sky-500/30 bg-sky-950/20 px-3 py-2"
                              >
                                <p className="text-[11px] uppercase tracking-wide text-sky-200/85">{fact.label}</p>
                                <p className="whitespace-pre-wrap break-words text-sm leading-snug text-sky-100">
                                  {fact.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedDetailEntries.length === 0 ? (
                          <p className="text-sm text-barber-paper/70">Nessuna info extra disponibile.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                            {selectedDetailEntries.map(([k, v]) => (
                              <div
                                key={`${selected.id}-${k}`}
                                className="min-h-16 rounded-md border border-barber-gold/20 px-3 py-2"
                              >
                                <p className="text-[11px] uppercase tracking-wide text-barber-gold/80">{k}</p>
                                <p className="whitespace-pre-wrap break-words text-sm leading-snug text-barber-paper/90">
                                  {v}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "tags" && (
                      <div className="rounded-lg border border-barber-gold/25 bg-barber-dark/70 p-4">
                        <div className="mb-3 flex flex-wrap gap-2">
                          {selected.tags.length > 0 ? (
                            selected.tags.map((tag) => (
                              <span
                                key={`tag-tab-${selected.id}-${tag}`}
                                className="rounded border border-barber-gold/25 bg-barber-dark/80 px-2 py-1 text-xs text-barber-paper/85"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm text-barber-paper/70">Nessun tag disponibile.</p>
                          )}
                        </div>
                        <p className="text-sm text-barber-paper/75">
                          Usa i tag per cercare rapidamente altri elementi simili nel compendio.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
