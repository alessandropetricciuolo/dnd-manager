"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { FileIcon, Upload, Trash2, Loader2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  listGmAttachments,
  registerGmFileAfterUpload,
  deleteGmAttachment,
  type GmAttachmentRow,
} from "@/app/campaigns/gm-actions";
import { uploadFileToTelegram } from "@/app/actions/upload-telegram";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { listCampaignMissionsLiteForGm } from "@/app/campaigns/wiki-actions";

const GM_FILES_BUCKET = "gm_files";

function sanitizeFileName(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").trim() || "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

type GmFilesProps = {
  campaignId: string;
};

export function GmFiles({ campaignId }: GmFilesProps) {
  const router = useRouter();
  const [files, setFiles] = useState<GmAttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [linkKind, setLinkKind] = useState<"free" | "wiki_section" | "mission">("free");
  const [wikiSection, setWikiSection] = useState<"npc" | "monster" | "location" | "item" | "lore" | "pg">("lore");
  const [linkedMissionId, setLinkedMissionId] = useState<string>("none");
  const [missions, setMissions] = useState<{ id: string; title: string }[]>([]);
  const missionTitleById = useCallback(
    (id: string | null | undefined) => missions.find((m) => m.id === id)?.title ?? null,
    [missions]
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    const result = await listGmAttachments(campaignId);
    setLoading(false);
    if (result.success && result.data) setFiles(result.data);
    else if (!result.success) toast.error(result.error);
  }, [campaignId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    void listCampaignMissionsLiteForGm(campaignId).then((res) => {
      if (res.success) setMissions(res.data);
      else setMissions([]);
    });
  }, [campaignId]);

  useEffect(() => {
    const handler = () => fileInputRef.current?.click();
    window.addEventListener("gm-files:upload", handler);
    return () => window.removeEventListener("gm-files:upload", handler);
  }, []);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    const input = fileInputRef.current;
    const file = input?.files?.[0];
    if (!file?.size) {
      toast.error("Seleziona un file da caricare.");
      return;
    }
    if (linkKind === "mission" && linkedMissionId === "none") {
      toast.error("Seleziona una missione prima del caricamento.");
      return;
    }

    setUploading(true);
    const safeName = sanitizeFileName(file.name);
    const path = `${campaignId}/${crypto.randomUUID()}-${safeName}`;
    const isImage = file.type.startsWith("image/");
    let storedPath = path;

    if (isImage && file.size <= 4 * 1024 * 1024) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "document");
      const telegramResult = await uploadFileToTelegram(formData);
      if (!telegramResult.success) {
        setUploading(false);
        toast.error(telegramResult.error);
        return;
      }
      storedPath = `tg:${telegramResult.fileId}`;
    } else {
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(GM_FILES_BUCKET)
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        setUploading(false);
        toast.error(uploadError.message ?? "Errore nel caricamento su Storage.");
        return;
      }
    }

    const result = await registerGmFileAfterUpload(
      campaignId,
      storedPath,
      file.name,
      file.type || null,
      file.size,
      {
        linkKind,
        wikiSection: linkKind === "wiki_section" ? wikiSection : null,
        linkedMissionId: linkKind === "mission" && linkedMissionId !== "none" ? linkedMissionId : null,
      }
    );
    setUploading(false);

    if (result.success) {
      toast.success("File caricato.");
      if (input) input.value = "";
      setLinkKind("free");
      setLinkedMissionId("none");
      loadFiles();
      router.refresh();
    } else {
      toast.error(result.error ?? "Errore nel salvataggio.");
    }
  }

  async function handleDelete(att: GmAttachmentRow) {
    if (!confirm(`Eliminare il file "${att.file_name}"?`)) return;
    setDeleteLoadingId(att.id);
    const result = await deleteGmAttachment(att.id);
    setDeleteLoadingId(null);
    if (result.success) {
      toast.success("File eliminato.");
      loadFiles();
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-barber-gold/20 pb-3">
        <div className="flex items-center gap-2">
          <FileIcon className="h-5 w-5 text-barber-gold" />
          <h3 className="font-cinzel text-lg font-bold text-gold-relief">Archivio Documenti del Master</h3>
        </div>
        <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold tracking-wide text-barber-gold/80">Categoria</label>
            <select
              value={linkKind}
              onChange={(e) => setLinkKind(e.target.value as "free" | "wiki_section" | "mission")}
              className="h-9 rounded-md border border-barber-gold/30 bg-black/50 px-2 text-xs text-barber-paper"
            >
              <option value="free">Libero</option>
              <option value="wiki_section">Sezione Wiki</option>
              <option value="mission">Missione</option>
            </select>
          </div>
          {linkKind === "wiki_section" ? (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold tracking-wide text-barber-gold/80">Sezione Wiki</label>
              <select
                value={wikiSection}
                onChange={(e) => setWikiSection(e.target.value as "npc" | "monster" | "location" | "item" | "lore" | "pg")}
                className="h-9 rounded-md border border-barber-gold/30 bg-black/50 px-2 text-xs text-barber-paper"
              >
                <option value="npc">NPC</option>
                <option value="monster">Mostri</option>
                <option value="location">Luoghi</option>
                <option value="item">Oggetti</option>
                <option value="lore">Lore</option>
                <option value="pg">PG</option>
              </select>
            </div>
          ) : null}
          {linkKind === "mission" ? (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold tracking-wide text-barber-gold/80">Missione</label>
              <select
                value={linkedMissionId}
                onChange={(e) => setLinkedMissionId(e.target.value)}
                className="h-9 min-w-[190px] rounded-md border border-barber-gold/30 bg-black/50 px-2 text-xs text-barber-paper"
              >
                <option value="none">Seleziona missione...</option>
                {missions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            className="max-w-[220px] text-xs text-barber-paper/80 file:mr-2 file:rounded-md file:border-0 file:bg-barber-gold/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-barber-gold file:hover:bg-barber-gold/30"
          />
          <Button
            type="submit"
            disabled={uploading}
            variant="outline"
            size="sm"
            className="border-barber-gold/40 text-barber-gold hover:bg-barber-gold/15"
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-barber-gold" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Carica file
          </Button>
        </form>
      </div>
      <p className="text-xs text-barber-paper/50">
        Immagini fino a 4 MB salvate istantaneamente su Telegram. Altri formati archiviati nel deposito sicuro di Gilda.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-barber-gold" />
        </div>
      ) : files.length === 0 ? (
        <div className="card-guild-stone relative rounded-xl p-6 text-center">
          <span className="corner-ornament-tl" />
          <span className="corner-ornament-tr" />
          <span className="corner-ornament-bl" />
          <span className="corner-ornament-br" />
          <p className="font-cinzel text-base text-barber-gold/80">Archivio documenti vuoto</p>
          <p className="mt-1 text-xs text-barber-paper/60">
            Nessun file presente. Carica mappe esterne, tabelle PDF, documenti o zip nell&apos;archivio di gilda.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {files.map((att) => (
            <div
              key={att.id}
              className="card-guild-stone relative rounded-xl p-4 shadow-md transition-all hover:border-barber-gold/50 flex flex-row items-center gap-3 min-w-0"
            >
              <span className="corner-ornament-tl" />
              <span className="corner-ornament-tr" />
              <span className="corner-ornament-bl" />
              <span className="corner-ornament-br" />
              <FileIcon className="h-8 w-8 shrink-0 text-barber-gold" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-barber-paper" title={att.file_name}>
                  {att.file_name}
                </p>
                <p className="text-[11px] text-barber-gold/90 font-medium">
                  {att.link_kind === "free"
                    ? "Libero"
                    : att.link_kind === "wiki_section"
                      ? `Wiki: ${att.wiki_section ?? "sezione"}`
                      : `Missione: ${missionTitleById(att.linked_mission_id) ?? "non impostata"}`}
                </p>
                {att.file_size != null && (
                  <p className="text-xs text-barber-paper/50">
                    {(att.file_size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {att.signed_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-barber-gold hover:bg-barber-gold/15"
                    asChild
                  >
                    <a href={att.signed_url} download={att.file_name} target="_blank" rel="noopener noreferrer" title="Scarica">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-barber-paper/60 hover:text-barber-red hover:bg-barber-red/10"
                  onClick={() => handleDelete(att)}
                  disabled={deleteLoadingId === att.id}
                  title="Elimina"
                >
                  {deleteLoadingId === att.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </ul>
      )}
    </div>
  );
}
