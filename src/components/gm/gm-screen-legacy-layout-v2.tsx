"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Calendar, Flag, MessageCircle, Images, Headphones } from "lucide-react";
import { GmScreenMapRegia } from "./gm-screen-map-regia";
import { SecretWhispersSheet } from "./secret-whispers-sheet";
import { GmGallerySheet } from "./gm-gallery-sheet";
import { GmAudioForgeSheet } from "./gm-audio-forge-sheet";
import { GmRemoteIntegration } from "./gm-remote-integration";
import { GmSpotifyEmbedDock } from "./gm-spotify-embed-dock";
import { Button } from "@/components/ui/button";
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
import { useGmAudioForge } from "@/lib/gm-audio-forge/use-gm-audio-forge";
import { GmScreenBoard, getLegacyPreset } from "@/components/gm/screen-grid";

type GmScreenLegacyLayoutV2Props = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | "torneo" | null;
  currentUserId: string;
  initialSessionId?: string | null;
  autoOpenDebrief?: boolean;
};

function formatSessionLabel(session: CampaignSessionOption): string {
  const dateStr = formatSessionInRome(session.scheduled_at, "d MMM yyyy", { locale: it });
  return session.title?.trim() ? `${session.title} — ${dateStr}` : dateStr;
}

export function GmScreenLegacyLayoutV2({
  campaignId,
  campaignType,
  currentUserId,
  initialSessionId,
  autoOpenDebrief,
}: GmScreenLegacyLayoutV2Props) {
  const [sessions, setSessions] = useState<CampaignSessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId ?? null);
  const [debriefOpen, setDebriefOpen] = useState(Boolean(initialSessionId && autoOpenDebrief));
  const [whispersOpen, setWhispersOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [audioForgeOpen, setAudioForgeOpen] = useState(false);
  const [spotifyEmbedPlaylistId, setSpotifyEmbedPlaylistId] = useState<string | null>(null);
  const audioForge = useGmAudioForge(campaignId);

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

  const sheetOpeners = useMemo(
    () => ({
      openMapsSheet: () => window.dispatchEvent(new CustomEvent("gm-screen-open-maps")),
      openFowSheet: () => window.dispatchEvent(new CustomEvent("gm-screen-open-fow")),
      openGallerySheet: () => setGalleryOpen(true),
      openWhispersSheet: () => setWhispersOpen(true),
      openAudioSheet: () => setAudioForgeOpen(true),
    }),
    []
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-amber-600/20 bg-zinc-900/80 py-3">
        <GmScreenMapRegia campaignId={campaignId} />

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
      </div>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-amber-600/20 px-4 py-3 md:px-6">
          <Calendar className="h-4 w-4 text-amber-400/80" />
          <span className="text-sm font-medium text-amber-300">GM Screen</span>
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
              className="ml-auto bg-amber-600 text-zinc-950 hover:bg-amber-500"
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

        <div className="min-h-0 flex-1 overflow-hidden p-3 md:p-4">
          <GmScreenBoard
            campaignId={campaignId}
            currentUserId={currentUserId}
            campaignType={campaignType}
            selectedSessionId={selectedSessionId}
            mode="session"
            onModeChange={() => {}}
            lockMode
            presetFactory={getLegacyPreset}
            sheetOpeners={sheetOpeners}
          />
        </div>

        <SecretWhispersSheet
          open={whispersOpen}
          onOpenChange={setWhispersOpen}
          campaignId={campaignId}
          currentUserId={currentUserId}
        />
        <GmGallerySheet
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
          campaignId={campaignId}
          campaignType={campaignType}
        />
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
