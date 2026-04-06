"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FileJson, Upload, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bulkImportMissionsAction } from "@/lib/actions/mission-actions";
import {
  MISSION_BULK_IMPORT_JSON_EXAMPLE,
  parseMissionBulkImportJson,
  type BulkMissionImportItem,
} from "@/lib/missions/mission-bulk-import";

type BulkImportMissionsDialogProps = {
  campaignId: string;
};

export function BulkImportMissionsDialog({ campaignId }: BulkImportMissionsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [parsedItems, setParsedItems] = useState<BulkMissionImportItem[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAnalyze() {
    setParseError(null);
    setParsedItems(null);
    const result = parseMissionBulkImportJson(rawJson.trim());
    if (result.ok) {
      setParsedItems(result.items);
    } else {
      setParseError(result.error);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setRawJson(text);
      setParseError(null);
      setParsedItems(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleImport() {
    if (!parsedItems?.length) return;
    setIsImporting(true);
    try {
      const result = await bulkImportMissionsAction(campaignId, parsedItems);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setRawJson("");
        setParsedItems(null);
        setParseError(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Errore durante l'importazione.");
    } finally {
      setIsImporting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setParseError(null);
      setParsedItems(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-amber-500/40 text-zinc-200 hover:bg-amber-500/10"
        >
          <Upload className="mr-2 h-4 w-4" />
          Importa da JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-amber-600/30 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-amber-100">Importazione massiva missioni</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Solo amministratori. Incolla JSON o carica un file: le missioni vengono aggiunte come disponibili (aperte),
            senza completamento o tesoretto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs font-medium text-amber-200/90">Formato atteso</p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-amber-600/20 bg-black/40 p-3 text-xs text-zinc-300">
            {MISSION_BULK_IMPORT_JSON_EXAMPLE}
          </pre>
          <p className="text-xs text-zinc-500">
            Accettato anche un semplice array alla radice, ad es.{" "}
            <code className="rounded bg-zinc-900 px-1">{`[ { "title": "..." }, ... ]`}</code>. Campo opzionale:{" "}
            <code className="rounded bg-zinc-900 px-1">points_reward</code> (numero intero, default 0). Il campo{" "}
            <code className="rounded bg-zinc-900 px-1">version</code> è solo documentazione per l&apos;AI e viene
            ignorato dal parser.
          </p>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-600/40 text-zinc-200"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileJson className="mr-2 h-4 w-4" />
              Carica file .json
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-missions-json">JSON</Label>
            <Textarea
              id="bulk-missions-json"
              value={rawJson}
              onChange={(e) => {
                setRawJson(e.target.value);
                setParseError(null);
                setParsedItems(null);
              }}
              placeholder={MISSION_BULK_IMPORT_JSON_EXAMPLE}
              className="min-h-[180px] border-amber-600/25 bg-zinc-950/80 font-mono text-sm text-zinc-100 placeholder:text-zinc-600"
              disabled={isImporting}
            />
          </div>

          {parseError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedItems && parsedItems.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-950/25 p-3 text-sm text-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{parsedItems.length} missioni pronte per l&apos;importazione.</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleAnalyze}
            disabled={!rawJson.trim() || isImporting}
            className="border-amber-500/40 text-zinc-200"
          >
            Analizza JSON
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!parsedItems?.length || isImporting}
            className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
          >
            {isImporting ? "Importazione..." : "Importa missioni"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
