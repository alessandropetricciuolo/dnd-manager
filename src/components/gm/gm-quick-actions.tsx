"use client";

import Link from "next/link";
import { BookOpen, Map, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GmScreenLauncher } from "@/components/gm/gm-screen-launcher";

type GmQuickActionsProps = {
  campaignId: string;
};

export function GmQuickActions({ campaignId }: GmQuickActionsProps) {
  function openNewNote() {
    window.dispatchEvent(new CustomEvent("gm-notes:create"));
  }

  function openUpload() {
    window.dispatchEvent(new CustomEvent("gm-files:upload"));
  }

  return (
    <div className="mb-6 rounded-lg border border-violet-600/30 bg-violet-950/30 p-4">
      <div className="mb-3 text-sm text-violet-200/80">Azioni rapide GM</div>
      <div className="flex flex-wrap gap-2">
        <GmScreenLauncher
          campaignId={campaignId}
          className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
        />
        <Button asChild variant="outline" size="sm" className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20">
          <Link href={`/campaigns/${campaignId}/gm-only/concept-map`}>
            <Map className="mr-2 h-4 w-4" />
            Apri Mappa Concettuale
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20">
          <Link href={`/compendium?campaignId=${campaignId}`}>
            <BookOpen className="mr-2 h-4 w-4" />
            Apri Compendio
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
          onClick={openNewNote}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuova nota
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
          onClick={openUpload}
        >
          <Upload className="mr-2 h-4 w-4" />
          Carica
        </Button>
      </div>
    </div>
  );
}
