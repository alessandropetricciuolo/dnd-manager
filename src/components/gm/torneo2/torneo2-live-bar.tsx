"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, Link2, Loader2, Radio, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  endTorneo2LiveSessionAction,
  startTorneo2LiveSessionAction,
} from "@/app/campaigns/torneo2-live-actions";
import { torneo2BoardUrl, torneo2RemoteJoinUrl } from "@/lib/torneo2/live-links";
import type { Torneo2LiveSession } from "@/lib/torneo2/types";

type Props = {
  campaignId: string;
  liveSession: Torneo2LiveSession | null;
  onLiveChange: (session: Torneo2LiveSession | null) => void;
};

const TOKEN_KEY_PREFIX = "torneo2-remote-token-";

export function Torneo2LiveBar({ campaignId, liveSession, onLiveChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [remoteToken, setRemoteToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const isLive = liveSession?.status === "live";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = sessionStorage.getItem(`${TOKEN_KEY_PREFIX}${campaignId}`);
      if (stored) setRemoteToken(stored);
    } catch {
      /* ignore */
    }
  }, [campaignId]);

  const remoteUrl =
    isLive && liveSession?.remoteSessionPublicId && remoteToken
      ? torneo2RemoteJoinUrl(liveSession.remoteSessionPublicId, remoteToken)
      : null;
  const boardUrl = isLive && liveSession ? torneo2BoardUrl(liveSession.publicId) : null;

  useEffect(() => {
    if (!remoteUrl || !linksOpen) {
      setQrDataUrl(null);
      return;
    }
    void QRCode.toDataURL(remoteUrl, { margin: 1, width: 220 }).then(setQrDataUrl).catch(() => {});
  }, [remoteUrl, linksOpen]);

  const handleStart = async () => {
    setBusy(true);
    const res = await startTorneo2LiveSessionAction(campaignId);
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error(res.success ? "Errore avvio." : res.error);
      return;
    }
    setRemoteToken(res.data.remotePlainToken);
    try {
      sessionStorage.setItem(`${TOKEN_KEY_PREFIX}${campaignId}`, res.data.remotePlainToken);
    } catch {
      /* ignore */
    }
    onLiveChange(res.data);
    toast.success("Sessione live avviata. Usa «Link e QR» per megatimer e telecomando.");
  };

  const handleEnd = async () => {
    if (!confirm("Terminare la sessione live? I telecomandi verranno revocati.")) return;
    setBusy(true);
    const res = await endTorneo2LiveSessionAction(campaignId);
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    try {
      sessionStorage.removeItem(`${TOKEN_KEY_PREFIX}${campaignId}`);
    } catch {
      /* ignore */
    }
    setRemoteToken(null);
    onLiveChange(null);
    toast.success("Sessione live terminata.");
  };

  const copy = (value: string) => {
    void navigator.clipboard.writeText(value).then(
      () => toast.success("Copiato."),
      () => toast.error("Copia non riuscita.")
    );
  };

  return (
    <div className="flex items-center gap-2">
      {isLive ? (
        <>
          <span className="flex items-center gap-1 rounded-full bg-emerald-950/50 px-2 py-1 text-[11px] text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> LIVE
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => setLinksOpen(true)}
          >
            <Link2 className="h-3.5 w-3.5" /> Link e QR
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-red-800/60 px-2 text-[11px] text-red-300"
            disabled={busy}
            onClick={() => void handleEnd()}
          >
            <Square className="h-3 w-3" /> Termina live
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1 bg-emerald-700 px-2 text-[11px] hover:bg-emerald-600"
          disabled={busy}
          onClick={() => void handleStart()}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
          Avvia live
        </Button>
      )}

      <Dialog open={linksOpen} onOpenChange={setLinksOpen} modal={false}>
        <DialogContent
          withOverlay={false}
          className="w-[min(96vw,40rem)] max-w-none border-violet-900/40 bg-zinc-950 text-zinc-100 shadow-2xl"
        >
          <DialogHeader>
            <DialogTitle className="text-amber-400">Collegamenti sessione live</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Puoi lasciare questa finestra aperta e continuare a usare la console. I link megatimer e
              PC tavolo sono nelle intestazioni dei rispettivi tavoli.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold text-zinc-300">Telecomando (telefono)</p>
              {remoteUrl ? (
                <>
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt="QR telecomando" className="mb-2 rounded bg-white p-1" />
                  ) : null}
                  <div className="flex items-center gap-1">
                    <code className="min-w-0 flex-1 truncate rounded bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400">
                      {remoteUrl}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 px-0"
                      onClick={() => copy(remoteUrl)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-zinc-500">
                  Token disponibile solo all&apos;avvio della live su questo dispositivo.
                </p>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-zinc-300">Tabellone / Classifica</p>
              {boardUrl ? (
                <div className="flex items-center gap-1">
                  <code className="min-w-0 flex-1 truncate rounded bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400">
                    {boardUrl}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 px-0"
                    onClick={() => copy(boardUrl)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
