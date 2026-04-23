"use client";

import { useState, useEffect, useCallback } from "react";
import { ListOrdered, Calendar, Flag, MessageCircle, Images } from "lucide-react";
import { InitiativeTracker } from "./initiative-tracker";
import { GmNotesGrid } from "./gm-notes-grid";
import { PlayerSessionTracker } from "./player-session-tracker";
import { SecretWhispersSheet } from "./secret-whispers-sheet";
import { GmGallerySheet } from "./gm-gallery-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCampaignSessionsForGm, type CampaignSessionOption } from "@/app/campaigns/gm-actions";
import { EndSessionWizard } from "@/components/sessions/end-session-wizard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSessionInRome } from "@/lib/session-datetime";
import { it } from "date-fns/locale";

type GmScreenLegacyLayoutProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  currentUserId: string;
  initialSessionId?: string | null;
  autoOpenDebrief?: boolean;
};

function formatSessionLabel(session: CampaignSessionOption): string {
  const dateStr = formatSessionInRome(session.scheduled_at, "d MMM yyyy", { locale: it });
  return session.title?.trim() ? `${session.title} — ${dateStr}` : dateStr;
}

export function GmScreenLegacyLayout({
  campaignId,
  campaignType,
  currentUserId,
  initialSessionId,
  autoOpenDebrief,
}: GmScreenLegacyLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<CampaignSessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId ?? null);
  const [debriefOpen, setDebriefOpen] = useState(Boolean(initialSessionId && autoOpenDebrief));
  const [whispersOpen, setWhispersOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const loadSessions = useCallback(async () => {
    const result = await getCampaignSessionsForGm(campaignId);
    if (result.success && result.data) {
      setSessions(result.data);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const selectedSession = sessions.find((session) => session.id === selectedSessionId);
  const sessionLabel = selectedSession ? formatSessionLabel(selectedSession) : undefined;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      <div
        className={cn(
          "flex shrink-0 flex-col items-center border-amber-600/20 bg-zinc-900/80 transition-all duration-300",
          sidebarOpen ? "w-10 border-r" : "w-12 border-r"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="mt-3 text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
          onClick={() => setSidebarOpen((open) => !open)}
          title={sidebarOpen ? "Chiudi Initiative Tracker" : "Apri Initiative Tracker"}
        >
          <ListOrdered className="h-5 w-5" />
        </Button>
        {!sidebarOpen && (
          <span className="mt-2 w-full origin-left rotate-90 whitespace-nowrap text-[10px] font-medium text-amber-400/80">
            Tracker
          </span>
        )}
      </div>

      <aside
        className={cn(
          "flex h-full shrink-0 flex-col overflow-hidden border-r border-amber-600/20 bg-zinc-950 transition-[width] duration-300 ease-in-out",
          sidebarOpen ? "w-1/2" : "w-0"
        )}
      >
        {sidebarOpen && (
          <div className="flex h-full min-w-0 flex-1 flex-col p-3">
            <div className="min-h-0 flex-1 overflow-hidden">
              <InitiativeTracker campaignId={campaignId} campaignType={campaignType} />
            </div>
          </div>
        )}
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-amber-600/20 px-4 py-3 md:px-6">
          <Calendar className="h-4 w-4 text-amber-400/80" />
          <Select
            value={selectedSessionId ?? "none"}
            onValueChange={(value) => setSelectedSessionId(value === "none" ? null : value)}
          >
            <SelectTrigger className="max-w-xs border-amber-600/30 bg-zinc-900 text-zinc-200">
              <SelectValue placeholder="Sessione corrente" />
            </SelectTrigger>
            <SelectContent className="border-amber-600/20 bg-zinc-900">
              <SelectItem value="none" className="text-zinc-300 focus:bg-amber-600/20 focus:text-zinc-100">
                Nessuna sessione (solo note globali)
              </SelectItem>
              {sessions.map((session) => (
                <SelectItem
                  key={session.id}
                  value={session.id}
                  className="text-zinc-300 focus:bg-amber-600/20 focus:text-zinc-100"
                >
                  {formatSessionLabel(session)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSessionId && (
            <Button
              type="button"
              onClick={() => setDebriefOpen(true)}
              className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
            >
              <Flag className="mr-2 h-4 w-4" />
              Chiudi Sessione
            </Button>
          )}
        </div>

        {selectedSessionId && (
          <EndSessionWizard
            open={debriefOpen}
            onOpenChange={setDebriefOpen}
            sessionId={selectedSessionId}
            campaignId={campaignId}
            campaignType={campaignType}
            sessionLabel={sessionLabel}
            onSuccess={loadSessions}
          />
        )}

        <div className="min-h-0 flex-1 overflow-hidden p-4 md:p-6">
          <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row">
            <div className="min-h-0 flex-1 overflow-auto">
              <GmNotesGrid campaignId={campaignId} sessionId={selectedSessionId} sessionLabel={sessionLabel} />
            </div>
            <div className="w-full shrink-0 lg:w-[420px] lg:max-w-[40%]">
              <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
                <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-amber-600/20 bg-zinc-900/40 p-3">
                  <PlayerSessionTracker campaignId={campaignId} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto absolute bottom-6 left-6 z-20 flex flex-col items-start gap-3 max-md:bottom-[max(1.5rem,env(safe-area-inset-bottom))] max-md:left-[max(1.5rem,env(safe-area-inset-left))]">
          <div className="flex gap-3">
            <Button
              type="button"
              size="icon"
              onClick={() => setGalleryOpen(true)}
              className="h-11 w-11 rounded-full bg-amber-700 text-zinc-950 shadow-lg shadow-amber-900/40 hover:bg-amber-500"
              title="Regia Immagini"
              aria-label="Apri galleria immagini"
            >
              <Images className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={() => setWhispersOpen(true)}
              className="h-11 w-11 rounded-full bg-amber-600 text-zinc-950 shadow-lg shadow-amber-900/30 hover:bg-amber-500"
              title="Sussurri Segreti"
              aria-label="Apri Sussurri Segreti"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <SecretWhispersSheet
          open={whispersOpen}
          onOpenChange={setWhispersOpen}
          campaignId={campaignId}
          currentUserId={currentUserId}
        />
        <GmGallerySheet open={galleryOpen} onOpenChange={setGalleryOpen} campaignId={campaignId} />
      </main>
    </div>
  );
}
