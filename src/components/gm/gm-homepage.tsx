"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, FlaskConical, Layers, Mail, Map, Palette, Sparkles, Swords, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GmScreenLauncher } from "@/components/gm/gm-screen-launcher";
import { GmNotes } from "@/components/gm/gm-notes";
import { GmFiles } from "@/components/gm/gm-files";
import { LongCampaignCalendarSettings } from "@/components/gm/long-campaign-calendar-settings";
import { CampaignMemoryQueryPanel } from "@/components/gm/campaign-memory-query-panel";
import { CampaignAiArchitectPanel } from "@/components/campaigns/campaign-ai-architect-panel";
import { CampaignEmailPanel } from "@/components/campaigns/campaign-email-panel";
import { CampaignPrimerEditor } from "@/components/gm/campaign-primer-editor";
import { ManualSemanticSearch } from "@/components/admin/manual-semantic-search";
import type { CampaignAiContext } from "@/lib/campaign-ai-context";
import type { PrimerTypography } from "@/app/campaigns/actions";
import { isLongCampaignType, isTorneoCampaignType } from "@/lib/campaign-type";
import type { CampaignType } from "@/lib/campaign-type";

type JoinEmailSettings = {
  join_enabled: boolean;
  join_subject: string;
  join_body_html: string;
};

type BulkTemplate = {
  id: string;
  subject: string;
  body_html: string;
  created_at: string;
};

type GmHomepageProps = {
  campaignId: string;
  campaignType?: CampaignType | null;
  aiContextParsed: CampaignAiContext | null;
  /** Manuali esclusi dal RAG wiki (anche senza i sei paletti Architetto). */
  excludedManualBookKeys: string[];
  joinEmailSettings: JoinEmailSettings | null;
  bulkEmailTemplates: BulkTemplate[];
  initialPlayerPrimer: string | null;
  initialTypography?: PrimerTypography | null;
  isAdmin?: boolean;
  hideQuickActions?: boolean;
};

export function GmHomepage({
  campaignId,
  campaignType,
  aiContextParsed,
  excludedManualBookKeys,
  joinEmailSettings,
  bulkEmailTemplates,
  initialPlayerPrimer,
  initialTypography,
  isAdmin = false,
  hideQuickActions = false,
}: GmHomepageProps) {
  const isLongCampaign = isLongCampaignType(campaignType);
  const isTorneo = isTorneoCampaignType(campaignType);

  const [aiOpen, setAiOpen] = useState(false);
  const [commsOpen, setCommsOpen] = useState(false);
  const [primerOpen, setPrimerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="card-guild-stone relative rounded-2xl border border-[#3b322b] p-5 sm:p-7 md:p-8 shadow-2xl space-y-8">
      <span className="corner-ornament-tl" />
      <span className="corner-ornament-tr" />
      <span className="corner-ornament-bl" />
      <span className="corner-ornament-br" />

      {/* Testata Master Screen */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-barber-gold/20 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rotate-45 border border-barber-gold/80 bg-barber-gold/40" />
            <span className="text-[10px] uppercase tracking-widest text-barber-gold/80 font-semibold">Tavolo di Regia</span>
          </div>
          <h2 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wider text-gold-relief">
            Strumenti del Dungeon Master
          </h2>
          <p className="text-xs text-barber-paper/65 mt-0.5">
            Fucina tattica, grimori arcani, automazioni e gestione segreta della campagna
          </p>
        </div>
      </div>

      {/* Stazioni di Comando */}
      {!hideQuickActions ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Stazione 1: Schermi & Battle-Grid */}
          <div className="rounded-xl border border-barber-gold/20 bg-black/40 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-barber-gold/15 pb-2">
              <Terminal className="h-4 w-4 text-barber-gold" />
              <h3 className="font-cinzel text-xs font-bold uppercase tracking-wider text-barber-gold">
                Schermi & Proiezione
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-amber-600/50 bg-black/40 text-amber-200 hover:bg-amber-600/20 text-xs"
              >
                <Link href={`/command-center?campaignId=${campaignId}`}>
                  <Terminal className="mr-1.5 h-3.5 w-3.5" />
                  Command Center
                </Link>
              </Button>

              <GmScreenLauncher
                campaignId={campaignId}
                className="border-barber-gold/40 bg-black/40 text-barber-paper hover:bg-barber-gold/15 text-xs"
              />

              {!isTorneo ? (
                <GmScreenLauncher
                  campaignId={campaignId}
                  variant="v2"
                  className="border-cyan-600/50 bg-black/40 text-cyan-200 hover:bg-cyan-600/20 text-xs"
                />
              ) : null}

              {isTorneo ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-emerald-600/50 bg-black/40 text-emerald-200 hover:bg-emerald-600/20 text-xs"
                >
                  <Link href={`/campaigns/${campaignId}/torneo2`}>
                    <Swords className="mr-1.5 h-3.5 w-3.5" />
                    Torneo 2.0
                  </Link>
                </Button>
              ) : null}

              {!isTorneo ? (
                <>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-barber-gold/30 bg-black/40 text-barber-paper/90 hover:bg-barber-gold/15 text-xs"
                  >
                    <Link href={`/campaigns/${campaignId}?tab=mappe`}>
                      <Map className="mr-1.5 h-3.5 w-3.5" />
                      Mappe
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-barber-gold/30 bg-black/40 text-barber-paper/90 hover:bg-barber-gold/15 text-xs"
                  >
                    <Link href={`/campaigns/${campaignId}/gm-only/vista-dall-alto`}>
                      <Layers className="mr-1.5 h-3.5 w-3.5" />
                      Vista FOW
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-barber-gold/30 bg-black/40 text-barber-paper/90 hover:bg-barber-gold/15 text-xs"
                  >
                    <Link href={`/campaigns/${campaignId}/gm-only/scene-workspace`}>
                      <Layers className="mr-1.5 h-3.5 w-3.5" />
                      Scene V2
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-barber-gold/30 bg-black/40 text-barber-paper/90 hover:bg-barber-gold/15 text-xs"
                  >
                    <Link href={`/campaigns/${campaignId}/gm-only/concept-map`}>
                      <Map className="mr-1.5 h-3.5 w-3.5" />
                      Mappa Concettuale
                    </Link>
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {/* Stazione 2: Grimorio & Regole */}
          <div className="rounded-xl border border-barber-gold/20 bg-black/40 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-barber-gold/15 pb-2">
              <BookOpen className="h-4 w-4 text-barber-gold" />
              <h3 className="font-cinzel text-xs font-bold uppercase tracking-wider text-barber-gold">
                Grimorio & Compendio
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-barber-gold/40 bg-black/40 text-barber-paper hover:bg-barber-gold/15 text-xs"
              >
                <Link href={`/compendium?campaignId=${campaignId}`}>
                  <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                  Apri Compendio
                </Link>
              </Button>

              {!isTorneo ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={
                    aiOpen
                      ? "border-barber-gold bg-barber-gold/20 text-barber-gold text-xs shadow-[0_0_10px_rgba(200,157,73,0.3)]"
                      : "border-barber-gold/40 bg-black/40 text-barber-paper hover:bg-barber-gold/15 text-xs"
                  }
                  onClick={() => setAiOpen((o) => !o)}
                  title="Funzioni AI della campagna"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-barber-gold" />
                  Architetto AI
                </Button>
              ) : null}

              {isLongCampaign && isAdmin ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-amber-600/40 bg-black/40 text-amber-200 hover:bg-amber-600/20 text-xs"
                  title="Apri l'ambiente di test AI Memory Preview"
                >
                  <Link href={`/campaigns/${campaignId}/gm-only/ai-memory-preview`}>
                    <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
                    AI Memory Preview
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          {/* Stazione 3: Cronaca & Comunicazioni */}
          <div className="rounded-xl border border-barber-gold/20 bg-black/40 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-barber-gold/15 pb-2">
              <Mail className="h-4 w-4 text-barber-gold" />
              <h3 className="font-cinzel text-xs font-bold uppercase tracking-wider text-barber-gold">
                Cronaca & Amministrazione
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {isLongCampaign ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={
                    calendarOpen
                      ? "border-barber-gold bg-barber-gold/20 text-barber-gold text-xs shadow-[0_0_10px_rgba(200,157,73,0.3)]"
                      : "border-barber-gold/40 bg-black/40 text-barber-paper hover:bg-barber-gold/15 text-xs"
                  }
                  onClick={() => setCalendarOpen((o) => !o)}
                  title="Calendario campagna long"
                >
                  <Map className="mr-1.5 h-3.5 w-3.5" />
                  Calendario
                </Button>
              ) : null}

              {isLongCampaign ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={
                    commsOpen
                      ? "border-barber-gold bg-barber-gold/20 text-barber-gold text-xs shadow-[0_0_10px_rgba(200,157,73,0.3)]"
                      : "border-barber-gold/40 bg-black/40 text-barber-paper hover:bg-barber-gold/15 text-xs"
                  }
                  onClick={() => setCommsOpen((o) => !o)}
                  title="Comunicazioni automatiche e invii massivi"
                >
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Dispacci
                </Button>
              ) : null}

              {!isTorneo ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={
                    primerOpen
                      ? "border-barber-gold bg-barber-gold/20 text-barber-gold text-xs shadow-[0_0_10px_rgba(200,157,73,0.3)]"
                      : "border-barber-gold/40 bg-black/40 text-barber-paper hover:bg-barber-gold/15 text-xs"
                  }
                  onClick={() => setPrimerOpen((o) => !o)}
                  title="Guida del Giocatore (Bibbia)"
                >
                  <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                  Guida Giocatore
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Modulo Ricerca Semantica Manuali */}
      <div>
        <ManualSemanticSearch />
      </div>

      {isLongCampaign ? (
        <div>
          <CampaignMemoryQueryPanel campaignId={campaignId} />
        </div>
      ) : null}

      {/* Pannello Calendario Espanso */}
      {calendarOpen && isLongCampaign ? (
        <div className="card-guild-stone relative rounded-xl border border-barber-gold/35 p-5 shadow-xl">
          <span className="corner-ornament-tl" />
          <span className="corner-ornament-tr" />
          <span className="corner-ornament-bl" />
          <span className="corner-ornament-br" />
          <div className="border-b border-barber-gold/20 pb-2 mb-4">
            <h3 className="font-cinzel text-base font-bold text-barber-gold">Configurazione Calendario della Campagna</h3>
          </div>
          <LongCampaignCalendarSettings campaignId={campaignId} />
        </div>
      ) : null}

      {/* Pannello AI Espanso */}
      {!isTorneo && aiOpen ? (
        <div className="card-guild-stone relative rounded-xl border border-barber-gold/35 p-5 shadow-xl space-y-4">
          <span className="corner-ornament-tl" />
          <span className="corner-ornament-tr" />
          <span className="corner-ornament-bl" />
          <span className="corner-ornament-br" />
          <div className="border-b border-barber-gold/20 pb-2">
            <h3 className="font-cinzel text-base font-bold text-barber-gold">Architetto AI di Campagna</h3>
          </div>
          <CampaignAiArchitectPanel
            campaignId={campaignId}
            initialContext={aiContextParsed}
            initialExcludedManualBookKeys={excludedManualBookKeys}
          />

          <div className="rounded-xl border border-barber-gold/25 bg-black/40 p-4">
            <h3 className="mb-1 text-sm font-semibold text-barber-gold">Template Stile Immagini AI</h3>
            <p className="mb-3 text-xs text-barber-paper/70">
              Configura il prompt visivo globale della campagna: verrà usato come stile base per le immagini
              generate dall&apos;assistente AI.
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-barber-gold/40 text-barber-gold hover:bg-barber-gold/15"
            >
              <Link href={`/campaigns/${campaignId}/settings/ai-style`}>
                <Palette className="mr-2 h-4 w-4" />
                Apri Impostazioni Stile
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {/* Pannello Dispacci & Email Espanso */}
      {commsOpen && isLongCampaign ? (
        <div className="card-guild-stone relative rounded-xl border border-barber-gold/35 p-5 shadow-xl">
          <span className="corner-ornament-tl" />
          <span className="corner-ornament-tr" />
          <span className="corner-ornament-bl" />
          <span className="corner-ornament-br" />
          <div className="border-b border-barber-gold/20 pb-2 mb-4">
            <h3 className="font-cinzel text-base font-bold text-barber-gold">Dispacci & Comunicazioni di Gilda</h3>
          </div>
          <CampaignEmailPanel
            campaignId={campaignId}
            initialJoinEnabled={joinEmailSettings?.join_enabled ?? true}
            initialJoinSubject={joinEmailSettings?.join_subject ?? "Benvenuto nella campagna!"}
            initialJoinBodyHtml={
              joinEmailSettings?.join_body_html ??
              "<h2>Benvenuto, avventuriero!</h2><p>La tua iscrizione alla campagna è stata completata con successo.</p>"
            }
            initialBulkTemplates={bulkEmailTemplates}
          />
        </div>
      ) : null}

      {/* Pannello Guida Giocatore / Bibbia Espanso */}
      {!isTorneo && primerOpen ? (
        <div className="card-guild-stone relative rounded-xl border border-barber-gold/35 p-5 shadow-xl">
          <span className="corner-ornament-tl" />
          <span className="corner-ornament-tr" />
          <span className="corner-ornament-bl" />
          <span className="corner-ornament-br" />
          <div className="border-b border-barber-gold/20 pb-2 mb-4">
            <h3 className="font-cinzel text-base font-bold text-barber-gold">Guida del Giocatore (Bibbia di Campagna)</h3>
          </div>
          <CampaignPrimerEditor
            campaignId={campaignId}
            initialPlayerPrimer={initialPlayerPrimer}
            initialTypography={initialTypography ?? undefined}
          />
        </div>
      ) : null}

      {/* Sezione Note & File GM */}
      <div className="space-y-6 pt-2">
        <GmNotes campaignId={campaignId} />
        {!isTorneo ? <GmFiles campaignId={campaignId} /> : null}
      </div>
    </div>
  );
}
