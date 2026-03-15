"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, FileJson, CheckCircle2, AlertCircle } from "lucide-react";

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
import { bulkImportWiki, type BulkImportWikiItem } from "@/app/campaigns/wiki-actions";

const VALID_CATEGORIES = ["npc", "monster", "location", "item", "lore"] as const;

/** Normalizza hp, ac, gs, exp: accetta number o string, restituisce undefined se assente/non valido. */
function optNumOrStr(v: unknown): number | string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return undefined;
}

const EXAMPLE_JSON = `[
  { "title": "Re degli Elfi", "category": "npc", "content": "Il sovrano del *Bosco Eterno*.", "is_secret": false, "hp": "45", "ac": 14 },
  { "title": "Goblin Scout", "category": "monster", "content": "AC 13, PF 7.", "is_secret": true, "hp": 7, "ac": 13, "gs": "1/4", "exp": 50 }
]`;

function parseAndValidate(raw: string): { ok: true; items: BulkImportWikiItem[] } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: "JSON non valido. Controlla virgole, virgolette e parentesi." };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Il JSON deve essere un array di oggetti." };
  }

  const items: BulkImportWikiItem[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i];
    if (row == null || typeof row !== "object") {
      return { ok: false, error: `Voce ${i + 1}: deve essere un oggetto.` };
    }

    const title = typeof (row as Record<string, unknown>).title === "string"
      ? (row as Record<string, unknown>).title as string
      : String((row as Record<string, unknown>).title ?? "").trim();
    const categoryRaw = typeof (row as Record<string, unknown>).category === "string"
      ? ((row as Record<string, unknown>).category as string).trim().toLowerCase()
      : "";
    const content = typeof (row as Record<string, unknown>).content === "string"
      ? (row as Record<string, unknown>).content as string
      : String((row as Record<string, unknown>).content ?? "");
    const isSecret = (row as Record<string, unknown>).is_secret === true;
    const r = row as Record<string, unknown>;
    const hp = optNumOrStr(r.hp);
    const ac = optNumOrStr(r.ac);
    const gs = optNumOrStr(r.gs);
    const exp = optNumOrStr(r.exp);

    if (!title) {
      return { ok: false, error: `Voce ${i + 1}: il campo "title" è obbligatorio e non vuoto.` };
    }
    if (!VALID_CATEGORIES.includes(categoryRaw as (typeof VALID_CATEGORIES)[number])) {
      return {
        ok: false,
        error: `Voce "${title}": "category" deve essere uno di: npc, monster, location, item, lore.`,
      };
    }

    const item: BulkImportWikiItem = {
      title,
      category: categoryRaw as (typeof VALID_CATEGORIES)[number],
      content,
      is_secret: isSecret,
    };
    if (hp !== undefined) item.hp = hp;
    if (ac !== undefined) item.ac = ac;
    if (gs !== undefined) item.gs = gs;
    if (exp !== undefined) item.exp = exp;
    items.push(item);
  }

  if (items.length === 0) {
    return { ok: false, error: "L'array non contiene voci valide." };
  }

  return { ok: true, items };
}

type BulkImportWikiDialogProps = {
  campaignId: string;
};

export function BulkImportWikiDialog({ campaignId }: BulkImportWikiDialogProps) {
  const [open, setOpen] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [parsedItems, setParsedItems] = useState<BulkImportWikiItem[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAnalyze() {
    setParseError(null);
    setParsedItems(null);
    const result = parseAndValidate(rawJson.trim());
    if (result.ok) {
      setParsedItems(result.items);
    } else {
      setParseError(result.error);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
      const result = await bulkImportWiki(campaignId, parsedItems);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setRawJson("");
        setParsedItems(null);
        setParseError(null);
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
          className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
        >
          <Upload className="mr-2 h-4 w-4" />
          Importazione massiva
        </Button>
      </DialogTrigger>
      <DialogContent className="border-barber-gold/30 bg-barber-dark text-barber-paper max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importazione massiva Wiki</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Incolla un array JSON o carica un file .json con le voci da importare nella campagna.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-barber-gold/90 font-medium">Formato atteso (array di oggetti):</p>
          <pre className="rounded-lg border border-barber-gold/20 bg-barber-dark/80 p-3 text-xs text-barber-paper/80 overflow-x-auto whitespace-pre-wrap">
            {`[{ "title": "Nome", "category": "npc|monster|location|item|lore", "content": "Testo markdown...", "is_secret": true|false }]`}
          </pre>
          <p className="text-xs text-barber-paper/60">
            Per le categorie <strong>monster</strong> e <strong>npc</strong> puoi includere i campi opzionali:{" "}
            <code className="rounded bg-barber-dark/80 px-1">hp</code> (Punti vita),{" "}
            <code className="rounded bg-barber-dark/80 px-1">ac</code> (Classe Armatura),{" "}
            <code className="rounded bg-barber-dark/80 px-1">gs</code> (Grado di Sfida),{" "}
            <code className="rounded bg-barber-dark/80 px-1">exp</code> (Punti Esperienza; solo mostri). Valori numerici o testuali.
          </p>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-barber-gold/30 text-barber-paper/90"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileJson className="mr-2 h-4 w-4" />
              Carica file .json
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-import-json">JSON (incolla qui o carica file)</Label>
            <Textarea
              id="bulk-import-json"
              value={rawJson}
              onChange={(e) => {
                setRawJson(e.target.value);
                setParseError(null);
                setParsedItems(null);
              }}
              placeholder={EXAMPLE_JSON}
              className="min-h-[200px] font-mono text-sm bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/40"
              disabled={isImporting}
            />
          </div>

          {parseError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedItems && parsedItems.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-3 text-sm text-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>Trovate {parsedItems.length} voci pronte per l&apos;importazione.</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleAnalyze}
            disabled={!rawJson.trim() || isImporting}
            className="border-barber-gold/40 text-barber-paper"
          >
            Analizza JSON
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!parsedItems?.length || isImporting}
            className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
          >
            {isImporting ? "Importazione..." : "Importa nel Database"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
