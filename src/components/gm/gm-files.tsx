"use client";

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { FileIcon, Upload, Trash2, Loader2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  listGmAttachments,
  uploadGmFile,
  deleteGmAttachment,
  type GmAttachmentRow,
} from "@/app/campaigns/gm-actions";

type GmFilesProps = {
  campaignId: string;
};

export function GmFiles({ campaignId }: GmFilesProps) {
  const router = useRouter();
  const [files, setFiles] = useState<GmAttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
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

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    const form = event.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file?.size) {
      toast.error("Seleziona un file (PDF, immagine o documento).");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    setUploading(true);
    const result = await uploadGmFile(campaignId, formData);
    setUploading(false);
    if (result.success) {
      toast.success("File caricato.");
      fileInput.value = "";
      loadFiles();
      router.refresh();
    } else toast.error(result.error);
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-slate-200">File GM</h3>
        <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
            className="max-w-[200px] text-sm text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-sm file:text-white file:hover:bg-violet-700"
          />
          <Button
            type="submit"
            disabled={uploading}
            variant="outline"
            size="sm"
            className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Carica
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      ) : files.length === 0 ? (
        <p className="rounded-lg border border-violet-800/40 bg-slate-900/60 px-4 py-6 text-center text-sm text-slate-400">
          Nessun file. Carica PDF, immagini o documenti.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {files.map((att) => (
            <Card
              key={att.id}
              className="border-violet-800/40 bg-slate-900/60 transition-colors hover:border-violet-700/50"
            >
              <CardContent className="flex flex-row items-center gap-3 p-4">
                <FileIcon className="h-8 w-8 shrink-0 text-violet-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-violet-100" title={att.file_name}>
                    {att.file_name}
                  </p>
                  {att.file_size != null && (
                    <p className="text-xs text-slate-500">
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
                      className="h-8 w-8 text-slate-400 hover:text-violet-300"
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
                    className="h-8 w-8 text-slate-400 hover:text-red-400"
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
              </CardContent>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
