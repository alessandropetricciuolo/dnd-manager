"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Layers, Mail, Map, Palette, Sparkles } from "lucide-react";

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
}: GmHomepageProps) {
  const isLongCampaign = isLongCampaignType(campaignType);
  const isTorneo = isTorneoCampaignType(campaignType);

  const [aiOpen, setAiOpen] = useState(false);
  const [commsOpen, setCommsOpen] = useState(false);
  const [primerOpen, setPrimerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="rounded-xl border-2 border-violet-800/60 bg-slate-950/80 p-6 shadow-inner">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <GmScreenLauncher
            campaignId={campaignId}
            className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
          />
          {!isTorneo ? (
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
              >
                <Link href={`/campaigns/${campaignId}/gm-only/vista-dall-alto`}>
                  <Layers className="mr-2 h-4 w-4" />
                  Vista dall&apos;alto (FoW)
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
              >
                <Link href={`/campaigns/${campaignId}/gm-only/concept-map`}>
                  <Map className="mr-2 h-4 w-4" />
                  Apri Mappa Concettuale
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
              >
                <Link href={`/compendium?campaignId=${campaignId}`}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Apri Compendio
                </Link>
              </Button>
            </>
          ) : null}
        </div>

        {!isTorneo ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
              onClick={() => setAiOpen((o) => !o)}
              title="Funzioni AI della campagna"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI
            </Button>

            {isLongCampaign ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
                onClick={() => setCalendarOpen((o) => !o)}
                title="Calendario campagna long"
              >
                <Map className="mr-2 h-4 w-4" />
                Calendario
              </Button>
            ) : null}

            {isLongCampaign ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
                onClick={() => setCommsOpen((o) => !o)}
                title="Comunicazioni automatiche e invii massivi"
              >
                <Mail className="mr-2 h-4 w-4" />
                Comunicazioni
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
              onClick={() => setPrimerOpen((o) => !o)}
              title="Guida del Giocatore (Bibbia)"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Guida
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mb-8">
        <ManualSemanticSearch />
      </div>

      {isLongCampaign ? (
        <div className="mb-8">
          <CampaignMemoryQueryPanel campaignId={campaignId} />
        </div>
      ) : null}

      {calendarOpen && isLongCampaign ? (
        <Card className="mb-8 border-violet-600/30 bg-violet-950/20 p-4">
          <LongCampaignCalendarSettings campaignId={campaignId} />
        </Card>
      ) : null}

      {!isTorneo && aiOpen ? (
        <Card className="mb-8 space-y-4 border-violet-600/30 bg-violet-950/20 p-4">
          <CampaignAiArchitectPanel
            campaignId={campaignId}
            initialContext={aiContextParsed}
            initialExcludedManualBookKeys={excludedManualBookKeys}
          />

          <div className="rounded-lg border border-violet-600/30 bg-violet-950/30 p-4">
            <h3 className="mb-2 text-sm font-medium text-violet-200">Template Stile Immagini AI</h3>
            <p className="mb-3 text-xs text-violet-200/70">
              Configura il prompt visivo globale della campagna: verrà usato come stile base per le immagini
              generate dall&apos;assistente AI.
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
            >
              <Link href={`/campaigns/${campaignId}/settings/ai-style`}>
                <Palette className="mr-2 h-4 w-4" />
                Apri Impostazioni Stile
              </Link>
            </Button>
          </div>
        </Card>
      ) : null}

      {commsOpen && isLongCampaign ? (
        <Card className="mb-8 border-violet-600/30 bg-violet-950/20 p-4">
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
        </Card>
      ) : null}

      {!isTorneo && primerOpen ? (
        <Card className="mb-8 border-violet-600/30 bg-violet-950/20 p-4">
          <CampaignPrimerEditor
            campaignId={campaignId}
            initialPlayerPrimer={initialPlayerPrimer}
            initialTypography={initialTypography ?? undefined}
          />
        </Card>
      ) : null}

      <div className="space-y-8">
        <GmNotes campaignId={campaignId} />
        {!isTorneo ? <GmFiles campaignId={campaignId} /> : null}
      </div>
    </div>
  );
}
