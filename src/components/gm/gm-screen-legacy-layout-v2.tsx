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
      </div>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-amber-600/20 px-2 py-1">
          <Calendar className="h-3 w-3 text-amber-400/80" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">GM 2.0</span>
          <Select
            value={selectedSessionId ?? "none"}
            onValueChange={(value) => setSelectedSessionId(value === "none" ? null : value)}
          >
            <SelectTrigger className="h-6 max-w-[14rem] border-amber-600/30 bg-zinc-900 px-2 text-[10px] text-zinc-200">
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
                  {formatSessionLabel(session)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSessionId && (
            <Button
              type="button"
              size="sm"
              onClick={() => setDebriefOpen(true)}
              className="ml-auto h-6 bg-amber-600 px-2 text-[10px] text-zinc-950 hover:bg-amber-500"
            >
              <Flag className="mr-1 h-3 w-3" />
              Chiudi
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

        <div className="min-h-0 flex-1 overflow-hidden p-1">
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
        <GmGallerySheet open={galleryOpen} onOpenChange={setGalleryOpen} campaignId={campaignId} campaignType={campaignType} />
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
