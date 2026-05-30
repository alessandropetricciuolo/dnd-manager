"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Loader2, Radio, Square, Link2 } from "lucide-react";
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

type Props = {
  campaignId: string;
  matches: TorneoMatchWithTeams[];
  onLiveSessionChange: (session: TorneoLiveSessionInfo | null, remoteToken?: string | null) => void;
};

export function GmTorneoLiveBar({ campaignId, matches, onLiveSessionChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<TorneoLiveSessionInfo | null>(null);
  const [remoteToken, setRemoteToken] = useState<string | null>(null);
  const [linksOpen, setLinksOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await getActiveTorneoLiveSessionAction(campaignId);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setLive(res.data ?? null);
    onLiveSessionChange(res.data ?? null, null);
  }, [campaignId, onLiveSessionChange]);

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
      width: 200,
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
        <DialogContent className="max-w-md border-violet-900/40 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400">Collegamenti sessione live</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Stesso QR per tutti i telecomandi. Ogni PC tavolo usa il link del proprio incontro (max 2 paralleli).
            </DialogDescription>
          </DialogHeader>
          {remoteUrl ? (
            <div className="space-y-4">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- QR data URL dinamico
                <img src={qrDataUrl} alt="QR telecomando" className="mx-auto rounded-lg border border-amber-600/30" />
              ) : null}
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase text-zinc-500">Telecomando</p>
                <div className="flex gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300">
                    {remoteUrl}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0"
                    onClick={() => void copyText(remoteUrl, "Link telecomando")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase text-zinc-500">Display tabellone (secondo schermo)</p>
                <div className="flex gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300">
                    {torneoTabelloneUrl(campaignId)}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0"
                    onClick={() => void copyText(torneoTabelloneUrl(campaignId), "Tabellone")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {live ? (
                  <p className="text-[10px] text-zinc-600">
                    Alternativa live: {torneoLiveBracketUrl(live.publicId)}
                  </p>
                ) : null}
              </div>
              {live && matches.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase text-zinc-500">PC tavolo e megatimer</p>
                  <ul className="max-h-48 space-y-2 overflow-y-auto">
                    {matches.map((m) => {
                      const tableUrl = torneoLiveTableUrl(live.publicId, m.id);
                      const timerUrl = torneoLiveTimerUrl(live.publicId, m.id);
                      const label =
                        m.label ??
                        (m.match_kind === "triello"
                          ? `Triello · ${m.team_a.name}`
                          : `${m.team_a.name} vs ${m.team_b.name}`);
                      return (
                        <li key={m.id} className="space-y-1 text-xs">
                          <span className="block truncate text-zinc-300">{label}</span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 flex-1 px-1 text-[10px]"
                              onClick={() => void copyText(tableUrl, `${label} tavolo`)}
                            >
                              Tavolo
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 flex-1 px-1 text-[10px]"
                              onClick={() => void copyText(timerUrl, `${label} timer`)}
                            >
                              Timer
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Avvia la sessione live per generare il telecomando. Se hai ricaricato la pagina, termina e riavvia la live
              per ottenere un nuovo token.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
