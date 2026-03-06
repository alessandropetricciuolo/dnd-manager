"use client";

/**
 * Upload con drag & drop: file < 4MB → caricamento automatico su Telegram; file > 4MB → avviso + input per incollare il File ID.
 * Per far rispondere il Bot con il file_id quando invii un documento in privato, vedi docs/TELEGRAM_BOT_FILE_ID.md
 */
import { useState, useCallback } from "react";
import { Upload, FileWarning } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { uploadFileToTelegram } from "@/app/actions/upload-telegram";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

export type SmartFileUploadType = "photo" | "document";

export type SmartFileUploadProps = {
  /** Nome del campo hidden che conterrà l'URL finale (es. /api/tg-image/xxx o /api/tg-file/xxx). */
  name: string;
  /** 'photo' → proxy /api/tg-image; 'document' → proxy /api/tg-file. */
  type?: SmartFileUploadType;
  label?: string;
  disabled?: boolean;
  accept?: string;
  className?: string;
  /** Valore iniziale (es. URL esistente in modifica). */
  defaultValue?: string | null;
};

function proxyUrl(fileId: string, type: SmartFileUploadType): string {
  return type === "document" ? `/api/tg-file/${fileId}` : `/api/tg-image/${fileId}`;
}

export function SmartFileUpload({
  name,
  type = "photo",
  label = "File",
  disabled = false,
  accept = "image/*,.pdf",
  className,
  defaultValue,
}: SmartFileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(defaultValue ?? null);
  const [tooBig, setTooBig] = useState(false);
  const [pastedFileId, setPastedFileId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const setResult = useCallback(
    (fileId: string) => {
      setResultUrl(proxyUrl(fileId.trim(), type));
      setError(null);
      setTooBig(false);
      setPastedFileId("");
    },
    [type]
  );

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) {
        setResultUrl(null);
        setTooBig(false);
        setError(null);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setTooBig(true);
        setResultUrl(null);
        setError(null);
        return;
      }
      setTooBig(false);
      setError(null);
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const result = await uploadFileToTelegram(formData);
      setUploading(false);
      if (result.success) {
        setResult(result.fileId);
      } else {
        setError(result.error);
      }
    },
    [type]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || uploading) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [disabled, uploading, handleFile]
  );

  const handleChangeInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || uploading) return;
      const file = e.target.files?.[0];
      handleFile(file ?? null);
      e.target.value = "";
    },
    [disabled, uploading, handleFile]
  );

  const handlePastedFileId = useCallback(() => {
    const id = pastedFileId.trim();
    if (!id) return;
    setResult(id);
  }, [pastedFileId, setResult]);

  const currentValue = resultUrl ?? "";

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-barber-paper/90">{label}</Label>
      )}
      <input type="hidden" name={name} value={currentValue} readOnly />

      {!tooBig ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "relative flex min-h-[120px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors",
            dragOver && "border-barber-gold bg-barber-gold/10",
            !dragOver && "border-barber-gold/40 bg-barber-dark/80",
            (disabled || uploading) && "pointer-events-none opacity-70"
          )}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleChangeInput}
            disabled={disabled || uploading}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Carica file"
          />
          {uploading ? (
            <>
              <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-barber-dark">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-barber-gold" />
              </div>
              <p className="mt-2 text-sm text-barber-paper/80">Caricamento in corso…</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-barber-gold/80" />
              <p className="mt-2 text-center text-sm text-barber-paper/80">
                Trascina un file qui o clicca per scegliere
              </p>
              <p className="mt-1 text-xs text-barber-paper/50">
                Max 4MB per l’upload diretto
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-start gap-2">
            <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-sm text-barber-paper/90">
              File troppo grande per l’upload web. Invia il file al Bot Telegram e incolla qui il
              File ID.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Incolla File ID Telegram"
              value={pastedFileId}
              onChange={(e) => setPastedFileId(e.target.value)}
              disabled={disabled}
              className="flex-1 bg-barber-dark border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
            />
            <button
              type="button"
              onClick={handlePastedFileId}
              disabled={disabled || !pastedFileId.trim()}
              className="shrink-0 rounded-md bg-barber-gold/20 px-3 py-2 text-sm font-medium text-barber-gold hover:bg-barber-gold/30 disabled:opacity-50"
            >
              Usa
            </button>
          </div>
        </div>
      )}

      {resultUrl && !uploading && (
        <p className="text-xs text-barber-gold/80">
          File collegato. Per cambiarlo, carica un nuovo file o incolla un altro File ID.
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
