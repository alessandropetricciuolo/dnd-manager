"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Calendar, Flag, Headphones, Images, MessageCircle, ScrollText, Users } from "lucide-react";
import { GmScreenMapRegia } from "./gm-screen-map-regia";
import { SecretWhispersSheet } from "./secret-whispers-sheet";
import { GmGallerySheet } from "./gm-gallery-sheet";
import { GmAudioForgeSheet } from "./gm-audio-forge-sheet";
import { GmRemoteIntegration } from "./gm-remote-integration";
import { GmSpotifyEmbedDock } from "./gm-spotify-embed-dock";
import { GmScreenLongStateProvider, useGmScreenLongState } from "./gm-screen-long-state";
import { EndSessionWizard } from "@/components/sessions/end-session-wizard";
import { GmScreenBoard, type GmWorkspaceMode } from "@/components/gm/screen-grid";
import { computeSessionXpAwards } from "./player-session-tracker";
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
    initiativeState,
    xpState,
    elapsedHours,
    calendarBaseDate,
    calendarConfig,
    refreshSessions,
    refreshCharacters,
    clearSelectedSessionState,
    selectedSessionLabel,
    hasActiveSession,
    hasUnsavedLocalState,
  } = useGmScreenLongState();

  const [debriefOpen, setDebriefOpen] = useState(Boolean(selectedSessionId && autoOpenDebrief));
  const [whispersOpen, setWhispersOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [audioForgeOpen, setAudioForgeOpen] = useState(false);
  const [spotifyEmbedPlaylistId, setSpotifyEmbedPlaylistId] = useState<string | null>(null);
  const audioForge = useGmAudioForge(campaignId);
  const [workspaceMode, setWorkspaceMode] = useState<GmWorkspaceMode>("session");
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

  const sheetOpeners = useMemo(
    () => ({
      openMapsSheet: () => {
        /* MapRegia owns its sheet; rail button remains the primary opener.
           Panels call the same via a custom event so we don't fork MapRegia. */
        window.dispatchEvent(new CustomEvent("gm-screen-open-maps"));
      },
      openFowSheet: () => {
        window.dispatchEvent(new CustomEvent("gm-screen-open-fow"));
      },
      openGallerySheet: () => setGalleryOpen(true),
      openWhispersSheet: () => setWhispersOpen(true),
      openAudioSheet: () => setAudioForgeOpen(true),
    }),
    []
  );

  const closureToolbar = workspaceMode === "closure" ? (
    <Dialog open={quickNoteOpen} onOpenChange={setQuickNoteOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 border-amber-600/35 px-2 text-[10px] text-amber-100 hover:bg-amber-600/15"
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
  ) : null;

  return (
    <div className="gm-screen-v2-dense flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="flex w-8 shrink-0 flex-col items-center gap-0.5 border-r border-amber-600/20 bg-zinc-900/90 py-1.5">
        <GmScreenMapRegia campaignId={campaignId} />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
          onClick={() => setGalleryOpen(true)}
          title="Regia Immagini"
          aria-label="Apri Regia Immagini"
        >
          <Images className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
          onClick={() => setWhispersOpen(true)}
          title="Sussurri Segreti"
          aria-label="Apri Sussurri Segreti"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
          onClick={() => setAudioForgeOpen(true)}
          title="Audio"
          aria-label="Apri Audio"
        >
          <Headphones className="h-3.5 w-3.5" />
        </Button>
        <GmRemoteIntegration campaignId={campaignId} forge={audioForge} />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
          onClick={openMissionProjection}
          title="Proiezione Missioni"
          aria-label="Apri Proiezione Missioni"
        >
          <ScrollText className="h-3.5 w-3.5" />
        </Button>
      </div>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-amber-600/20 px-2 py-1">
          <div className="flex items-center gap-1 text-amber-300">
            <Calendar className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">GM 2.0</span>
          </div>

          <Select
            value={selectedSessionId ?? "none"}
            onValueChange={(value) => setSelectedSessionId(value === "none" ? null : value)}
            disabled={loadingSessions}
          >
            <SelectTrigger className="h-6 max-w-[14rem] border-amber-600/30 bg-zinc-900 px-2 text-[10px] text-zinc-100">
              <SelectValue placeholder="Sessione" />
            </SelectTrigger>
            <SelectContent className="border-amber-600/20 bg-zinc-900">
              <SelectItem value="none" className="text-[11px] text-zinc-300 focus:bg-amber-600/20 focus:text-zinc-100">
                Nessuna sessione
              </SelectItem>
              {sessions.map((session) => (
                <SelectItem
                  key={session.id}
                  value={session.id}
                  className="text-[11px] text-zinc-300 focus:bg-amber-600/20 focus:text-zinc-100"
                >
                  {session.title?.trim() || new Date(session.scheduled_at).toLocaleDateString("it-IT")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="outline" className="h-5 border-amber-500/30 bg-transparent px-1.5 text-[9px] text-amber-100">
            <Users className="mr-0.5 h-2.5 w-2.5" />
            {sessionCharacters.length} PG
          </Badge>

          <Badge variant="outline" className="h-5 border-zinc-700 bg-transparent px-1.5 text-[9px] text-zinc-300">
            {signups.length} iscritti
          </Badge>

          <div className="inline-flex items-center rounded border border-amber-600/30 bg-zinc-900 p-px">
            <Button
              type="button"
              size="sm"
              variant={workspaceMode === "session" ? "secondary" : "ghost"}
              className={cn(
                "h-5 px-1.5 text-[9px]",
                workspaceMode === "session"
                  ? "bg-amber-600/20 text-amber-100 hover:bg-amber-600/25"
                  : "text-zinc-300 hover:text-zinc-100"
              )}
              onClick={() => setWorkspaceMode("session")}
            >
              Sessione
            </Button>
            <Button
              type="button"
              size="sm"
              variant={workspaceMode === "closure" ? "secondary" : "ghost"}
              className={cn(
                "h-5 px-1.5 text-[9px]",
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
            <Badge variant="outline" className="h-5 border-cyan-500/30 bg-transparent px-1.5 text-[9px] text-cyan-100">
              Locale
            </Badge>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 border-amber-600/40 px-1.5 text-[10px] text-amber-100 hover:bg-amber-600/15"
              onClick={clearSelectedSessionState}
              disabled={!selectedSessionId}
              title="Azzera stato locale di questa sessione"
            >
              Azzera
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-6 bg-amber-600 px-2 text-[10px] text-zinc-950 hover:bg-amber-500"
              onClick={() => setDebriefOpen(true)}
              disabled={!selectedSessionId}
            >
              <Flag className="mr-1 h-3 w-3" />
              Chiudi
            </Button>
          </div>
        </div>

        {sessionCharactersMissingSheet.length > 0 && (
          <div className="border-b border-amber-600/15 bg-amber-600/10 px-2 py-0.5 text-[10px] text-amber-100">
            Iscritti senza PG:{" "}
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

        <div className="min-h-0 flex-1 overflow-hidden p-1">
          <GmScreenBoard
            campaignId={campaignId}
            currentUserId={currentUserId}
            campaignType="long"
            selectedSessionId={selectedSessionId}
            mode={workspaceMode}
            onModeChange={setWorkspaceMode}
            sheetOpeners={sheetOpeners}
            toolbarExtra={closureToolbar}
          />
        </div>

        <SecretWhispersSheet
          open={whispersOpen}
          onOpenChange={setWhispersOpen}
          campaignId={campaignId}
          currentUserId={currentUserId}
        />
        <GmGallerySheet open={galleryOpen} onOpenChange={setGalleryOpen} campaignId={campaignId} campaignType="long" />
        <GmAudioForgeSheet
          open={audioForgeOpen}
          onOpenChange={setAudioForgeOpen}
          forge={audioForge}
          spotifyEmbedPlaylistId={spotifyEmbedPlaylistId}
          onSpotifyEmbedPlaylistIdChange={setSpotifyEmbedPlaylistId}
        />
        <GmSpotifyEmbedDock playlistId={spotifyEmbedPlaylistId} audioSheetOpen={audioForgeOpen} />
      </main>
    </div>
  );
}

export function GmScreenLongLayoutV2({
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
