"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ingestMdManualBatchAction } from "@/lib/actions/ingest-manuals";
import { cn } from "@/lib/utils";

const PLAYER_HANDBOOK_MD = "manuale_giocatore.md";
const MONSTER_MANUAL_MD = "manuale mostri.md";
/** Nome esatto del file in `public/manuals/` (spazi e maiuscole). */
const MOSTRI_MULTIVERSO_MD = "Mostri del multiverso.md";
const EBERRON_MD = "eberron.md";
const TASHA_MD = "Tasha.md";
const XANATHAR_MD = "xanathar.md";
const CHUNK_BATCH = 16;

function combinedPercent(fileIdx0: number, totalFiles: number, doneInFile: number, chunksInFile: number) {
  if (totalFiles <= 0) return 0;
  const fracFile = chunksInFile > 0 ? Math.min(1, doneInFile / chunksInFile) : 1;
  return Math.min(100, Math.round(((fileIdx0 + fracFile) / totalFiles) * 100));
}

export function ManualV4IngestControls() {
  const [playerRunning, setPlayerRunning] = useState(false);
  const [monsterRunning, setMonsterRunning] = useState(false);
  const [multiverseRunning, setMultiverseRunning] = useState(false);
  const [eberronRunning, setEberronRunning] = useState(false);
  const [tashaRunning, setTashaRunning] = useState(false);
  const [xanatharRunning, setXanatharRunning] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [chunkDone, setChunkDone] = useState(0);
  const [chunkTotal, setChunkTotal] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const busy =
    playerRunning ||
    monsterRunning ||
    multiverseRunning ||
    eberronRunning ||
    tashaRunning ||
    xanatharRunning;

  async function ingestOneMdFileBatched(
    name: string,
    metadata: Record<string, unknown>
  ): Promise<{ inserted: number; skipped: number; chunks: number }> {
    let next = 0;
    let totalChunks = 0;
    let inserted = 0;
    let skipped = 0;
    setChunkDone(0);
    setChunkTotal(0);

    for (;;) {
      const batch = await ingestMdManualBatchAction(name, metadata, next, CHUNK_BATCH);
      if (batch == null || typeof batch !== "object" || typeof batch.success !== "boolean") {
        throw new Error(
          "Risposta ingest assente o non valida dal server. Riavvia `npm run dev` e riprova (Server Actions / timeout)."
        );
      }
      if (!batch.success) {
        throw new Error(batch.message);
      }
      totalChunks = batch.totalChunks;
      inserted += batch.inserted;
      skipped += batch.skipped;
      next = batch.nextIndex;
      setChunkTotal(totalChunks);
      setChunkDone(Math.min(next, totalChunks));
      setProgressPct(combinedPercent(0, 1, Math.min(next, totalChunks), totalChunks));

      if (batch.done) break;
    }

    return { inserted, skipped, chunks: totalChunks };
  }

  async function runPlayerV4() {
    setPlayerRunning(true);
    setProgressPct(0);
    setChunkDone(0);
    setChunkTotal(0);
    setCurrentFile(PLAYER_HANDBOOK_MD);
    try {
      const result = await ingestOneMdFileBatched(PLAYER_HANDBOOK_MD, {
        source: "Manuale del Giocatore (MD)",
        source_type: "md-manual",
        manual_book_key: "player_handbook",
        ingest_profile: "v4-section",
        macro_category: "Manuale completo",
      });
      toast.success(
        `Ingest v4: ${result.inserted} nuovi chunk (1 per ogni ##), ${result.skipped} duplicati, ${result.chunks} sezioni.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore ingest v4 manuale giocatore.");
    } finally {
      setPlayerRunning(false);
      setCurrentFile(null);
      setProgressPct(0);
      setChunkDone(0);
      setChunkTotal(0);
    }
  }

  async function runEberronV4() {
    setEberronRunning(true);
    setProgressPct(0);
    setChunkDone(0);
    setChunkTotal(0);
    setCurrentFile(EBERRON_MD);
    try {
      const result = await ingestOneMdFileBatched(EBERRON_MD, {
        source: "Eberron — Rinascita dopo l'Ultima Guerra",
        source_type: "md-manual",
        manual_book_key: "eberron",
        rules_origin: "eberron",
        campaign_setting: "eberron",
        ingest_profile: "v4-section",
        macro_category: "Espansione ambientazione (razze, classi, marchi, Sharn…)",
      });
      toast.success(
        `Eberron (v4): ${result.inserted} chunk, ${result.skipped} saltati, ${result.chunks} sezioni (##). Ogni chunk è taggato in DB e nel testo.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore ingest Eberron.");
    } finally {
      setEberronRunning(false);
      setCurrentFile(null);
      setProgressPct(0);
      setChunkDone(0);
      setChunkTotal(0);
    }
  }

  async function runTashaV4() {
    setTashaRunning(true);
    setProgressPct(0);
    setChunkDone(0);
    setChunkTotal(0);
    setCurrentFile(TASHA_MD);
    try {
      const result = await ingestOneMdFileBatched(TASHA_MD, {
        source: "Calderone omnicomprensivo di Tasha",
        source_type: "md-manual",
        manual_book_key: "tasha",
        rules_origin: "tasha",
        campaign_setting: "tasha",
        ingest_profile: "v4-section",
        macro_category: "Espansione — opzioni PG, incantesimi, oggetti, strumenti DM",
      });
      toast.success(
        `Tasha (v4): ${result.inserted} chunk, ${result.skipped} saltati, ${result.chunks} sezioni (##). Tag nel testo e in metadata.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore ingest Tasha.");
    } finally {
      setTashaRunning(false);
      setCurrentFile(null);
      setProgressPct(0);
      setChunkDone(0);
      setChunkTotal(0);
    }
  }

  async function runXanatharV4() {
    setXanatharRunning(true);
    setProgressPct(0);
    setChunkDone(0);
    setChunkTotal(0);
    setCurrentFile(XANATHAR_MD);
    try {
      const result = await ingestOneMdFileBatched(XANATHAR_MD, {
        source: "Guida omnicomprensiva di Xanathar",
        source_type: "md-manual",
        manual_book_key: "xanathar",
        rules_origin: "xanathar",
        campaign_setting: "xanathar",
        ingest_profile: "v4-section",
        macro_category: "Espansione — sottoclassi, incantesimi, strumenti al DM",
      });
      toast.success(
        `Xanathar (v4): ${result.inserted} chunk, ${result.skipped} saltati, ${result.chunks} sezioni (##). Tag nel testo e in metadata.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore ingest Xanathar.");
    } finally {
      setXanatharRunning(false);
      setCurrentFile(null);
      setProgressPct(0);
      setChunkDone(0);
      setChunkTotal(0);
    }
  }

  async function runMultiverseV4() {
    setMultiverseRunning(true);
    setProgressPct(0);
    setChunkDone(0);
    setChunkTotal(0);
    setCurrentFile(MOSTRI_MULTIVERSO_MD);
    try {
      const result = await ingestOneMdFileBatched(MOSTRI_MULTIVERSO_MD, {
        source: "Mordenkainen presenta: Mostri del Multiverso",
        source_type: "md-manual",
        manual_book_key: "mordenkainen_multiverse",
        macro_category: "Razze giocabili e bestiario",
        ingest_profile: "v4-mordenkainen-multiverse",
      });
      toast.success(
        `Mostri del Multiverso (v4): ${result.inserted} chunk, ${result.skipped} saltati, ${result.chunks} unità indicizzate.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore ingest Mostri del Multiverso.");
    } finally {
      setMultiverseRunning(false);
      setCurrentFile(null);
      setProgressPct(0);
      setChunkDone(0);
      setChunkTotal(0);
    }
  }

  async function runMonsterV4() {
    setMonsterRunning(true);
    setProgressPct(0);
    setChunkDone(0);
    setChunkTotal(0);
    setCurrentFile(MONSTER_MANUAL_MD);
    try {
      const result = await ingestOneMdFileBatched(MONSTER_MANUAL_MD, {
        source: "Manuale dei Mostri",
        source_type: "md-manual",
        manual_book_key: "monster_manual",
        macro_category: "Bestiario e regole mostro",
        ingest_profile: "v4-monster-manual",
      });
      toast.success(
        `Manuale mostri (v4 indice): ${result.inserted} chunk, ${result.skipped} saltati, ${result.chunks} unità.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore ingest manuale mostri.");
    } finally {
      setMonsterRunning(false);
      setCurrentFile(null);
      setProgressPct(0);
      setChunkDone(0);
      setChunkTotal(0);
    }
  }

  return (
    <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
      <div className="space-y-4">
        <p className="text-sm text-barber-paper/80">
          File in <code className="text-barber-paper/90">public/manuals/</code> —{" "}
          <code className="text-cyan-200/80">v4-section</code> (giocatore),{" "}
          <code className="text-amber-200/80">v4-monster-manual</code> (MM),{" "}
          <code className="text-violet-200/80">v4-mordenkainen-multiverse</code> (MPM),{" "}
          <code className="text-emerald-200/80">tag Eberron</code> ({EBERRON_MD}),{" "}
          <code className="text-rose-200/80">tag Tasha</code> ({TASHA_MD}),{" "}
          <code className="text-sky-200/80">tag Xanathar</code> ({XANATHAR_MD}).
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy}
            className="border-2 border-cyan-500/50 bg-barber-dark/90 text-cyan-50 hover:bg-cyan-950/40"
            onClick={() => void runPlayerV4()}
          >
            {playerRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {PLAYER_HANDBOOK_MD}…
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4 text-cyan-400" />
                Ingest v4 — {PLAYER_HANDBOOK_MD}
              </>
            )}
          </Button>
          <Button
            type="button"
            disabled={busy}
            className="border border-amber-500/50 bg-amber-950/50 text-amber-50 hover:bg-amber-900/50"
            onClick={() => void runMonsterV4()}
          >
            {monsterRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {MONSTER_MANUAL_MD}…
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4 text-amber-400" />
                Ingest v4 — {MONSTER_MANUAL_MD}
              </>
            )}
          </Button>
          <Button
            type="button"
            disabled={busy}
            className="border border-violet-500/45 bg-violet-950/40 text-violet-100 hover:bg-violet-900/45"
            onClick={() => void runMultiverseV4()}
          >
            {multiverseRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {MOSTRI_MULTIVERSO_MD}…
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4 text-violet-300" />
                Ingest v4 — {MOSTRI_MULTIVERSO_MD}
              </>
            )}
          </Button>
          <Button
            type="button"
            disabled={busy}
            className="border border-emerald-600/50 bg-emerald-950/45 text-emerald-50 hover:bg-emerald-900/45"
            onClick={() => void runEberronV4()}
          >
            {eberronRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {EBERRON_MD}…
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4 text-emerald-300" />
                Ingest v4 — {EBERRON_MD} (tag Eberron)
              </>
            )}
          </Button>
          <Button
            type="button"
            disabled={busy}
            className="border border-rose-500/45 bg-rose-950/35 text-rose-50 hover:bg-rose-900/40"
            onClick={() => void runTashaV4()}
          >
            {tashaRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {TASHA_MD}…
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4 text-rose-300" />
                Ingest v4 — {TASHA_MD} (tag Tasha)
              </>
            )}
          </Button>
          <Button
            type="button"
            disabled={busy}
            className="border border-sky-500/45 bg-sky-950/35 text-sky-50 hover:bg-sky-900/40"
            onClick={() => void runXanatharV4()}
          >
            {xanatharRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {XANATHAR_MD}…
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4 text-sky-300" />
                Ingest v4 — {XANATHAR_MD} (tag Xanathar)
              </>
            )}
          </Button>
        </div>

        {busy && (
          <div
            className={cn(
              "space-y-2 rounded-lg border bg-barber-dark/90 p-3 text-xs text-barber-paper/75",
              playerRunning
                ? "border-cyan-500/25"
                : eberronRunning
                  ? "border-emerald-500/25"
                  : tashaRunning
                    ? "border-rose-500/25"
                    : xanatharRunning
                      ? "border-sky-500/25"
                      : multiverseRunning
                        ? "border-violet-500/25"
                        : "border-amber-500/25"
            )}
          >
            <div className="flex items-center gap-2">
              <Loader2
                className={cn(
                  "h-3.5 w-3.5 shrink-0 animate-spin",
                  playerRunning
                    ? "text-cyan-400"
                    : eberronRunning
                      ? "text-emerald-400"
                      : tashaRunning
                        ? "text-rose-400"
                        : xanatharRunning
                          ? "text-sky-400"
                          : multiverseRunning
                            ? "text-violet-400"
                            : "text-amber-400"
                )}
              />
              <span className="truncate font-medium text-barber-paper">{currentFile}</span>
            </div>
            {chunkTotal > 0 && (
              <>
                <Progress value={progressPct} className="h-2" />
                <p className="text-[11px] tabular-nums text-barber-paper/65">
                  Chunk: {chunkDone}/{chunkTotal} · {progressPct}%
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
