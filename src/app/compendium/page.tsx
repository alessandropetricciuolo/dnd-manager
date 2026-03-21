"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CompendiumType = "Mostro" | "Incantesimo" | "PNG" | "Oggetto Magico" | "Luogo";

type WikiElement = {
  id: string;
  name: string;
  type: CompendiumType;
  tags: string[];
  imageUrl: string;
  shortDesc: string;
  content: string;
  details: Record<string, string>;
};

const mockWikiElements: WikiElement[] = [
  {
    id: "m1",
    name: "Drake di Cenere",
    type: "Mostro",
    tags: ["Fuoco", "Volante", "GS 5"],
    imageUrl: "https://placehold.co/900x580/2a1f1d/e8dccb?text=Drake+di+Cenere",
    shortDesc: "Predatore alato che domina gole vulcaniche e campi di lava.",
    content:
      "Il Drake di Cenere e' un predatore territoriale. Soffio infuocato (cono 4,5 m, TS Des CD 14), artigli e morso. Resistente al fuoco, vulnerabile al freddo intenso. Tattica: attacco in picchiata seguito da riposizionamento in quota.",
    details: {
      GS: "5",
      AC: "16",
      HP: "95 (10d10+40)",
      Habitat: "Gole vulcaniche",
      Sensi: "Scurovisione 18 m",
    },
  },
  {
    id: "s1",
    name: "Catena di Fulmini Minore",
    type: "Incantesimo",
    tags: ["Livello 3", "Fulmine", "Azione"],
    imageUrl: "https://placehold.co/900x580/1c2236/dbe4ff?text=Catena+di+Fulmini+Minore",
    shortDesc: "Scarica elettrica che salta tra piu bersagli ravvicinati.",
    content:
      "Tempo di lancio 1 azione, gittata 18 m, componenti V/S. Un bersaglio principale subisce 4d8 danni da fulmine (TS Des dimezza). La scarica salta fino a 2 bersagli entro 3 m dal primo, 2d8 danni ciascuno.",
    details: {
      Livello: "3",
      Scuola: "Invocazione",
      Tempo: "1 azione",
      Durata: "Istantanea",
      Componenti: "V, S",
    },
  },
  {
    id: "n1",
    name: "Iria 'la Nota d'Argento'",
    type: "PNG",
    tags: ["Bardo", "Informatori", "Citta"],
    imageUrl: "https://placehold.co/900x580/2f2534/f2d8ff?text=Iria+la+Nota+d%27Argento",
    shortDesc: "Cantastorie e mediatrice, custodisce segreti delle gilde.",
    content:
      "Iria gestisce un salotto musicale dietro il mercato vecchio. Offre voci e contatti in cambio di favori sociali. Tratto: memoria perfetta per i nomi. Difetto: non sopporta menzogne grossolane.",
    details: {
      Ruolo: "Contatto sociale",
      Affiliazione: "Gilda mercantile",
      Motivazione: "Proteggere i propri informatori",
      Legame: "Debito con i PG",
    },
  },
  {
    id: "i1",
    name: "Lama del Tramonto",
    type: "Oggetto Magico",
    tags: ["Raro", "Spada Lunga", "Radiante"],
    imageUrl: "https://placehold.co/900x580/332816/f7e4b8?text=Lama+del+Tramonto",
    shortDesc: "Spada antica che accumula luce durante il giorno.",
    content:
      "Arma +1. Una volta per riposo lungo, puoi spendere un'azione bonus per infondere la lama: per 1 minuto infligge +1d6 radiante. In aree di oscurita magica, il bonus radiante e' sospeso.",
    details: {
      Rarita: "Raro",
      Tipo: "Spada lunga +1",
      Attunement: "No",
      Effetto: "+1d6 radiante (1/min per riposo lungo)",
    },
  },
  {
    id: "l1",
    name: "Rovine di Vhal-Tor",
    type: "Luogo",
    tags: ["Dungeon", "Antico Impero", "Non Morti"],
    imageUrl: "https://placehold.co/900x580/1c2720/d9f2e3?text=Rovine+di+Vhal-Tor",
    shortDesc: "Complesso sotterraneo crollato con altari e archivi perduti.",
    content:
      "Le rovine si sviluppano su tre livelli. Trappole a pressione, corridoi allagati e un santuario centrale protetto da custodi scheletrici. Ricompense: pergamene incompiute e frammenti di mappa astrale.",
    details: {
      Zona: "Nord del regno",
      Minaccia: "Media-Alta",
      Tema: "Rovine imperiali",
      Ricompense: "Pergamene, mappe astrali",
    },
  },
];

const TYPE_FILTERS: Array<{ key: "Tutti" | CompendiumType; label: string }> = [
  { key: "Tutti", label: "Tutti" },
  { key: "Mostro", label: "Mostri" },
  { key: "Incantesimo", label: "Incantesimi" },
  { key: "PNG", label: "PNG" },
  { key: "Oggetto Magico", label: "Oggetti Magici" },
  { key: "Luogo", label: "Luoghi" },
];

function badgeClass(type: CompendiumType): string {
  switch (type) {
    case "Mostro":
      return "bg-red-900/40 text-red-200 border-red-500/40";
    case "Incantesimo":
      return "bg-violet-900/40 text-violet-200 border-violet-500/40";
    case "PNG":
      return "bg-sky-900/40 text-sky-200 border-sky-500/40";
    case "Oggetto Magico":
      return "bg-amber-900/40 text-amber-200 border-amber-500/40";
    case "Luogo":
      return "bg-emerald-900/40 text-emerald-200 border-emerald-500/40";
    default:
      return "bg-zinc-800 text-zinc-200 border-zinc-600";
  }
}

export default function CompendiumPage() {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<"Tutti" | CompendiumType>("Tutti");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "details" | "tags">("description");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockWikiElements.filter((el) => {
      const typeMatch = activeType === "Tutti" || el.type === activeType;
      if (!typeMatch) return false;
      if (!q) return true;

      const haystack = [el.name, el.shortDesc, el.content, el.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, activeType]);

  const selectedIndex = useMemo(
    () => (selectedId ? filtered.findIndex((el) => el.id === selectedId) : -1),
    [filtered, selectedId]
  );
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : null;

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
            Wiki homebrew ricercabile per campagna: filtra e apri i dettagli in modal.
          </p>

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
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-barber-gold/20 bg-barber-dark/60 p-8 text-center text-sm text-barber-paper/70">
              Nessun elemento trovato con i filtri correnti.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((el) => (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => openCard(el.id)}
                  className="group rounded-xl border border-barber-gold/20 bg-barber-dark/65 p-4 text-left transition hover:border-barber-gold/45 hover:bg-barber-dark/85"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 text-base font-semibold text-barber-paper group-hover:text-barber-gold">
                      {el.name}
                    </h2>
                    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] ${badgeClass(el.type)}`}>
                      {el.type}
                    </span>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {el.tags.map((tag) => (
                      <span
                        key={`${el.id}-${tag}`}
                        className="rounded border border-barber-gold/20 bg-barber-dark/80 px-2 py-0.5 text-[11px] text-barber-paper/75"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="line-clamp-3 text-sm text-barber-paper/80">{el.shortDesc}</p>
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
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto border-barber-gold/40 bg-barber-dark text-barber-paper">
          {selected && (
            <>
              <DialogHeader>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-[11px] ${badgeClass(selected.type)}`}>
                    {selected.type}
                  </span>
                  <div className="flex items-center gap-2">
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
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((tag) => (
                      <span
                        key={`modal-${selected.id}-${tag}`}
                        className="rounded border border-barber-gold/25 bg-barber-dark/70 px-2 py-0.5 text-[11px] text-barber-paper/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <DialogTitle className="text-barber-gold">{selected.name}</DialogTitle>
                <DialogDescription className="text-barber-paper/75">{selected.shortDesc}</DialogDescription>
              </DialogHeader>

              <div
                className="mt-3 space-y-3"
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
                <div className="relative aspect-[16/8] w-full overflow-hidden rounded-lg border border-barber-gold/30 bg-black/20">
                  <Image
                    src={selected.imageUrl}
                    alt={selected.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

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
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/90">
                      {selected.content}
                    </p>
                  </div>
                )}

                {activeTab === "details" && (
                  <div className="rounded-lg border border-barber-gold/25 bg-barber-dark/70 p-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {Object.entries(selected.details).map(([k, v]) => (
                        <div key={`${selected.id}-${k}`} className="rounded-md border border-barber-gold/20 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-barber-gold/80">{k}</p>
                          <p className="text-sm text-barber-paper/90">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "tags" && (
                  <div className="rounded-lg border border-barber-gold/25 bg-barber-dark/70 p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selected.tags.map((tag) => (
                        <span
                          key={`tag-tab-${selected.id}-${tag}`}
                          className="rounded border border-barber-gold/25 bg-barber-dark/80 px-2 py-1 text-xs text-barber-paper/85"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-barber-paper/75">
                      Usa i tag per cercare rapidamente altri elementi simili nel compendio.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
