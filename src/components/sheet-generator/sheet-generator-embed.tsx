"use client";

import { useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateSheetAction, previewBuildChoicesAction } from "@/lib/actions/generator-actions";
import { BACKGROUND_OPTIONS, CLASS_OPTIONS, RACE_OPTIONS } from "@/lib/character-build-catalog";
import { subclassCatalogSourceSuffix, supplementSubclassesForClass } from "@/lib/character-subclass-catalog";
import { GeneratedSheetView } from "@/components/sheet-generator/generated-sheet-view";
import { SheetBuildChoicesPanel } from "@/components/sheet-generator/sheet-build-choices-panel";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { BuildChoicesPreview, CharacterBuildOverrides } from "@/lib/sheet-generator/build-choices-types";
import type { GeneratedCharacterSheet } from "@/lib/sheet-generator/types";
import type { QuickManualSection } from "@/lib/sheet-generator/quick-manual-builder";
import { mapGeneratorFormToCharacterBuildDraft } from "@/lib/character-sheet-build-meta";
import { spellcastingMetaFromGeneratedSheet } from "@/lib/sheet-generator/spell-slots";
import { buildCompiledSheetPdfRequestBody } from "@/lib/sheet-generator/sheet-pdf-payload";
import { arrayBufferToBase64 } from "@/lib/utils/array-buffer-base64";
import type { CharacterGeneratedSheetPayload } from "@/modules/command-center/ai-control-plane/draft-assistant.types";

export type SheetGeneratorEmbedInitial = {
  characterName?: string;
  characterStory?: string;
  includeBackgroundStoryInPdf?: boolean;
  torneoMode?: boolean;
};

type SheetGeneratorEmbedProps = {
  initial: SheetGeneratorEmbedInitial;
  sheetReady?: boolean;
  onSheetReady: (payload: CharacterGeneratedSheetPayload) => void;
};

export function SheetGeneratorEmbed({ initial, sheetReady = false, onSheetReady }: SheetGeneratorEmbedProps) {
  const [isPending, startTransition] = useTransition();
  const [isSavingSheet, setIsSavingSheet] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedRaceSlug, setSelectedRaceSlug] = useState("");
  const [characterStory, setCharacterStory] = useState(initial.characterStory ?? "");
  const [includeBackgroundStoryInPdf, setIncludeBackgroundStoryInPdf] = useState(
    initial.includeBackgroundStoryInPdf ?? true
  );
  const [formLevel, setFormLevel] = useState(1);
  const [phase, setPhase] = useState<"form" | "choices" | "done">("form");
  const [choicesPreview, setChoicesPreview] = useState<BuildChoicesPreview | null>(null);
  const [buildOverrides, setBuildOverrides] = useState<CharacterBuildOverrides | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sheet, setSheet] = useState<GeneratedCharacterSheet | null>(null);
  const [sheetDataObj, setSheetDataObj] = useState<Record<string, unknown> | null>(null);
  const [quickManualSections, setQuickManualSections] = useState<QuickManualSection[]>([]);
  const [backgroundPdfSections, setBackgroundPdfSections] = useState<QuickManualSection[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const race = RACE_OPTIONS.find((r) => r.slug === selectedRaceSlug) ?? null;
  const classSubclasses = supplementSubclassesForClass(selectedClass);

  async function runGenerateSheet(formData: FormData, overrides?: CharacterBuildOverrides | null) {
    if (overrides && Object.keys(overrides).length > 0) {
      formData.set("buildOverridesJson", JSON.stringify(overrides));
    } else {
      formData.delete("buildOverridesJson");
    }

    setResultMessage(null);
    setWarnings([]);
    setSheet(null);
    setSheetDataObj(null);

    const result = await generateSheetAction(formData);
    setResultMessage(result.message);
    setWarnings(result.warnings ?? []);
    if (result.success && result.sheet) setSheet(result.sheet);
    if (result.success && result.sheetData) {
      setSheetDataObj(result.sheetData);
      setQuickManualSections(result.quickManualSections ?? []);
      setBackgroundPdfSections(result.backgroundPdfSections ?? []);
      setIncludeBackgroundStoryInPdf(!!result.includeBackgroundStoryInPdf);
      if (result.characterStory != null) setCharacterStory(result.characterStory);
      setPhase("done");
    }
    return result;
  }

  async function handleUseSheet() {
    if (!sheetDataObj || !sheet || !formRef.current) {
      toast.error("Genera prima la scheda.");
      return;
    }
    setIsSavingSheet(true);
    try {
      const pdfRes = await fetch("/api/sheet-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildCompiledSheetPdfRequestBody({
            sheetData: sheetDataObj,
            sheet,
            quickManualSections,
            backgroundPdfSections,
            includeBackgroundStoryInPdf,
            characterStory,
          })
        ),
      });
      if (!pdfRes.ok) {
        const err = await pdfRes.json().catch(() => ({}));
        toast.error((err as { error?: string })?.error ?? "Errore generazione PDF.");
        return;
      }
      const ab = await pdfRes.arrayBuffer();
      const base64 = arrayBufferToBase64(ab);
      const buildDraft = mapGeneratorFormToCharacterBuildDraft(formRef.current, sheet);
      const payload: CharacterGeneratedSheetPayload = {
        pdfBase64: base64,
        fileName: `${sheet.characterName || "scheda"}-compilata.pdf`,
        armorClass: sheet.armorClass,
        hitPoints: sheet.hpMax,
        sheetData: sheetDataObj,
        quickManualSections,
        backgroundPdfSections,
        includeBackgroundStoryInPdf,
        characterStory,
        spellcasting: spellcastingMetaFromGeneratedSheet(sheet),
        build: {
          race_slug: buildDraft.race_slug ?? "",
          subclass_slug: buildDraft.subclass_slug ?? "",
          character_class: buildDraft.character_class ?? "",
          class_subclass: buildDraft.class_subclass ?? "",
          background_slug: buildDraft.background_slug ?? "",
          level: buildDraft.level ?? "1",
        },
        characterName: sheet.characterName,
      };
      onSheetReady(payload);
      toast.success("Scheda collegata alla proposta.");
    } catch {
      toast.error("Errore durante il salvataggio della scheda.");
    } finally {
      setIsSavingSheet(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("characterStory", characterStory);
    const levelRaw = (formData.get("level") as string | null)?.trim() ?? "1";
    setFormLevel(Number.parseInt(levelRaw, 10) || 1);

    startTransition(async () => {
      const previewResult = await previewBuildChoicesAction(formData);
      if (!previewResult.success) {
        setResultMessage(previewResult.message);
        return;
      }
      if (previewResult.preview?.slots.length) {
        setChoicesPreview(previewResult.preview);
        setBuildOverrides(previewResult.preview.overrides);
        setPhase("choices");
        setResultMessage(previewResult.message);
        setSheet(null);
        setSheetDataObj(null);
        return;
      }
      await runGenerateSheet(formData, null);
    });
  }

  function handleConfirmChoices() {
    if (!formRef.current || isPending) return;
    const formData = new FormData(formRef.current);
    formData.set("characterStory", characterStory);
    startTransition(async () => {
      await runGenerateSheet(formData, buildOverrides);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-barber-gold/80">
          <Sparkles className="h-3.5 w-3.5" />
          Generatore scheda PDF
        </p>
        {sheetReady ? (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
            Scheda collegata
          </span>
        ) : null}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="embed-characterName" className="text-xs text-barber-paper/80">
              Nome
            </label>
            <input
              id="embed-characterName"
              name="characterName"
              required
              defaultValue={initial.characterName ?? ""}
              disabled={isPending}
              className="h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-2 text-sm text-barber-paper"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="embed-raceSlug" className="text-xs text-barber-paper/80">
              Razza
            </label>
            <select
              id="embed-raceSlug"
              name="raceSlug"
              required
              disabled={isPending}
              onChange={(e) => setSelectedRaceSlug(e.target.value)}
              className="h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-2 text-sm text-barber-paper"
            >
              <option value="" disabled>
                Razza
              </option>
              {RACE_OPTIONS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="embed-subraceSlug" className="text-xs text-barber-paper/80">
              Sottorazza
            </label>
            <select
              id="embed-subraceSlug"
              name="subraceSlug"
              disabled={isPending || !race?.subraces?.length}
              className="h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-2 text-sm text-barber-paper"
            >
              <option value="">—</option>
              {(race?.subraces ?? []).map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="embed-classLabel" className="text-xs text-barber-paper/80">
              Classe
            </label>
            <select
              id="embed-classLabel"
              name="classLabel"
              required
              disabled={isPending}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-2 text-sm text-barber-paper"
            >
              <option value="" disabled>
                Classe
              </option>
              {CLASS_OPTIONS.map((c) => (
                <option key={c.slug} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="embed-classSubclass" className="text-xs text-barber-paper/80">
              Sottoclasse
            </label>
            <select
              id="embed-classSubclass"
              name="classSubclass"
              disabled={isPending || classSubclasses.length === 0}
              className="h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-2 text-sm text-barber-paper"
            >
              <option value="">—</option>
              {classSubclasses.map((s) => (
                <option key={s.slug} value={s.label}>
                  {s.label} ({subclassCatalogSourceSuffix(s)})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="embed-backgroundSlug" className="text-xs text-barber-paper/80">
              Background
            </label>
            <select
              id="embed-backgroundSlug"
              name="backgroundSlug"
              required
              disabled={isPending}
              className="h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-2 text-sm text-barber-paper"
            >
              <option value="" disabled>
                Background
              </option>
              {BACKGROUND_OPTIONS.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="embed-level" className="text-xs text-barber-paper/80">
              Livello
            </label>
            <input
              id="embed-level"
              name="level"
              type="number"
              min={1}
              max={20}
              defaultValue={1}
              required
              disabled={isPending}
              className="h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-2 text-sm text-barber-paper"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="embed-character-story" className="text-xs text-barber-paper/80">
            Storia (da AI, modificabile)
          </label>
          <Textarea
            id="embed-character-story"
            name="characterStory"
            rows={4}
            value={characterStory}
            onChange={(e) => setCharacterStory(e.target.value)}
            disabled={isPending}
            className="min-h-[80px] border-barber-gold/30 bg-barber-dark/80 text-sm text-barber-paper"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-barber-gold/20 bg-barber-dark/40 px-3 py-2 text-xs text-barber-paper/85">
          <input
            type="checkbox"
            name="includeBackgroundStoryInPdf"
            value="1"
            checked={includeBackgroundStoryInPdf}
            onChange={(e) => setIncludeBackgroundStoryInPdf(e.target.checked)}
            disabled={isPending}
            className="mt-0.5"
          />
          <span>Includi storia nel PDF</span>
        </label>

        {initial.torneoMode ? (
          <input type="hidden" name="torneoMode" value="1" />
        ) : null}

        <Button
          type="submit"
          size="sm"
          disabled={isPending || phase === "choices"}
          className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
        >
          {isPending ? "Generazione…" : "Genera scheda"}
        </Button>
      </form>

      {phase === "choices" && choicesPreview ? (
        <div className="space-y-2 border-t border-barber-gold/15 pt-3">
          <SheetBuildChoicesPanel
            key={`embed-choices-${formLevel}-${choicesPreview.slots.length}`}
            preview={choicesPreview}
            level={formLevel}
            disabled={isPending}
            onChange={(_slots, overrides) => setBuildOverrides(overrides)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => setPhase("form")}>
              Indietro
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleConfirmChoices}
              className="bg-barber-red text-barber-paper"
            >
              {isPending ? "Generazione…" : "Conferma scelte e genera"}
            </Button>
          </div>
        </div>
      ) : null}

      {resultMessage ? (
        <p className="rounded-md border border-barber-gold/20 bg-barber-dark/50 px-3 py-2 text-xs text-barber-paper/85">
          {resultMessage}
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-100">
          {warnings.map((w) => (
            <div key={w}>- {w}</div>
          ))}
        </div>
      ) : null}

      {sheet && sheetDataObj ? (
        <div className="max-h-[280px] overflow-y-auto rounded-lg border border-barber-gold/20 bg-barber-dark/40 p-2">
          <GeneratedSheetView
            sheet={sheet}
            sheetData={sheetDataObj}
            characterStory={characterStory || null}
            includeBackgroundStoryInPdf={includeBackgroundStoryInPdf}
            quickManualSections={quickManualSections}
            backgroundPdfSections={backgroundPdfSections}
          />
        </div>
      ) : null}

      {sheet && sheetDataObj ? (
        <Button
          type="button"
          size="sm"
          disabled={isSavingSheet}
          onClick={handleUseSheet}
          className="w-full border border-barber-gold/40 bg-barber-gold/15 text-barber-gold hover:bg-barber-gold/25"
        >
          {isSavingSheet ? "Preparazione PDF…" : sheetReady ? "Aggiorna scheda collegata" : "Usa questa scheda"}
        </Button>
      ) : null}
    </div>
  );
}
