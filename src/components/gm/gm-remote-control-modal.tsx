"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone, Copy, Ban, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createGmRemoteSession, revokeGmRemoteSession, type GmRemoteSessionCreated } from "@/app/campaigns/gm-remote-actions";

type SessionState = GmRemoteSessionCreated;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  session: SessionState | null;
  onSessionChange: (s: SessionState | null) => void;
  realtimeConnected: boolean;
};

function joinUrl(publicId: string, plainToken: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/gm-remote/j/${publicId}#t=${encodeURIComponent(plainToken)}`;
}

export function GmRemoteControlModal({
  open,
  onOpenChange,
  campaignId,
  session,
  onSessionChange,
  realtimeConnected,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const url = session ? joinUrl(session.publicId, session.plainToken) : "";

  useEffect(() => {
    if (!open || !session) {
      setQrDataUrl(null);
      return;
    }
    const join = joinUrl(session.publicId, session.plainToken);
    if (!join) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(join, {
      width: 220,
      margin: 2,
      color: { dark: "#18181b", light: "#fef3c7" },
    }).then((data) => {
      if (!cancelled) setQrDataUrl(data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, session]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const res = await createGmRemoteSession(campaignId);
      if (!res.success) {
        toast.error("error" in res ? res.error : "Errore creazione sessione.");
        return;
      }
      if (!res.data) {
        toast.error("Risposta vuota dal server.");
        return;
      }
      onSessionChange(res.data);
      toast.success("Sessione creata. Inquadra il QR dal telefono.");
    } finally {
      setCreating(false);
    }
  }, [campaignId, onSessionChange]);

  const handleRevoke = useCallback(async () => {
    if (!session) return;
    setRevoking(true);
    try {
      const res = await revokeGmRemoteSession(campaignId, session.publicId);
      if (!res.success) {
        toast.error("error" in res ? res.error : "Errore revoca.");
        return;
      }
      onSessionChange(null);
      toast.message("Sessione revocata.");
    } finally {
      setRevoking(false);
    }
  }, [campaignId, session, onSessionChange]);

  const copyLink = useCallback(() => {
    if (!url) return;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("Link copiato."),
      () => toast.error("Impossibile copiare.")
    );
  }, [url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-amber-800/40 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-100">
            <Smartphone className="h-5 w-5 text-amber-400" />
            Telecomando
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Il telefono invia solo comandi: l&apos;audio resta sul PC (policy autoplay). Il token è nel fragment (#)
            dell&apos;URL e non viene inviato al server col GET.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 rounded-lg border border-amber-900/40 bg-zinc-900/60 px-3 py-2 text-xs">
            <Radio className={`h-4 w-4 shrink-0 ${realtimeConnected ? "text-emerald-400" : "text-zinc-500"}`} />
            <span className="text-zinc-300">
              Realtime:{" "}
              <span className={realtimeConnected ? "text-emerald-300" : "text-zinc-500"}>
                {session ? (realtimeConnected ? "connesso" : "in attesa…") : "—"}
              </span>
            </span>
          </div>

          {!session ? (
            <p className="text-xs text-zinc-500">
              Genera una sessione (valida ~6 ore). Poi mostra il QR al telefono o copia il link.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-zinc-500">
                Scadenza: {new Date(session.expiresAt).toLocaleString("it-IT")}
              </p>
              <div className="flex justify-center rounded-lg border border-amber-800/30 bg-amber-50 p-3">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="QR telecomando" width={220} height={220} className="rounded" />
                ) : (
                  <div className="flex h-[220px] w-[220px] items-center justify-center text-zinc-500">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </div>
              <Button type="button" size="sm" variant="secondary" className="w-full gap-2" onClick={copyLink}>
                <Copy className="h-4 w-4" />
                Copia link con token
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {!session ? (
            <Button
              type="button"
              className="w-full bg-amber-600 text-zinc-950 hover:bg-amber-500"
              disabled={creating}
              onClick={() => void handleCreate()}
            >
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Genera sessione e QR
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={revoking}
              onClick={() => void handleRevoke()}
            >
              {revoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
              Revoca sessione
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
