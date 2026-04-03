"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ingestTxtManualBatchAction,
  listManualTxtFilesAction,
} from "@/lib/actions/ingest-manuals";
import { cn } from "@/lib/utils";

export function ManualIngestControls() {
  const router = useRouter();
  const [allRunning, setAllRunning] = useState(false);
  const [baseRunning, setBaseRunning] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [fileIndex, setFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  /** Avanzamento chunk nel file corrente (UI ingest a batch). */
  const [chunkDone, setChunkDone] = useState(0);
  const [chunkTotal, setChunkTotal] = useState(0);

  const CHUNK_BATCH = 16;

  function combinedPercent(fileIdx0: number, totalFiles: number, doneInFile: number, chunksInFile: number) {
    if (totalFiles <= 0) return 0;
    const fracFile = chunksInFile > 0 ? Math.min(1, doneInFile / chunksInFile) : 1;
    return Math.min(100, Math.round(((fileIdx0 + fracFile) / totalFiles) * 100));
  }

  async function ingestOneFileBatched(
    name: string,
    metadata: Record<string, unknown>,
    fileIdx0: number,
    totalFiles: number
  ): Promise<{ inserted: number; skipped: number; chunks: number }> {
    let next = 0;
    let totalChunks = 0;
    let inserted = 0;
    let skipped = 0;
    setChunkDone(0);
    setChunkTotal(0);

    for (;;) {
      const batch = await ingestTxtManualBatchAction(name, metadata, next, CHUNK_BATCH);
      if (!batch.success) {
        throw new Error(batch.message);
      }
      totalChunks = batch.totalChunks;
      inserted += batch.inserted;
      skipped += batch.skipped;
      next = batch.nextIndex;
      setChunkTotal(totalChunks);
      setChunkDone(Math.min(next, totalChunks));
      setProgressPct(combinedPercent(fileIdx0, totalFiles, Math.min(next, totalChunks), totalChunks));

      if (batch.done) break;
    }

    return { inserted, skipped, chunks: totalChunks };
  }

  async function runIngestAll() {
    setAllRunning(true);
    setProgressPct(0);
    setChunkDone(0);
    setChunkTotal(0);
    setCurrentFile(null);
    setFileIndex(0);
    setTotalFiles(0);

    try {
      const listed = await listManualTxtFilesAction();
      if (!listed.success) {
        toast.error(listed.message);
        return;
      }
      const files = listed.files;
      if (files.length === 0) {
        toast.error("Nessun file .txt in public/manuals.");
        return;
      }
      setTotalFiles(files.length);

      let inserted = 0;
      let skipped = 0;
      let chunks = 0;

      for (let i = 0; i < files.length; i++) {
        const name = files[i];
        setFileIndex(i + 1);
        setCurrentFile(name);
        setProgressPct(combinedPercent(i, files.length, 0, 1));

        try {
          const result = await ingestOneFileBatched(
            name,
            { source_type: "txt-manual", source: name.replace(/\.txt$/i, "") },
            i,
            files.length
          );
          inserted += result.inserted;
          skipped += result.skipped;
          chunks += result.chunks;
        } catch (err) {
          toast.error(`Errore su ${name}: ${err instanceof Error ? err.message : "Errore sconosciuto."}`);
          return;
        }
      }

      toast.success(
        `Ingestion completata: ${files.length} file, ${inserted} nuovi chunk, ${skipped} duplicati saltati, ${chunks} chunk processati.`
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore durante l’ingest.");
    } finally {
      setAllRunning(false);
      setCurrentFile(null);
      setFileIndex(0);
      setTotalFiles(0);
      setChunkDone(0);
      setChunkTotal(0);
    }
  }

  async function runIngestBase() {
    setBaseRunning(true);
    setCurrentFile("manuale_base.txt");
    setProgressPct(0);
    setChunkDone(0);
    setChunkTotal(0);
    try {
      const result = await ingestOneFileBatched(
        "manuale_base.txt",
        { source: "Manuale Giocatore" },
        0,
        1
      );
      toast.success(
        `Ingestion completata: ${result.inserted} nuovi chunk, ${result.skipped} duplicati saltati, su ${result.chunks} chunk totali.`
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore durante l’ingest.");
    } finally {
      setBaseRunning(false);
      setCurrentFile(null);
      setProgressPct(0);
      setChunkDone(0);
      setChunkTotal(0);
    }
  }

  return (
    <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
      <div className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm text-barber-paper/80">
            File target: <code>manuale_base.txt</code> — metadata:{" "}
            <code>{`{ source: "Manuale Giocatore" }`}</code>
          </p>
          <Button
            type="button"
            disabled={baseRunning || allRunning}
            className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
            onClick={() => void runIngestBase()}
          >
            {baseRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Elaborazione…
              </>
            ) : (
              "Elabora Manuale di Base.txt"
            )}
          </Button>
        </div>

        <div className="space-y-3 border-t border-barber-gold/20 pt-4">
          <p className="text-sm text-barber-paper/80">
            Esegue ingest v3 strutturato su tutti i file <code>.txt</code> in <code>public/manuals</code> (uno
            dopo l’altro). La barra avanza a ogni gruppo di chunk embedding, non solo a fine file.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={allRunning || baseRunning}
            className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
            onClick={() => void runIngestAll()}
          >
            {allRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ingest in corso…
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                Elabora tutti i manuali .txt
              </>
            )}
          </Button>

          {allRunning && totalFiles === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-barber-gold/20 bg-barber-dark/90 p-3 text-xs text-barber-paper/75">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-barber-gold" />
              Lettura elenco file in <code className="text-barber-paper/90">public/manuals</code>…
            </div>
          )}

          {allRunning && totalFiles > 0 && (
            <div className="space-y-2 rounded-lg border border-barber-gold/20 bg-barber-dark/90 p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-barber-paper/75">
                <span className="flex min-w-0 items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-barber-gold" />
                  <span className="truncate">
                    Manuale {fileIndex}/{totalFiles}
                    {currentFile ? (
                      <>
                        : <span className="font-medium text-barber-paper">{currentFile}</span>
                      </>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-barber-gold/90">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2" />
              {chunkTotal > 0 && (
                <p className="text-[11px] tabular-nums text-barber-paper/65">
                  Chunk embedding: {chunkDone}/{chunkTotal}
                </p>
              )}
              <p className="text-[11px] leading-snug text-barber-paper/50">
                Il primo manuale (es. <code className="text-barber-paper/70">manuale_base.txt</code>) ha
                migliaia di chunk: è normale che impieghi molto tempo; controlla anche il terminale{" "}
                <code className="text-barber-paper/70">npm run dev</code> per errori API (HF rate limit,
                chiave mancante).
              </p>
            </div>
          )}
        </div>

        {baseRunning && !allRunning && (
          <div className="space-y-2 rounded-lg border border-barber-gold/20 bg-barber-dark/90 p-3">
            <div
              className={cn("flex items-center gap-2", "text-xs text-barber-paper/75")}
            >
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-barber-gold" />
              <span>
                Elaborazione: <span className="font-medium text-barber-paper">manuale_base.txt</span>
              </span>
            </div>
            {chunkTotal > 0 && (
              <>
                <Progress value={progressPct} className="h-2" />
                <p className="text-[11px] tabular-nums text-barber-paper/65">
                  Chunk embedding: {chunkDone}/{chunkTotal}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
