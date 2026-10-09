"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Loader2, MonitorPlay, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prepareWikiVideoUpload, saveWikiVideo, removeWikiVideo, discardWikiVideoUpload } from "@/app/campaigns/wiki-video-actions";
import { getWikiVideos, validateWikiVideoFile, type WikiVideo } from "@/lib/wiki/videos";
import { openProjectionWindow } from "@/lib/browser/projection-window";

export function WikiVideoGallery({ campaignId, entityId, attributes, canManage }: {
  campaignId: string; entityId: string; attributes: Record<string, unknown> | null | undefined; canManage: boolean;
}) {
  const router = useRouter();
  const [videos, setVideos] = useState<WikiVideo[]>(() => getWikiVideos(attributes));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setVideos(getWikiVideos(attributes)); }, [attributes]);
  useEffect(() => {
    if (!file) { setPreview(undefined); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function reset() { setFile(null); setTitle(""); setTicket(null); setProgress(null); if (input.current) input.current.value = ""; }
  async function cancel() {
    setBusy(true);
    try {
      if (ticket) {
        const result = await discardWikiVideoUpload(ticket);
        if (!result.success) { toast.error(result.message); return; }
      }
      reset();
    } catch { toast.error("Impossibile annullare il caricamento. Riprova."); }
    finally { setBusy(false); }
  }
  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    try {
      let uploadTicket = ticket;
      if (!uploadTicket) {
        const prepared = await prepareWikiVideoUpload(campaignId, entityId, file.size, file.type);
        if (!prepared.success) { toast.error(prepared.message); return; }
        uploadTicket = prepared.ticket;
        setTicket(uploadTicket);
        try { await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", prepared.uploadUrl);
          xhr.setRequestHeader("Content-Type", "video/mp4");
          xhr.timeout = 10 * 60 * 1000;
          xhr.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)); };
          xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Caricamento non riuscito. Annulla e riprova."));
          xhr.onerror = () => reject(new Error("Connessione allo storage non riuscita. Annulla e riprova."));
          xhr.ontimeout = () => reject(new Error("Caricamento scaduto. Annulla e riprova."));
          xhr.send(file);
        }); } catch (error) {
          const cleanup = await discardWikiVideoUpload(uploadTicket);
          if (cleanup.success) setTicket(null);
          setProgress(null);
          throw error;
        }
      }
      const result = await saveWikiVideo(uploadTicket, title);
      if (!result.success) { toast.error(result.message); return; }
      setVideos(result.videos);
      reset();
      toast.success("Video salvato nella Wiki.");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Caricamento non riuscito."); }
    finally { setBusy(false); }
  }
  async function remove(video: WikiVideo) {
    if (!window.confirm(`Rimuovere «${video.title}» dalla Wiki e dallo storage?`)) return;
    setBusy(true);
    try {
      const result = await removeWikiVideo(campaignId, entityId, video.id);
      if (!result.success) { toast.error(result.message); return; }
      setVideos(result.videos); toast.success(result.message); router.refresh();
    } catch { toast.error("Impossibile rimuovere il video."); }
    finally { setBusy(false); }
  }
  if (!canManage && videos.length === 0) return null;
  return <section className="w-full space-y-4 rounded-lg border border-barber-gold/30 bg-black/20 p-4" aria-label="Video ambientali">
    <h2 className="font-cinzel text-base text-barber-gold">Video ambientali</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      {videos.map(video => <div key={video.id} className="min-w-0 space-y-2">
        <video src={video.url} controls muted playsInline loop preload="none" aria-label={video.title} className="aspect-video w-full rounded bg-black object-contain" />
        <p className="break-words text-sm text-barber-paper">{video.title}</p>
        {canManage && <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void openProjectionWindow(`/campaigns/${campaignId}/gm-only/regia-immagini/proiezione?items=${encodeURIComponent(`video:${entityId}:${video.id}`)}`, "PlayerScreenWindow").catch(() => toast.error("Impossibile aprire la proiezione."))}><MonitorPlay className="mr-2 h-4 w-4" />Proietta video</Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void remove(video)} aria-label={`Rimuovi ${video.title}`}><Trash2 className="mr-2 h-4 w-4" />Rimuovi</Button>
        </div>}
      </div>)}
    </div>
    {canManage && <div className="space-y-3 border-t border-barber-gold/20 pt-3">
      <p className="text-xs text-barber-paper/70">MP4 fino a 100 MB · consigliato H.264, 1080p e clip brevi in loop. I video sono accessibili a chi possiede il link.</p>
      <label className="block text-sm text-barber-paper">Aggiungi video
        <input ref={input} type="file" accept="video/mp4,.mp4" disabled={busy || !!ticket} className="mt-2 block w-full text-sm" onChange={event => {
          const chosen = event.target.files?.[0];
          if (!chosen) return;
          const invalid = validateWikiVideoFile(chosen.size, chosen.type);
          if (invalid) { toast.error(invalid); event.target.value = ""; return; }
          setFile(chosen); setTitle(chosen.name.replace(/\.mp4$/i, ""));
        }} />
      </label>
      {file && <>
        <video src={preview} muted playsInline controls preload="metadata" className="aspect-video max-h-64 w-full rounded bg-black object-contain" aria-label="Anteprima video da caricare" />
        <label className="block text-sm text-barber-paper">Titolo del video<Input value={title} maxLength={200} disabled={busy} onChange={event => setTitle(event.target.value)} className="mt-1" /></label>
        <p className="text-xs text-barber-paper/70" role="status">{busy ? progress !== null && progress < 100 ? `Caricamento ${progress}%` : "Salvataggio video…" : `${(file.size / 1024 / 1024).toFixed(1)} MB`}</p>
        <div className="flex gap-2"><Button type="button" disabled={busy} onClick={() => void upload()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salva video</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void cancel()}>Annulla</Button></div>
      </>}
    </div>}
  </section>;
}
