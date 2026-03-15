"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCampaignPrimer, type PrimerTypography } from "@/app/campaigns/actions";
import {
  BookOpen,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  Link as LinkIcon,
  Type,
} from "lucide-react";

type CampaignPrimerEditorProps = {
  campaignId: string;
  initialPlayerPrimer: string | null;
  initialTypography?: PrimerTypography | null;
};

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string = ""
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end);

  const newText = text.slice(0, start) + before + selected + after + text.slice(end);
  textarea.value = newText;
  textarea.focus();
  const newCursor = start + before.length + selected.length;
  textarea.setSelectionRange(newCursor, newCursor);
  return newText;
}

export function CampaignPrimerEditor({
  campaignId,
  initialPlayerPrimer,
  initialTypography,
}: CampaignPrimerEditorProps) {
  const [value, setValue] = useState(initialPlayerPrimer ?? "");
  const [typography, setTypography] = useState<PrimerTypography>({
    fontSize: (initialTypography?.fontSize as "small" | "medium" | "large") ?? "medium",
    fontFamily: (initialTypography?.fontFamily as "serif" | "sans") ?? "serif",
  });
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = useCallback(
    (before: string, after: string = "") => {
      const ta = textareaRef.current;
      if (!ta) return;
      const newValue = insertAtCursor(ta, before, after);
      setValue(newValue);
    },
    []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCampaignPrimer(campaignId, value, typography);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="rounded-lg border border-violet-600/30 bg-violet-950/30 p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-200">
        <BookOpen className="h-4 w-4" />
        Guida del Giocatore (Bibbia)
      </h3>
      <p className="mb-4 text-xs text-violet-200/70">
        Testo pubblico per tutti i membri della campagna: razze, fazioni, regole di casa. I giocatori
        lo leggono dalla dashboard campagna tramite &quot;Leggi la Guida del Giocatore&quot;.
      </p>
      <p className="mb-3 text-xs text-barber-gold/90">
        Usa il Markdown (<code className="rounded bg-barber-dark/80 px-1">## Titolo</code>) per
        creare automaticamente l&apos;indice per i giocatori. Oppure usa la barra sotto per
        grassetto, corsivo, titoli e elenchi.
      </p>

      {/* Toolbar formattazione Markdown */}
      <div className="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-barber-gold/20 bg-barber-dark/60 p-2">
        <span className="mr-2 text-xs text-barber-paper/60">Inserisci:</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-barber-paper/80 hover:text-barber-gold"
          onClick={() => applyFormat("**", "**")}
          title="Grassetto"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-barber-paper/80 hover:text-barber-gold"
          onClick={() => applyFormat("*", "*")}
          title="Corsivo"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-barber-paper/80 hover:text-barber-gold"
          onClick={() => applyFormat("## ", "")}
          title="Titolo 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-barber-paper/80 hover:text-barber-gold"
          onClick={() => applyFormat("### ", "")}
          title="Titolo 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-barber-paper/80 hover:text-barber-gold"
          onClick={() => applyFormat("- ", "")}
          title="Elenco puntato"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-barber-paper/80 hover:text-barber-gold"
          onClick={() => applyFormat("[", "](url)")}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Impostazioni impaginazione */}
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-lg border border-barber-gold/20 bg-barber-dark/60 p-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-violet-200">
          <Type className="h-3.5 w-3.5" />
          Impaginazione
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="primer-font-size" className="text-xs text-barber-paper/70">
            Dimensione
          </Label>
          <Select
            value={typography.fontSize ?? "medium"}
            onValueChange={(v) =>
              setTypography((prev) => ({ ...prev, fontSize: v as "small" | "medium" | "large" }))
            }
            disabled={isPending}
          >
            <SelectTrigger
              id="primer-font-size"
              className="h-8 w-[120px] border-barber-gold/30 bg-barber-dark/80 text-barber-paper text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-barber-gold/20 bg-barber-dark">
              <SelectItem value="small" className="text-barber-paper">
                Piccola
              </SelectItem>
              <SelectItem value="medium" className="text-barber-paper">
                Normale
              </SelectItem>
              <SelectItem value="large" className="text-barber-paper">
                Grande
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="primer-font-family" className="text-xs text-barber-paper/70">
            Carattere
          </Label>
          <Select
            value={typography.fontFamily ?? "serif"}
            onValueChange={(v) =>
              setTypography((prev) => ({ ...prev, fontFamily: v as "serif" | "sans" }))
            }
            disabled={isPending}
          >
            <SelectTrigger
              id="primer-font-family"
              className="h-8 w-[120px] border-barber-gold/30 bg-barber-dark/80 text-barber-paper text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-barber-gold/20 bg-barber-dark">
              <SelectItem value="serif" className="text-barber-paper font-serif">
                Serif
              </SelectItem>
              <SelectItem value="sans" className="text-barber-paper">
                Sans-serif
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Label htmlFor="campaign-primer-bibbia" className="sr-only">
          Contenuto Bibbia di Campagna
        </Label>
        <Textarea
          ref={textareaRef}
          id="campaign-primer-bibbia"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="## Razze giocabili&#10;...&#10;&#10;## Fazioni&#10;...&#10;&#10;## Regole di casa&#10;..."
          className="min-h-[280px] w-full resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50 font-mono text-sm"
          disabled={isPending}
        />
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className="border-violet-500/50 bg-violet-500/20 text-violet-200 hover:bg-violet-500/30"
        >
          {isPending ? "Salvataggio..." : "Salva Guida del Giocatore"}
        </Button>
      </form>
    </div>
  );
}
