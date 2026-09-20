"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronLeft,
  Coins,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Lock,
  MapPin,
  Package,
  Pencil,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Tag,
  UserCircle2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DualSourceImage } from "@/components/dual-source-image";
import { ImageMediaActions } from "@/components/media/image-media-actions";
import { EntityContent } from "./entity-content";
import { WikiEntityDeleteButton } from "./wiki-entity-delete-button";
import type { WikiEntityListItem } from "./wiki-list-client";
import { cn } from "@/lib/utils";

const PLACEHOLDER_IMAGES: Record<string, string> = {
  npc: "https://placehold.co/400x500/18120c/d4af37/png?text=PNG",
  location: "https://placehold.co/400x500/0d1f18/34d399/png?text=Luogo",
  monster: "https://placehold.co/400x500/220d0f/f87171/png?text=Mostro",
  item: "https://placehold.co/400x500/1c150c/fbbf24/png?text=Oggetto",
  lore: "https://placehold.co/400x500/17111a/c084fc/png?text=Cronache",
};

const TYPE_CONFIG: Record<
  string,
  {
    icon: ComponentType<{ className?: string }>;
    label: string;
    border: string;
    badgeBg: string;
    textColor: string;
    glow: string;
  }
> = {
  npc: {
    icon: Users,
    label: "Personaggio (PNG)",
    border: "border-brass-base/40",
    badgeBg: "bg-amber-950/80 text-amber-200 border-amber-600/40",
    textColor: "text-brass-light",
    glow: "rgba(217, 119, 6, 0.2)",
  },
  location: {
    icon: MapPin,
    label: "Luogo & Territorio",
    border: "border-emerald-600/40",
    badgeBg: "bg-emerald-950/80 text-emerald-200 border-emerald-600/40",
    textColor: "text-emerald-300",
    glow: "rgba(16, 185, 129, 0.2)",
  },
  monster: {
    icon: Skull,
    label: "Creatura & Mostro",
    border: "border-red-600/40",
    badgeBg: "bg-red-950/80 text-red-200 border-red-600/40",
    textColor: "text-red-300",
    glow: "rgba(239, 68, 68, 0.2)",
  },
  item: {
    icon: Package,
    label: "Oggetto & Artefatto",
    border: "border-amber-600/40",
    badgeBg: "bg-amber-950/80 text-amber-200 border-amber-600/40",
    textColor: "text-amber-300",
    glow: "rgba(245, 158, 11, 0.2)",
  },
  lore: {
    icon: ScrollText,
    label: "Cronaca & Storia",
    border: "border-purple-600/40",
    badgeBg: "bg-purple-950/80 text-purple-200 border-purple-600/40",
    textColor: "text-purple-300",
    glow: "rgba(168, 85, 247, 0.2)",
  },
};

type WikiCodexReaderProps = {
  entity: WikiEntityListItem | null;
  campaignId: string;
  isGmOrAdmin: boolean;
  onBackToIndex?: () => void;
};

export function WikiCodexReader({
  entity,
  campaignId,
  isGmOrAdmin,
  onBackToIndex,
}: WikiCodexReaderProps) {
  const [secretsOpen, setSecretsOpen] = useState(false);

  if (!entity) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brass-base/30 bg-[#120d09]/90 p-8 text-center text-parchment-300 shadow-xl">
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-brass-base/40 bg-guild-stone shadow-lg">
          <BookOpen className="h-8 w-8 text-brass-light" />
        </div>
        <h3 className="font-cinzel text-lg font-bold uppercase tracking-wider text-gold-relief">
          Il Grande Tomo è Aperto
        </h3>
        <p className="mt-1.5 max-w-md text-xs font-serif leading-relaxed text-parchment-400">
          Seleziona una voce dall&apos;indice dell&apos;archivio a sinistra per consultare la sua
          cronaca miniata, i ritratti araldici e i segreti custoditi.
        </p>
      </div>
    );
  }

  const typeMeta = TYPE_CONFIG[entity.type] ?? TYPE_CONFIG.lore;
  const TypeIcon = typeMeta.icon;
  const entityUrl = `/campaigns/${campaignId}/wiki/${entity.id}`;
  const editUrl = `${entityUrl}?edit=1`;

  const attrs = (entity.attributes ?? {}) as Record<string, unknown>;
  const gmNotes = typeof attrs.gm_notes === "string" ? attrs.gm_notes.trim() : "";
  const relationships = typeof attrs.relationships === "string" ? attrs.relationships.trim() : "";
  const loot = typeof attrs.loot === "string" ? attrs.loot.trim() : "";
  const combatStats = (attrs.combat_stats ?? {}) as Record<string, unknown>;

  const hasSecretSection = isGmOrAdmin && (Boolean(gmNotes) || Boolean(relationships) || Boolean(loot));
  const defaultPlaceholder = PLACEHOLDER_IMAGES[entity.type] ?? PLACEHOLDER_IMAGES.lore;

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-brass-base/40 bg-gradient-to-b from-[#1b130c] via-[#16100a] to-[#110b07] shadow-2xl">
      {/* Angolari Araldici Bruniti */}
      <div className="corner-ornament-tl" />
      <div className="corner-ornament-tr" />
      <div className="corner-ornament-bl" />
      <div className="corner-ornament-br" />

      {/* Segnalibro in raso cremisi decorativo in basso a destra */}
      <div
        className="pointer-events-none absolute -bottom-2 right-8 h-7 w-4 skew-x-3 rounded-b border border-red-700/60 bg-gradient-to-b from-red-700 to-red-950 shadow-md"
        title="Segnalibro di Gilda"
      />

      {/* =========================================================================
          BARRA DI TESTATA DEL TOMO (Azioni, Categoria, Visibilità)
          ========================================================================= */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-brass-base/25 bg-gradient-to-r from-[#20160e] via-[#1b120b] to-[#180f08] px-3.5 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {onBackToIndex && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBackToIndex}
              className="lg:hidden h-7 border-brass-base/30 bg-[#120d09] px-2 text-xs font-serif text-parchment-200 hover:text-gold-relief"
            >
              <ChevronLeft className="mr-0.5 h-3.5 w-3.5" />
              Indice
            </Button>
          )}

          <Badge
            variant="outline"
            className={cn("flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-cinzel font-semibold shadow-sm", typeMeta.badgeBg)}
          >
            <TypeIcon className="h-3 w-3" />
            <span>{typeMeta.label}</span>
          </Badge>

          {entity.missionTitle && (
            <Badge
              variant="outline"
              className="border-amber-600/35 bg-amber-950/40 text-[10px] font-serif text-amber-200"
            >
              📜 {entity.missionTitle}
            </Badge>
          )}

          {isGmOrAdmin && (entity.isSecret || entity.visibility === "secret" || entity.visibility === "selective") && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 border-red-500/40 bg-red-950/60 text-[10px] font-serif text-red-200"
            >
              <Lock className="h-2.5 w-2.5" />
              {entity.visibility === "selective"
                ? `Selettiva (${entity.selectiveAudienceLabel || "Giocatori"})`
                : "Segreto del Master"}
            </Badge>
          )}
        </div>

        {/* Pulsanti Azioni Rapide */}
        <div className="flex items-center gap-1.5">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-7 border-brass-base/40 bg-[#140e08] px-2 text-[11px] font-serif text-parchment-200 hover:border-brass-light hover:bg-brass-base/20 hover:text-gold-relief"
          >
            <Link href={editUrl} title="Modifica questa voce">
              <Pencil className="mr-1 h-3 w-3 text-amber-300" />
              Modifica
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-7 border-brass-base/40 bg-[#140e08] px-2 text-[11px] font-serif text-parchment-200 hover:border-brass-light hover:bg-brass-base/20 hover:text-gold-relief"
          >
            <Link href={entityUrl} title="Apri scheda a schermo intero">
              <ExternalLink className="mr-1 h-3 w-3 text-amber-300" />
              Espandi
            </Link>
          </Button>

          {isGmOrAdmin && (
            <WikiEntityDeleteButton
              compact
              campaignId={campaignId}
              entityId={entity.id}
              entityName={entity.name}
            />
          )}
        </div>
      </header>

      {/* =========================================================================
          CORPO CENTRALE DEL MANOSCRITTO (Scrollabile)
          ========================================================================= */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Testata della Scheda con Titolo Monumentale */}
        <div className="border-b border-brass-base/20 pb-4">
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-brass-light via-amber-200 to-amber-400">
            {entity.name}
          </h1>
          {entity.tags && entity.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {entity.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md border border-brass-base/25 bg-[#120d09] px-2 py-0.5 text-[10px] font-serif text-parchment-300"
                >
                  <Tag className="h-2.5 w-2.5 text-brass-base" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Griglia Superiore: Ritratto Inquadrato & Dossier Rapido */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Ritratto Framed con Cornice Dorata Cesellata (Col 4) */}
          <div className="md:col-span-4 flex flex-col items-center">
            <div className="relative aspect-[3/4] w-full max-w-[260px] overflow-hidden rounded-xl border-4 border-brass-base/60 bg-gradient-to-b from-amber-950/40 to-black p-1 shadow-[0_0_20px_rgba(217,119,6,0.25)]">
              <DualSourceImage
                driveUrl={entity.imageUrl ?? defaultPlaceholder}
                telegramFallbackId={entity.telegramFallbackId ?? null}
                alt={entity.name}
                className="h-full w-full rounded-lg object-cover"
              />
              <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_15px_rgba(0,0,0,0.85)]" />
            </div>
            {entity.imageUrl && (
              <div className="mt-2 w-full max-w-[260px]">
                <ImageMediaActions
                  driveUrl={entity.imageUrl}
                  telegramFallbackId={entity.telegramFallbackId}
                  title={entity.name}
                />
              </div>
            )}
          </div>

          {/* Scheda Attributi Specifici (Col 8) */}
          <div className="md:col-span-8 space-y-4">
            {/* Profilo per PNG */}
            {entity.type === "npc" && (
              <div className="rounded-xl border border-brass-base/30 bg-[#160f09]/80 p-3.5 shadow-md">
                <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light border-b border-brass-base/15 pb-2 mb-3">
                  <UserCircle2 className="h-3.5 w-3.5 text-brass-base" />
                  <span>Dossier Personaggio</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-serif">
                  <div className="rounded border border-brass-base/15 bg-[#100b07] p-2">
                    <span className="block text-[10px] uppercase font-cinzel text-brass-base">Razza</span>
                    <span className="font-semibold text-parchment-100">
                      {typeof attrs.race === "string" && attrs.race.trim() ? attrs.race : "—"}
                    </span>
                  </div>
                  <div className="rounded border border-brass-base/15 bg-[#100b07] p-2">
                    <span className="block text-[10px] uppercase font-cinzel text-brass-base">Classe</span>
                    <span className="font-semibold text-parchment-100">
                      {typeof attrs.class === "string" && attrs.class.trim() ? attrs.class : "—"}
                    </span>
                  </div>
                  <div className="rounded border border-brass-base/15 bg-[#100b07] p-2">
                    <span className="block text-[10px] uppercase font-cinzel text-brass-base">Età</span>
                    <span className="font-semibold text-parchment-100">
                      {typeof attrs.age === "string" && attrs.age.trim() ? attrs.age : "—"}
                    </span>
                  </div>
                  {typeof attrs.role === "string" && attrs.role.trim() && (
                    <div className="col-span-2 rounded border border-brass-base/15 bg-[#100b07] p-2">
                      <span className="block text-[10px] uppercase font-cinzel text-brass-base">Ruolo / Fazione</span>
                      <span className="font-semibold text-parchment-100">{attrs.role}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Profilo per Mostro / Creatura */}
            {entity.type === "monster" && (
              <div className="rounded-xl border border-red-700/40 bg-[#1a0f10]/80 p-3.5 shadow-md">
                <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase tracking-wider text-red-300 border-b border-red-700/20 pb-2 mb-3">
                  <Skull className="h-3.5 w-3.5 text-red-400" />
                  <span>Statistiche di Combattimento</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 text-xs font-serif">
                  <div className="rounded border border-red-700/20 bg-[#120809] p-2 text-center">
                    <span className="block text-[10px] uppercase font-cinzel text-red-400">Classe Armatura</span>
                    <span className="text-base font-bold font-mono text-red-200">
                      {String(combatStats.ac || attrs.ac || "—")}
                    </span>
                  </div>
                  <div className="rounded border border-red-700/20 bg-[#120809] p-2 text-center">
                    <span className="block text-[10px] uppercase font-cinzel text-red-400">Punti Ferita</span>
                    <span className="text-base font-bold font-mono text-red-200">
                      {String(combatStats.hp || attrs.hp || "—")}
                    </span>
                  </div>
                  <div className="rounded border border-red-700/20 bg-[#120809] p-2 text-center">
                    <span className="block text-[10px] uppercase font-cinzel text-red-400">Sfida (CR)</span>
                    <span className="text-base font-bold font-mono text-red-200">
                      {String(combatStats.cr || attrs.cr || "—")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Profilo per Luogo */}
            {entity.type === "location" && (
              <div className="rounded-xl border border-emerald-700/40 bg-[#0f1712]/80 p-3.5 shadow-md">
                <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase tracking-wider text-emerald-300 border-b border-emerald-700/20 pb-2 mb-3">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Dossier Territoriale</span>
                </div>
                <p className="text-xs font-serif text-parchment-200 leading-relaxed">
                  Punto d&apos;interesse cartografico registrato negli archivi di gilda.
                </p>
              </div>
            )}

            {/* Descrizione Breve se presente */}
            {entity.description && (
              <div className="rounded-xl border border-brass-base/20 bg-[#130d08]/60 p-3 italic text-xs font-serif text-parchment-300">
                &ldquo;{entity.description}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            CRONACA & BIOGRAFIA NARRATIVA (Con Lettera Miniata Drop-Cap)
            ========================================================================= */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-brass-base/20 pb-2">
            <ScrollText className="h-4 w-4 text-brass-base" />
            <h2 className="font-cinzel text-sm font-bold uppercase tracking-widest text-brass-light">
              Cronaca & Memorie
            </h2>
          </div>

          <div className="prose prose-invert max-w-none text-sm font-serif leading-relaxed text-parchment-200 first-letter:float-left first-letter:mr-3 first-letter:rounded first-letter:border first-letter:border-brass-base/50 first-letter:bg-guild-void first-letter:p-2 first-letter:font-cinzel first-letter:text-3xl first-letter:font-bold first-letter:text-gold-relief shadow-inner">
            {entity.contentBody ? (
              <EntityContent content={entity.contentBody} />
            ) : (
              <p className="italic text-parchment-500">Nessuna cronaca registrata in questa voce.</p>
            )}
          </div>
        </section>

        {/* =========================================================================
            BUSTA SIGILLATA DEI SEGRETI DEL MASTER (Se GM e presenti dati segreti)
            ========================================================================= */}
        {hasSecretSection && (
          <section className="pt-2">
            <div className="overflow-hidden rounded-xl border-2 border-red-900/60 bg-[#160b0c] shadow-xl">
              {/* Testata Busta con Sigillo Ceralacca */}
              <button
                type="button"
                onClick={() => setSecretsOpen(!secretsOpen)}
                className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-[#2a1012] via-[#200c0e] to-[#1a080a] text-left hover:brightness-110 transition-all border-b border-red-900/40"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-full border border-red-600/70 bg-red-900 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                    <Lock className="h-3.5 w-3.5 text-red-200" />
                  </div>
                  <div>
                    <h3 className="font-cinzel text-xs font-bold uppercase tracking-wider text-red-200">
                      ✦ Segreti del Dungeon Master
                    </h3>
                    <p className="text-[10px] font-serif text-red-300/70">
                      {secretsOpen ? "Sigillo spezzato — Visibile al Master" : "Busta sigillata in ceralacca — Clicca per rivelare"}
                    </p>
                  </div>
                </div>

                <span className="flex items-center gap-1 rounded border border-red-600/30 bg-red-950/80 px-2 py-1 text-[10px] font-cinzel text-red-200">
                  {secretsOpen ? (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      Nascondi
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Dissigilla
                    </>
                  )}
                </span>
              </button>

              {/* Contenuto Segreto svelato */}
              {secretsOpen && (
                <div className="p-4 space-y-3.5 bg-[#120708] text-xs font-serif leading-relaxed text-red-100 animate-in fade-in-50 duration-200">
                  {gmNotes && (
                    <div className="space-y-1">
                      <span className="block font-cinzel text-[10px] uppercase font-bold text-red-300">
                        Note Riservate GM:
                      </span>
                      <div className="rounded border border-red-900/40 bg-[#1c0c0e] p-3 text-red-100/90 whitespace-pre-wrap">
                        {gmNotes}
                      </div>
                    </div>
                  )}

                  {relationships && (
                    <div className="space-y-1">
                      <span className="block font-cinzel text-[10px] uppercase font-bold text-red-300">
                        Rapporti Interpersonali & Alleanze Segrete:
                      </span>
                      <div className="rounded border border-red-900/40 bg-[#1c0c0e] p-3 text-red-100/90 whitespace-pre-wrap">
                        {relationships}
                      </div>
                    </div>
                  )}

                  {loot && (
                    <div className="space-y-1">
                      <span className="block font-cinzel text-[10px] uppercase font-bold text-red-300">
                        Loot / Tesoro Nascosto:
                      </span>
                      <div className="rounded border border-red-900/40 bg-[#1c0c0e] p-3 text-red-100/90 whitespace-pre-wrap">
                        {loot}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
