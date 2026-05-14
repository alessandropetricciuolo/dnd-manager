"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Calendar, Flag, Headphones, Images, ListOrdered, MessageCircle, ScrollText, Users } from "lucide-react";
import { GmNotesGrid } from "./gm-notes-grid";
import { InitiativeTracker } from "./initiative-tracker";
import { PlayerSessionTracker, computeSessionXpAwards } from "./player-session-tracker";
import { SecretWhispersSheet } from "./secret-whispers-sheet";
import { GmGallerySheet } from "./gm-gallery-sheet";
import { GmAudioForgeSheet } from "./gm-audio-forge-sheet";
import { GmRemoteIntegration } from "./gm-remote-integration";
import { LongEconomyPanel } from "./long-economy-panel";
import { LongTimePanel } from "./long-time-panel";
import { LongCalendarPanel } from "./long-calendar-panel";
import { GmMissionEncounterLoader } from "./gm-mission-encounter-loader";
import { GmScreenLongStateProvider, useGmScreenLongState } from "./gm-screen-long-state";
import { EndSessionWizard } from "@/components/sessions/end-session-wizard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGmNote } from "@/app/campaigns/gm-actions";
import { useGmAudioForge } from "@/lib/gm-audio-forge/use-gm-audio-forge";

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
  const [audioForgeOpen, setAudioForgeOpen] = useState(false);
  const audioForge = useGmAudioForge(campaignId);
  const [workspaceMode, setWorkspaceMode] = useState<"session" | "closure">("session");
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteLoading, setQuickNoteLoading] = useState(false);
  const [quickNoteTitle, setQuickNoteTitle] = useState("");
  const [quickNoteContent, setQuickNoteContent] = useState("");

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

  async function handleQuickClosureNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (quickNoteLoading) return;
    const title = quickNoteTitle.trim();
    if (!title) {
      toast.error("Il titolo della nota è obbligatorio.");
      return;
    }

    const formData = new FormData();
    formData.set("title", title);
    formData.set("content", quickNoteContent.trim());
    formData.set("session_id", selectedSessionId ?? "");

    setQuickNoteLoading(true);
    try {
      const result = await createGmNote(campaignId, formData);
      if (!result.success) {
        toast.error(result.error ?? "Errore creazione nota.");
        return;
      }
      toast.success("Nota creata.");
      setQuickNoteOpen(false);
      setQuickNoteTitle("");
      setQuickNoteContent("");
    } finally {
      setQuickNoteLoading(false);
    }
  }

  function openMissionProjection() {
    const features = "width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no";
    window.open(
      `/campaigns/${campaignId}/gm-only/missioni/proiezione`,
      "MissionProjectionWindow",
      features
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        className={cn(
          "flex shrink-0 flex-col items-center gap-1 border-r border-amber-600/20 bg-zinc-900/80 py-3 transition-all duration-300",
          sidebarOpen ? "w-11" : "w-12"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
          onClick={() => setSidebarOpen((open) => !open)}
          title={sidebarOpen ? "Chiudi Initiative Tracker" : "Apri Initiative Tracker"}
          aria-label={sidebarOpen ? "Chiudi Initiative Tracker" : "Apri Initiative Tracker"}
        >
          <ListOrdered className="h-5 w-5" />
        </Button>
        {!sidebarOpen && (
          <span className="mt-1 w-full origin-left rotate-90 whitespace-nowrap text-[10px] font-medium text-amber-400/80">
            Initiative
          </span>
        )}

        <div className="my-1 h-px w-6 bg-amber-600/20" aria-hidden />

        <Button
          variant="ghost"
          size="icon"
          className="text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
          onClick={() => setGalleryOpen(true)}
          title="Regia Immagini"
          aria-label="Apri Regia Immagini"
        >
          <Images className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
          onClick={() => setWhispersOpen(true)}
          title="Sussurri Segreti"
          aria-label="Apri Sussurri Segreti"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
          onClick={() => setAudioForgeOpen(true)}
          title="Audio"
          aria-label="Apri Audio"
        >
          <Headphones className="h-5 w-5" />
        </Button>
        <GmRemoteIntegration campaignId={campaignId} forge={audioForge} />
        <Button
          variant="ghost"
          size="icon"
          className="text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
          onClick={openMissionProjection}
          title="Proiezione Missioni"
          aria-label="Apri Proiezione Missioni"
        >
          <ScrollText className="h-5 w-5" />
        </Button>
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
              size="sm"
              className="h-8 border-amber-600/40 px-2.5 text-xs text-amber-100 hover:bg-amber-600/15"
              onClick={clearSelectedSessionState}
              disabled={!selectedSessionId}
              title="Azzera stato locale di questa sessione"
            >
              Azzera stato
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 bg-amber-600 px-3 text-xs text-zinc-950 hover:bg-amber-500"
              onClick={() => setDebriefOpen(true)}
              disabled={!selectedSessionId}
            >
              <Flag className="mr-1.5 h-3.5 w-3.5" />
              Chiudi sessione
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
          <div
            className={cn(
              "grid h-full min-h-0 gap-3",
              workspaceMode === "session"
                ? "xl:grid-cols-[minmax(560px,50vw)_minmax(0,1fr)]"
                : "grid-cols-1"
            )}
          >
            <aside
              className={cn(
                "min-h-0 overflow-hidden transition-all duration-300",
                workspaceMode === "closure"
                  ? "hidden xl:block xl:w-0 xl:border-transparent xl:bg-transparent"
                  : sidebarOpen
                    ? "block"
                    : "hidden xl:block xl:w-0 xl:border-transparent xl:bg-transparent"
              )}
            >
              {workspaceMode === "session" && sidebarOpen && (
                <div className="grid h-full min-h-0 gap-4 xl:grid-rows-[minmax(360px,48vh)_minmax(220px,1fr)]">
                  <div className="min-h-0 overflow-hidden rounded-2xl border border-amber-600/20 bg-zinc-950/60">
                    <InitiativeTracker
                      campaignId={campaignId}
                      campaignType="long"
                      availableCharacters={sessionCharacters}
                      value={initiativeState}
                      onChange={setInitiativeState}
                    />
                  </div>
                  <div className="min-h-0 overflow-hidden rounded-2xl border border-amber-600/20 bg-zinc-900/30 p-3 md:p-4">
                    <GmNotesGrid campaignId={campaignId} sessionId={selectedSessionId} sessionLabel={selectedSessionLabel} />
                  </div>
                </div>
              )}
            </aside>

            {workspaceMode === "closure" ? (
              <div className="order-2 flex items-center justify-end">
                <Dialog open={quickNoteOpen} onOpenChange={setQuickNoteOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 border-amber-600/35 px-3 text-xs text-amber-100 hover:bg-amber-600/15"
                    >
                      Nuova nota
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg border-amber-600/30 bg-zinc-900 text-zinc-100">
                    <DialogHeader>
                      <DialogTitle className="text-amber-300">Nuova nota rapida</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleQuickClosureNoteSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="closure-quick-note-title">Titolo</Label>
                        <Input
                          id="closure-quick-note-title"
                          value={quickNoteTitle}
                          onChange={(e) => setQuickNoteTitle(e.target.value)}
                          placeholder="Es. Debito con la gilda"
                          className="border-amber-600/30 bg-zinc-800 text-zinc-100"
                          disabled={quickNoteLoading}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="closure-quick-note-content">Contenuto</Label>
                        <Textarea
                          id="closure-quick-note-content"
                          value={quickNoteContent}
                          onChange={(e) => setQuickNoteContent(e.target.value)}
                          placeholder="Scrivi la nota..."
                          rows={7}
                          className="min-h-[140px] border-amber-600/30 bg-zinc-800 text-zinc-100"
                          disabled={quickNoteLoading}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-amber-600/40 text-zinc-300"
                          onClick={() => setQuickNoteOpen(false)}
                          disabled={quickNoteLoading}
                        >
                          Annulla
                        </Button>
                        <Button
                          type="submit"
                          className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
                          disabled={quickNoteLoading}
                        >
                          {quickNoteLoading ? "Creazione..." : "Crea nota"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            ) : null}

            <div
              className={cn(
                "min-h-0 overflow-auto rounded-2xl border border-amber-600/20 bg-zinc-900/30",
                workspaceMode === "session" ? "p-3 md:p-4" : "p-2.5 md:p-3"
              )}
            >
              {workspaceMode === "session" ? (
                <div className="flex min-h-full flex-col gap-3">
                  <LongTimePanel
                    elapsedHours={elapsedHours}
                    onChange={setElapsedHours}
                    compact
                  />
                  <GmMissionEncounterLoader campaignId={campaignId} />
                  <PlayerSessionTracker
                    campaignId={campaignId}
                    characters={sessionCharacters}
                    attendance={attendance}
                    onAttendanceChange={setAttendance}
                    initiativeEntries={initiativeState.entries}
                    value={xpState}
                    onChange={setXpState}
                    onCloseFight={() => setInitiativeState({ entries: [], currentTurnIndex: 0 })}
                  />
                </div>
              ) : (
                <div className="order-1 flex min-h-full flex-col gap-2.5 lg:order-2">
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
              )}
            </div>
          </div>
        </div>

        <SecretWhispersSheet
          open={whispersOpen}
          onOpenChange={setWhispersOpen}
          campaignId={campaignId}
          currentUserId={currentUserId}
        />
        <GmGallerySheet open={galleryOpen} onOpenChange={setGalleryOpen} campaignId={campaignId} campaignType="long" />
        <GmAudioForgeSheet open={audioForgeOpen} onOpenChange={setAudioForgeOpen} forge={audioForge} />
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
