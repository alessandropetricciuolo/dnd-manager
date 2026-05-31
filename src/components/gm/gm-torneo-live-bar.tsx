"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, ExternalLink, Loader2, Monitor, Radio, Square, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  endTorneoLiveSessionAction,
  getActiveTorneoLiveSessionAction,
  startTorneoLiveSessionAction,
  type TorneoLiveSessionInfo,
  type TorneoLiveSessionStarted,
} from "@/app/campaigns/torneo-live-actions";
import {
  gmRemoteJoinUrl,
  torneoLiveBracketUrl,
  torneoLiveTableUrl,
  torneoLiveTimerUrl,
  torneoTabelloneUrl,
} from "@/lib/torneo/live-links";
import type { TorneoMatchWithTeams } from "@/lib/torneo/types";

const REMOTE_TOKEN_STORAGE_PREFIX = "torneo-live-remote-token-";

type Props = {
  campaignId: string;
  matches: TorneoMatchWithTeams[];
  livePublicId?: string | null;
  station1MatchId?: string | null;
  station2MatchId?: string | null;
  onLiveSessionChange: (session: TorneoLiveSessionInfo | null, remoteToken?: string | null) => void;
};

function matchListLabel(m: TorneoMatchWithTeams): string {
  return (
    m.label ??
    (m.match_kind === "triello"
      ? `Triello · ${m.team_a.name}`
      : `${m.team_a.name} vs ${m.team_b.name}`)
  );
}

function LinkRow({
  label,
  url,
  onCopy,
}: {
  label: string;
  url: string;
  onCopy: (text: string, name: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase text-zinc-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        <code className="min-w-0 flex-1 break-all rounded bg-zinc-900 px-2 py-1.5 text-[11px] leading-snug text-zinc-300">
          {url}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          onClick={() => void onCopy(url, label)}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}

export function GmTorneoLiveBar({
  campaignId,
  matches,
  livePublicId = null,
  station1MatchId = null,
  station2MatchId = null,
  onLiveSessionChange,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<TorneoLiveSessionInfo | null>(null);
  const [remoteToken, setRemoteToken] = useState<string | null>(null);
  const [linksOpen, setLinksOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const storageKey = `${REMOTE_TOKEN_STORAGE_PREFIX}${campaignId}`;

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await getActiveTorneoLiveSessionAction(campaignId);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    const session = res.data ?? null;
    setLive(session);
    let token: string | null = null;
    if (session) {
      try {
        token = sessionStorage.getItem(storageKey);
        if (token) setRemoteToken(token);
      } catch {
        /* ignore */
      }
    } else {
      setRemoteToken(null);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
    onLiveSessionChange(session, token);
  }, [campaignId, onLiveSessionChange, storageKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remoteUrl =
    live?.remoteSessionPublicId && remoteToken
      ? gmRemoteJoinUrl(live.remoteSessionPublicId, remoteToken)
      : "";

  useEffect(() => {
    if (!remoteUrl || !linksOpen) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(remoteUrl, {
      width: 180,
      margin: 2,
      color: { dark: "#18181b", light: "#fef3c7" },
    }).then((data) => {
      if (!cancelled) setQrDataUrl(data);
    });
    return () => {
      cancelled = true;
    };
  }, [remoteUrl, linksOpen]);

  const handleStart = async () => {
    setBusy(true);
    const res = await startTorneoLiveSessionAction(campaignId);
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    const data = res.data as TorneoLiveSessionStarted;
    setLive(data);
    setRemoteToken(data.remotePlainToken);
    try {
      sessionStorage.setItem(storageKey, data.remotePlainToken);
    } catch {
      /* ignore */
    }
    onLiveSessionChange(data, data.remotePlainToken);
    setLinksOpen(true);
    toast.success("Sessione live avviata. Condividi QR o link con telecomandi e PC tavolo.");
  };

  const handleEnd = async () => {
    if (!confirm("Terminare la sessione live? I telecomandi smetteranno di funzionare.")) return;
    setBusy(true);
    const res = await endTorneoLiveSessionAction(campaignId);
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setLive(null);
    setRemoteToken(null);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    onLiveSessionChange(null, null);
    toast.success("Sessione live terminata.");
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiato.`);
    } catch {
      toast.error("Copia non riuscita.");
    }
  };

  const liveId = live?.publicId ?? livePublicId;
  const station1Match = station1MatchId ? matches.find((m) => m.id === station1MatchId) : null;
  const station2Match = station2MatchId ? matches.find((m) => m.id === station2MatchId) : null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Sessione live…
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {live ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/40 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
              <Radio className="h-3 w-3" />
              Live attiva
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 border-violet-800/50 text-[11px]"
              onClick={() => setLinksOpen(true)}
            >
              <Link2 className="mr-1 h-3 w-3" />
              Link e QR
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-red-400 hover:text-red-300"
              disabled={busy}
              onClick={() => void handleEnd()}
            >
              <Square className="mr-1 h-3 w-3" />
              Termina live
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-7 bg-amber-600 text-[11px] hover:bg-amber-500"
            disabled={busy}
            onClick={() => void handleStart()}
          >
            {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Radio className="mr-1 h-3 w-3" />}
            Avvia sessione live
          </Button>
        )}
      </div>

      <Dialog open={linksOpen} onOpenChange={setLinksOpen}>
        <DialogContent className="max-h-[90vh] w-[min(96vw,52rem)] max-w-none overflow-y-auto border-violet-900/40 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400">Collegamenti sessione live</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Telecomando unico per tutti. Fino a 2 incontri in parallelo: un PC tavolo e un proiettore timer per
              ciascun tavolo attivo.
            </DialogDescription>
          </DialogHeader>
          {remoteUrl ? (
            <div className="grid gap-6 md:grid-cols-[180px_1fr]">
              <div className="flex flex-col items-center gap-2">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- QR data URL dinamico
                  <img
                    src={qrDataUrl}
                    alt="QR telecomando"
                    className="w-full max-w-[180px] rounded-lg border border-amber-600/30"
                  />
                ) : null}
                <p className="text-center text-[10px] text-zinc-500">QR telecomando</p>
              </div>

              <div className="min-w-0 space-y-5">
                <LinkRow label="Telecomando (tutti i dispositivi)" url={remoteUrl} onCopy={copyText} />

                <div className="space-y-2 rounded-lg border border-violet-900/35 bg-zinc-900/40 p-3">
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase text-violet-300/90">
                    <Monitor className="h-3.5 w-3.5" />
                    Secondo schermo · tabellone
                  </p>
                  <LinkRow label="Tabellone GM (login)" url={torneoTabelloneUrl(campaignId)} onCopy={copyText} />
                  {liveId ? (
                    <LinkRow
                      label="Tabellone live (pubblico)"
                      url={torneoLiveBracketUrl(liveId)}
                      onCopy={copyText}
                    />
                  ) : null}
                </div>

                {liveId && (station1Match || station2Match) ? (
                  <div className="space-y-3 rounded-lg border border-amber-900/35 bg-zinc-900/40 p-3">
                    <p className="text-[10px] font-semibold uppercase text-amber-200/90">Tavoli attivi ora</p>
                    {station1Match ? (
                      <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                        <p className="text-xs font-medium text-zinc-200">Tavolo 1 · {matchListLabel(station1Match)}</p>
                        <LinkRow
                          label="PC tavolo 1 (initiative)"
                          url={torneoLiveTableUrl(liveId, station1Match.id)}
                          onCopy={copyText}
                        />
                        <LinkRow
                          label="Proiettore timer 1 (countdown + giocatore)"
                          url={torneoLiveTimerUrl(liveId, station1Match.id)}
                          onCopy={copyText}
                        />
                      </div>
                    ) : null}
                    {station2Match ? (
                      <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                        <p className="text-xs font-medium text-zinc-200">Tavolo 2 · {matchListLabel(station2Match)}</p>
                        <LinkRow
                          label="PC tavolo 2 (initiative)"
                          url={torneoLiveTableUrl(liveId, station2Match.id)}
                          onCopy={copyText}
                        />
                        <LinkRow
                          label="Proiettore timer 2 (countdown + giocatore)"
                          url={torneoLiveTimerUrl(liveId, station2Match.id)}
                          onCopy={copyText}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {liveId && matches.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase text-zinc-500">Tutti gli incontri</p>
                    <ul className="max-h-56 space-y-3 overflow-y-auto pr-1">
                      {matches.map((m) => {
                        const tableUrl = torneoLiveTableUrl(liveId, m.id);
                        const timerUrl = torneoLiveTimerUrl(liveId, m.id);
                        const label = matchListLabel(m);
                        return (
                          <li
                            key={m.id}
                            className="space-y-2 rounded border border-zinc-800/80 bg-zinc-950/50 p-2 text-xs"
                          >
                            <span className="block font-medium text-zinc-300">{label}</span>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 w-full text-[11px]"
                                onClick={() => void copyText(tableUrl, `${label} — PC tavolo`)}
                              >
                                PC tavolo
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 w-full border-amber-800/40 text-[11px] text-amber-200/90"
                                onClick={() => void copyText(timerUrl, `${label} — timer proiettore`)}
                              >
                                Timer 2 min
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              {live
                ? "Token telecomando non disponibile in questa scheda. Termina e riavvia la live, oppure apri «Link e QR» subito dopo l’avvio."
                : "Avvia la sessione live per generare il telecomando."}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
