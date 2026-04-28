"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Flag, Images, ListOrdered, MessageCircle, Users } from "lucide-react";
import { GmNotesGrid } from "./gm-notes-grid";
import { InitiativeTracker } from "./initiative-tracker";
import { PlayerSessionTracker, computeSessionXpAwards } from "./player-session-tracker";
import { SecretWhispersSheet } from "./secret-whispers-sheet";
import { GmGallerySheet } from "./gm-gallery-sheet";
import { LongEconomyPanel } from "./long-economy-panel";
import { LongTimePanel } from "./long-time-panel";
import { LongCalendarPanel } from "./long-calendar-panel";
import { GmMissionEncounterLoader } from "./gm-mission-encounter-loader";
import { GmScreenLongStateProvider, useGmScreenLongState } from "./gm-screen-long-state";
import { EndSessionWizard } from "@/components/sessions/end-session-wizard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GmScreenLongLayoutProps = {
  campaignId: string;
  currentUserId: string;
  initialSessionId?: string | null;
  autoOpenDebrief?: boolean;
};

function LongWorkspace({
  campaignId,
  currentUserId,
  autoOpenDebrief,
}: {
  campaignId: string;
  currentUserId: string;
  autoOpenDebrief?: boolean;
}) {
  const {
    sessions,
    loadingSessions,
    selectedSessionId,
    setSelectedSessionId,
    signups,
    sessionCharacters,
    sessionCharactersMissingSheet,
    attendance,
    setAttendance,
    initiativeState,
    setInitiativeState,
    xpState,
    setXpState,
    elapsedHours,
    setElapsedHours,
    calendarBaseDate,
    setCalendarBaseDate,
    calendarConfig,
    setCalendarConfig,
    saveCalendarSettings,
    economyDraft,
    setEconomyDraft,
    refreshSessions,
    refreshCharacters,
    updateCharacterCoinsLocally,
    clearSelectedSessionState,
    selectedSessionLabel,
    hasActiveSession,
    hasUnsavedLocalState,
  } = useGmScreenLongState();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [debriefOpen, setDebriefOpen] = useState(Boolean(selectedSessionId && autoOpenDebrief));
  const [whispersOpen, setWhispersOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"session" | "closure">("session");

  useEffect(() => {
    if (autoOpenDebrief && selectedSessionId) {
      setDebriefOpen(true);
    }
  }, [autoOpenDebrief, selectedSessionId]);

  useEffect(() => {
    if (!hasActiveSession) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasActiveSession, hasUnsavedLocalState]);

  const sessionPlayerIds = useMemo(() => signups.map((signup) => signup.player_id), [signups]);
  const xpAwards = useMemo(
    () =>
      computeSessionXpAwards({
        characters: sessionCharacters,
        attendance,
        xpState,
        initiativeEntries: initiativeState.entries,
      }),
    [attendance, initiativeState.entries, sessionCharacters, xpState]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        className={cn(
          "flex shrink-0 flex-col items-center border-r border-amber-600/20 bg-zinc-900/80 transition-all duration-300",
          sidebarOpen ? "w-11" : "w-12"
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
            Initiative
          </span>
        )}
      </div>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-amber-600/20 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 text-amber-300">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">GM Screen Long</span>
          </div>

          <Select
            value={selectedSessionId ?? "none"}
            onValueChange={(value) => setSelectedSessionId(value === "none" ? null : value)}
            disabled={loadingSessions}
          >
            <SelectTrigger className="max-w-sm border-amber-600/30 bg-zinc-900 text-zinc-100">
              <SelectValue placeholder="Sessione corrente" />
            </SelectTrigger>
            <SelectContent className="border-amber-600/20 bg-zinc-900">
              <SelectItem value="none" className="text-zinc-300 focus:bg-amber-600/20 focus:text-zinc-100">
                Nessuna sessione selezionata
              </SelectItem>
              {sessions.map((session) => (
                <SelectItem
                  key={session.id}
                  value={session.id}
                  className="text-zinc-300 focus:bg-amber-600/20 focus:text-zinc-100"
                >
                  {session.title?.trim() || new Date(session.scheduled_at).toLocaleDateString("it-IT")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="outline" className="border-amber-500/30 bg-transparent text-amber-100">
            <Users className="mr-1 h-3 w-3" />
            {sessionCharacters.length} PG in sessione
          </Badge>

          <Badge variant="outline" className="border-zinc-700 bg-transparent text-zinc-300">
            {signups.length} iscritti
          </Badge>

          <div className="inline-flex items-center rounded-md border border-amber-600/30 bg-zinc-900 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={workspaceMode === "session" ? "secondary" : "ghost"}
              className={cn(
                "h-8 px-2.5 text-xs",
                workspaceMode === "session"
                  ? "bg-amber-600/20 text-amber-100 hover:bg-amber-600/25"
                  : "text-zinc-300 hover:text-zinc-100"
              )}
              onClick={() => setWorkspaceMode("session")}
            >
              Durante sessione
            </Button>
            <Button
              type="button"
              size="sm"
              variant={workspaceMode === "closure" ? "secondary" : "ghost"}
              className={cn(
                "h-8 px-2.5 text-xs",
                workspaceMode === "closure"
                  ? "bg-amber-600/20 text-amber-100 hover:bg-amber-600/25"
                  : "text-zinc-300 hover:text-zinc-100"
              )}
              onClick={() => setWorkspaceMode("closure")}
            >
              Chiusura
            </Button>
          </div>

          {hasUnsavedLocalState ? (
            <Badge variant="outline" className="border-cyan-500/30 bg-transparent text-cyan-100">
              Stato locale ripristinabile
            </Badge>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-amber-600/40 text-amber-100 hover:bg-amber-600/15"
              onClick={clearSelectedSessionState}
              disabled={!selectedSessionId}
            >
              Azzera stato locale
            </Button>
            <Button
              type="button"
              className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
              onClick={() => setDebriefOpen(true)}
              disabled={!selectedSessionId}
            >
              <Flag className="mr-2 h-4 w-4" />
              Chiudi Sessione
            </Button>
          </div>
        </div>

        {sessionCharactersMissingSheet.length > 0 && (
          <div className="border-b border-amber-600/15 bg-amber-600/10 px-4 py-2 text-xs text-amber-100 md:px-6">
            Alcuni iscritti non hanno un personaggio assegnato e non compariranno nei tracker PG:{" "}
            {sessionCharactersMissingSheet.map((signup) => signup.player_name).join(", ")}.
          </div>
        )}

        {selectedSessionId && (
          <EndSessionWizard
            open={debriefOpen}
            onOpenChange={setDebriefOpen}
            sessionId={selectedSessionId}
            campaignId={campaignId}
            campaignType="long"
            sessionLabel={selectedSessionLabel}
            initialAttendance={attendance}
            initialXpGained={xpAwards.basePerPlayer}
            initialElapsedHours={elapsedHours}
            initialCalendarBaseDate={calendarBaseDate}
            initialCalendarConfig={calendarConfig}
            perPlayerXpAwards={xpAwards.awards}
            economyManagedInGmScreen
            onSuccess={async () => {
              clearSelectedSessionState();
              await refreshSessions();
              await refreshCharacters();
            }}
          />
        )}

        <div className="min-h-0 flex-1 overflow-hidden p-4 md:p-6">
          <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(300px,25vw)_minmax(0,1fr)_minmax(420px,34vw)]">
            <aside
              className={cn(
                "min-h-0 overflow-hidden rounded-2xl border border-amber-600/20 bg-zinc-950/60 transition-all duration-300",
                sidebarOpen ? "block" : "hidden xl:block xl:w-0 xl:border-transparent xl:bg-transparent"
              )}
            >
              {sidebarOpen && (
                <InitiativeTracker
                  campaignId={campaignId}
                  campaignType="long"
                  availableCharacters={sessionCharacters}
                  value={initiativeState}
                  onChange={setInitiativeState}
                />
              )}
            </aside>

            <div className="min-h-0 overflow-hidden rounded-2xl border border-amber-600/20 bg-zinc-900/30 p-3 md:p-4">
              <GmNotesGrid campaignId={campaignId} sessionId={selectedSessionId} sessionLabel={selectedSessionLabel} />
            </div>

            <div className="min-h-0 overflow-auto rounded-2xl border border-amber-600/20 bg-zinc-900/30 p-3 md:p-4">
              <div className="flex min-h-full flex-col gap-4">
                <GmMissionEncounterLoader campaignId={campaignId} />
                <PlayerSessionTracker
                  campaignId={campaignId}
                  characters={sessionCharacters}
                  attendance={attendance}
                  onAttendanceChange={setAttendance}
                  initiativeEntries={initiativeState.entries}
                  value={xpState}
                  onChange={setXpState}
                />
                <LongEconomyPanel
                  campaignId={campaignId}
                  playerIds={sessionPlayerIds}
                  attendance={attendance}
                  economyDraft={economyDraft}
                  onDraftChange={setEconomyDraft}
                  onCoinsCommitted={updateCharacterCoinsLocally}
                  onRefreshCharacters={refreshCharacters}
                />
                <LongTimePanel elapsedHours={elapsedHours} onChange={setElapsedHours} />
                <LongCalendarPanel
                  baseDate={calendarBaseDate}
                  config={calendarConfig}
                  elapsedHours={elapsedHours}
                  onBaseDateChange={setCalendarBaseDate}
                  onConfigChange={setCalendarConfig}
                  onSave={saveCalendarSettings}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto absolute bottom-6 left-6 z-20 flex flex-col items-start gap-3">
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

export function GmScreenLongLayout({
  campaignId,
  currentUserId,
  initialSessionId,
  autoOpenDebrief,
}: GmScreenLongLayoutProps) {
  return (
    <GmScreenLongStateProvider campaignId={campaignId} initialSessionId={initialSessionId}>
      <LongWorkspace campaignId={campaignId} currentUserId={currentUserId} autoOpenDebrief={autoOpenDebrief} />
    </GmScreenLongStateProvider>
  );
}
