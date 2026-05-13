"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteGlobalAudioTrackAction,
  finalizeGlobalAudioUploadAction,
  listAdminGlobalAudioTracksAction,
  prepareGlobalAudioUploadAction,
} from "@/app/admin/audio-library/actions";
import type { GmGlobalAudioRow, GmGlobalAudioType } from "@/lib/gm-global-audio/types";

const TYPE_LABEL: Record<GmGlobalAudioType, string> = {
  music: "Musica",
  sfx: "SFX",
  atmosphere: "Atmosfera",
};

export function AdminAudioLibraryClient() {
  const [rows, setRows] = useState<GmGlobalAudioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [audioType, setAudioType] = useState<GmGlobalAudioType>("music");
  const [mood, setMood] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMood, setFilterMood] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listAdminGlobalAudioTracksAction();
    setLoading(false);
    if (res.success) setRows(res.data);
    else toast.error(res.message);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const m = filterMood.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterType !== "all" && r.audio_type !== filterType) return false;
      if (m && !r.mood.toLowerCase().includes(m) && !r.title.toLowerCase().includes(m)) return false;
      return true;
    });
  }, [rows, filterType, filterMood]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Seleziona un file audio.");
      return;
    }
    const t = title.trim();
    if (!t) {
      toast.error("Titolo obbligatorio.");
      return;
    }
    setUploading(true);
    try {
      const prep = await prepareGlobalAudioUploadAction(file.name, file.type || "application/octet-stream", file.size);
      if (!prep.success) {
        toast.error(prep.message);
        return;
      }
      const put = await fetch(prep.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": prep.contentType },
      });
      if (!put.ok) {
        toast.error(`Upload su R2 fallito (${put.status}). Controlla CORS (PUT) sul bucket.`);
        return;
      }
      const fin = await finalizeGlobalAudioUploadAction({
        storageKey: prep.storageKey,
        title: t,
        audioType,
        mood: mood.trim(),
        mimeType: prep.contentType,
        fileSizeBytes: file.size,
      });
      if (!fin.success) {
        toast.error(fin.message);
        return;
      }
      toast.success("File caricato e catalogato.");
      setTitle("");
      setMood("");
      setFile(null);
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa traccia da database e da R2?")) return;
    const res = await deleteGlobalAudioTrackAction(id);
    if (res.success) {
      toast.success("Eliminata.");
      await load();
    } else toast.error(res.message);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="font-serif text-2xl text-barber-paper">Libreria audio globale</h1>
        <p className="mt-1 text-sm text-barber-paper/70">
          Caricamento su Cloudflare R2. Musica ed effetti sono visibili a tutti i master nel GM Screen (tab Catalogo).
        </p>
      </div>

      <form
        onSubmit={handleUpload}
        className="space-y-4 rounded-xl border border-barber-gold/25 bg-barber-dark/80 p-4"
      >
        <h2 className="text-sm font-semibold text-barber-gold">Nuovo upload</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="audio-file">File</Label>
            <Input
              id="audio-file"
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.webm,.flac,.m4a,.aac"
              onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
              className="border-barber-gold/30 bg-barber-dark text-barber-paper"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audio-title">Titolo</Label>
            <Input
              id="audio-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Taverna — sera"
              className="border-barber-gold/30 bg-barber-dark text-barber-paper"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={audioType} onValueChange={(v) => setAudioType(v as GmGlobalAudioType)}>
              <SelectTrigger className="border-barber-gold/30 bg-barber-dark text-barber-paper">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-barber-gold/30 bg-zinc-950">
                <SelectItem value="music">Musica</SelectItem>
                <SelectItem value="sfx">SFX</SelectItem>
                <SelectItem value="atmosphere">Atmosfera</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audio-mood">Mood</Label>
            <Input
              id="audio-mood"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="Es. calma, battaglia, horror"
              className="border-barber-gold/30 bg-barber-dark text-barber-paper"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={uploading}
          className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Caricamento…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Carica su R2
            </>
          )}
        </Button>
      </form>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label className="text-barber-paper/80">Filtra tipo</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full border-barber-gold/30 bg-barber-dark text-barber-paper sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-barber-gold/30 bg-zinc-950">
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="music">Musica</SelectItem>
                <SelectItem value="sfx">SFX</SelectItem>
                <SelectItem value="atmosphere">Atmosfera</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label className="text-barber-paper/80">Cerca mood / titolo</Label>
            <Input
              value={filterMood}
              onChange={(e) => setFilterMood(e.target.value)}
              placeholder="Testo libero…"
              className="border-barber-gold/30 bg-barber-dark text-barber-paper"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-barber-paper/70">
            <Loader2 className="h-5 w-5 animate-spin" />
            Caricamento elenco…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-barber-paper/60">Nessuna traccia con questi filtri.</p>
        ) : (
          <ul className="divide-y divide-barber-gold/15 rounded-xl border border-barber-gold/20 bg-barber-dark/60">
            {filtered.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-barber-paper">{r.title}</p>
                  <p className="text-xs text-barber-paper/60">
                    {TYPE_LABEL[r.audio_type]} · Mood: {r.mood || "—"}
                    {r.file_size_bytes != null
                      ? ` · ${Math.round(r.file_size_bytes / 1024)} KB`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-barber-gold/40 text-barber-paper"
                    onClick={() => {
                      const a = new Audio(r.public_url);
                      void a.play().catch(() => toast.error("Riproduzione bloccata (CORS o formato)."));
                    }}
                  >
                    Anteprima
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-800/50 text-red-300 hover:bg-red-950/30"
                    onClick={() => void handleDelete(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
