"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateSheetAction, previewBuildChoicesAction } from "@/lib/actions/generator-actions";
import { BACKGROUND_OPTIONS, CLASS_OPTIONS, RACE_OPTIONS } from "@/lib/character-build-catalog";
import { subclassCatalogSourceSuffix, supplementSubclassesForClass } from "@/lib/character-subclass-catalog";
import { GeneratedSheetView } from "@/components/sheet-generator/generated-sheet-view";
import { SheetBuildChoicesPanel } from "@/components/sheet-generator/sheet-build-choices-panel";
import { Textarea } from "@/components/ui/textarea";
import type { BuildChoicesPreview, CharacterBuildOverrides } from "@/lib/sheet-generator/build-choices-types";
import type { GeneratedCharacterSheet } from "@/lib/sheet-generator/types";
import type { QuickManualSection } from "@/lib/sheet-generator/quick-manual-builder";
import { useSearchParams } from "next/navigation";
import { saveGeneratedSheetToCharacter } from "@/app/campaigns/character-actions";
import {
  mapGeneratorFormToCharacterBuildDraft,
  parseGeneratedSheetBuildMeta,
} from "@/lib/character-sheet-build-meta";
import { spellcastingMetaFromGeneratedSheet } from "@/lib/sheet-generator/spell-slots";
import { buildCompiledSheetPdfRequestBody } from "@/lib/sheet-generator/sheet-pdf-payload";
import { formatSheetSaveError } from "@/lib/sheet-save-errors";
import { arrayBufferToBase64 } from "@/lib/utils/array-buffer-base64";

const CREATE_CHARACTER_DRAFT_KEY_PREFIX = "create-character-draft";
const CREATE_CHARACTER_GENERATED_SHEET_KEY_PREFIX = "create-character-generated-sheet";

function GeneratorPageContent() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const initial = useMemo(
    () => ({
      characterName: searchParams.get("characterName") ?? "",
      raceSlug: searchParams.get("raceSlug") ?? "",
      subraceSlug: searchParams.get("subraceSlug") ?? "",
      classLabel: searchParams.get("classLabel") ?? "",
      classSubclass: searchParams.get("classSubclass") ?? "",
      backgroundSlug: searchParams.get("backgroundSlug") ?? "",
      level: searchParams.get("level") ?? "1",
      alignment: searchParams.get("alignment") ?? "",
      age: searchParams.get("age") ?? "",
      height: searchParams.get("height") ?? "",
      weight: searchParams.get("weight") ?? "",
      sex: searchParams.get("sex") ?? "",
      campaignId: searchParams.get("campaignId") ?? "",
      characterId: searchParams.get("characterId") ?? "",
      returnTo: searchParams.get("returnTo") ?? "",
      autogen: searchParams.get("autogen") === "1",
      powerPlayer: searchParams.get("powerPlayer") === "1",
      torneoMode: searchParams.get("torneoMode") === "1",
      includeBackgroundStoryInPdf: searchParams.get("includeBackgroundStoryInPdf") === "1",
      characterStory: searchParams.get("characterStory") ?? "",
    }),
    [searchParams]
  );

  const [selectedClass, setSelectedClass] = useState<string>(initial.classLabel);
  const [selectedRaceSlug, setSelectedRaceSlug] = useState<string>(initial.raceSlug);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultJson, setResultJson] = useState<string | null>(null);
  const [sheetDataObj, setSheetDataObj] = useState<Record<string, unknown> | null>(null);
  const [quickManualSections, setQuickManualSections] = useState<QuickManualSection[]>([]);
  const [backgroundPdfSections, setBackgroundPdfSections] = useState<QuickManualSection[]>([]);
  const [includeBackgroundStoryInPdf, setIncludeBackgroundStoryInPdf] = useState(
    initial.includeBackgroundStoryInPdf
  );
  const [sheet, setSheet] = useState<GeneratedCharacterSheet | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSavingSheet, setIsSavingSheet] = useState(false);
  const [characterStory, setCharacterStory] = useState(initial.characterStory);
  const [phase, setPhase] = useState<"form" | "choices" | "done">("form");
  const [choicesPreview, setChoicesPreview] = useState<BuildChoicesPreview | null>(null);
  const [buildOverrides, setBuildOverrides] = useState<CharacterBuildOverrides | null>(null);
  const [formLevel, setFormLevel] = useState(Number.parseInt(initial.level, 10) || 1);
  const autogenKeyRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const race = RACE_OPTIONS.find((r) => r.slug === selectedRaceSlug) ?? null;
  const classSubclasses = supplementSubclassesForClass(selectedClass);
  const returnLabel = useMemo(() => {
    if (!initial.returnTo) return "Torna indietro";
    try {
      const parsed = new URL(initial.returnTo, "http://localhost");
      if (parsed.searchParams.get("openEditCharacter")) return "Torna alla modifica PG";
      if (parsed.searchParams.get("openCreateCharacter") === "1") return "Torna alla creazione PG";
    } catch {
      // Ignore malformed returnTo and use generic fallback.
    }
    return "Torna ai personaggi";
  }, [initial.returnTo]);

  function persistCreateDraftFromGeneratorForm() {
    if (!formRef.current || !initial.campaignId) return;
    try {
      const draftKey = `${CREATE_CHARACTER_DRAFT_KEY_PREFIX}:${initial.campaignId}`;
      const existingRaw = localStorage.getItem(draftKey);
      const existing = existingRaw ? (JSON.parse(existingRaw) as Record<string, string>) : {};
      const mapped = mapGeneratorFormToCharacterBuildDraft(formRef.current, sheet);

      const merged: Record<string, string> = { ...existing };
      for (const [k, v] of Object.entries(mapped)) {
        if (typeof v === "string" && v) merged[k] = v;
      }

      localStorage.setItem(draftKey, JSON.stringify(merged));
    } catch {
      // ignore
    }
  }

  async function handleSaveToCharacterSheet() {
    if (isSavingSheet) return;
    if (!sheetDataObj || !sheet) {
      setResultMessage("Genera prima una scheda.");
      toast.error("Genera prima una scheda.");
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
        const msg = err?.error ?? "Errore generazione PDF.";
        setResultMessage(msg);
        toast.error(msg);
        return;
      }
      const ab = await pdfRes.arrayBuffer();
      const base64 = arrayBufferToBase64(ab);
      const buildMeta = parseGeneratedSheetBuildMeta(formRef.current, sheet);
      if (initial.campaignId && initial.characterId) {
        const saved = await saveGeneratedSheetToCharacter(
          initial.campaignId,
          initial.characterId,
          base64,
          `${sheet.characterName || "scheda"}-compilata.pdf`,
          { armorClass: sheet.armorClass, hitPoints: sheet.hpMax },
          spellcastingMetaFromGeneratedSheet(sheet),
          buildMeta
        );
        if (saved.success) {
          const msg = "Scheda PDF salvata nella scheda tecnica del personaggio.";
          setResultMessage(msg);
          toast.success(msg);
          if (initial.returnTo) {
            const next = new URL(initial.returnTo, window.location.origin);
            if (!next.searchParams.get("tab")) next.searchParams.set("tab", "pg");
            if (initial.characterId) next.searchParams.set("openEditCharacter", initial.characterId);
            window.location.href = `${next.pathname}?${next.searchParams.toString()}`;
            return;
          }
        } else {
          setResultMessage(saved.error);
          toast.error(saved.error);
        }
        return;
      }

      if (initial.campaignId && initial.returnTo) {
        persistCreateDraftFromGeneratorForm();
        const buildDraft = mapGeneratorFormToCharacterBuildDraft(formRef.current, sheet);
        try {
          localStorage.setItem(
            `${CREATE_CHARACTER_GENERATED_SHEET_KEY_PREFIX}:${initial.campaignId}`,
            JSON.stringify({
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
                race_slug: buildDraft.race_slug,
                subclass_slug: buildDraft.subclass_slug,
                character_class: buildDraft.character_class,
                class_subclass: buildDraft.class_subclass,
                background_slug: buildDraft.background_slug,
                level: buildDraft.level,
              },
            })
          );
        } catch (e) {
          const msg =
            e instanceof DOMException && e.name === "QuotaExceededError"
              ? "Spazio localStorage insufficiente per il PDF. Riduci la scheda o scarica il PDF dal bottone «Stampa / Salva PDF» e caricane un file più leggero."
              : "Impossibile salvare la scheda in bozza locale. Riprova o carica un PDF manualmente.";
          setResultMessage(msg);
          toast.error(msg);
          return;
        }
        const msg = "Scheda PDF pronta: torna alla creazione PG e salva il personaggio.";
        setResultMessage(msg);
        toast.success(msg);
        window.location.href = initial.returnTo;
        return;
      }

      const msg = "Per salvare la scheda apri il generatore dalla creazione/modifica PG.";
      setResultMessage(msg);
      toast.error(msg);
    } catch (err) {
      console.error("[handleSaveToCharacterSheet]", err);
      const msg = formatSheetSaveError(err);
      setResultMessage(msg);
      toast.error(msg);
    } finally {
      setIsSavingSheet(false);
    }
  }

  async function runGenerateSheet(formData: FormData, overrides?: CharacterBuildOverrides | null) {
    if (overrides && Object.keys(overrides).length > 0) {
      formData.set("buildOverridesJson", JSON.stringify(overrides));
    } else {
      formData.delete("buildOverridesJson");
    }

    setResultMessage(null);
    setResultJson(null);
    setSheetDataObj(null);
    setQuickManualSections([]);
    setBackgroundPdfSections([]);
    setSheet(null);
    setWarnings([]);

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
      setResultJson(JSON.stringify(result.sheetData, null, 2));
      setPhase("done");
    }
    return result;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    const storyFromForm = (formData.get("characterStory") as string | null)?.trim() ?? "";
    setCharacterStory(storyFromForm);
    setIncludeBackgroundStoryInPdf(
      formData.get("includeBackgroundStoryInPdf") === "1" ||
        formData.get("includeBackgroundStoryInPdf") === "on"
    );
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
        setResultJson(null);
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

  function handleBackToForm() {
    setPhase("form");
    setChoicesPreview(null);
    setBuildOverrides(null);
    setResultMessage(null);
  }

  useEffect(() => {
    setSelectedClass(initial.classLabel);
    setSelectedRaceSlug(initial.raceSlug);
  }, [initial.classLabel, initial.raceSlug]);

  useEffect(() => {
    if (!initial.autogen) return;
    if (!initial.characterName || !initial.raceSlug || !initial.classLabel || !initial.backgroundSlug) return;
    const autogenKey = JSON.stringify({
      characterName: initial.characterName,
      raceSlug: initial.raceSlug,
      subraceSlug: initial.subraceSlug,
      classLabel: initial.classLabel,
      classSubclass: initial.classSubclass,
      backgroundSlug: initial.backgroundSlug,
      level: initial.level,
      alignment: initial.alignment,
      age: initial.age,
      height: initial.height,
      weight: initial.weight,
      sex: initial.sex,
      powerPlayer: initial.powerPlayer,
      torneoMode: initial.torneoMode,
      includeBackgroundStoryInPdf: initial.includeBackgroundStoryInPdf,
      characterStory: initial.characterStory,
    });
    if (autogenKeyRef.current === autogenKey) return;
    autogenKeyRef.current = autogenKey;
    const fd = new FormData();
    fd.set("characterName", initial.characterName);
    fd.set("raceSlug", initial.raceSlug);
    if (initial.subraceSlug) fd.set("subraceSlug", initial.subraceSlug);
    fd.set("classLabel", initial.classLabel);
    if (initial.classSubclass) fd.set("classSubclass", initial.classSubclass);
    fd.set("backgroundSlug", initial.backgroundSlug);
    fd.set("level", initial.level || "1");
    if (initial.alignment) fd.set("alignment", initial.alignment);
    if (initial.age) fd.set("age", initial.age);
    if (initial.height) fd.set("height", initial.height);
    if (initial.weight) fd.set("weight", initial.weight);
    if (initial.sex) fd.set("sex", initial.sex);
    if (initial.powerPlayer) fd.set("powerPlayer", "1");
    if (initial.torneoMode) fd.set("torneoMode", "1");
    if (initial.includeBackgroundStoryInPdf) fd.set("includeBackgroundStoryInPdf", "1");
    if (initial.characterStory) fd.set("characterStory", initial.characterStory);

    startTransition(async () => {
      setFormLevel(Number.parseInt(initial.level, 10) || 1);
      const previewResult = await previewBuildChoicesAction(fd);
      if (!previewResult.success) {
        setResultMessage(previewResult.message);
        return;
      }
      if (previewResult.preview?.slots.length) {
        setChoicesPreview(previewResult.preview);
        setBuildOverrides(previewResult.preview.overrides);
        setPhase("choices");
        setResultMessage(previewResult.message);
        return;
      }
      await runGenerateSheet(fd, null);
    });
  }, [initial, startTransition]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-[#12100f] via-[#161312] to-[#1d1714] px-4 py-10 text-barber-paper md:px-8">
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-barber-gold/30 bg-barber-dark/80 p-6 shadow-[0_0_50px_rgba(251,191,36,0.08)]">
        <header className="mb-6 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (initial.returnTo) {
                  persistCreateDraftFromGeneratorForm();
                  window.location.href = initial.returnTo;
                }
                else window.history.back();
              }}
              className="rounded border border-barber-gold/40 px-3 py-1.5 text-xs text-barber-gold hover:bg-barber-gold/10"
            >
              {returnLabel}
            </button>
            <button
              type="button"
              onClick={handleSaveToCharacterSheet}
              disabled={isSavingSheet || !sheetDataObj || !sheet}
              className="rounded border border-barber-gold/40 px-3 py-1.5 text-xs text-barber-gold hover:bg-barber-gold/10"
            >
              {isSavingSheet ? "Salvataggio PDF..." : "Salva scheda PDF"}
            </button>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-barber-gold">
            <Sparkles className="h-5 w-5" />
            Generatore Schede D&D (HTML)
          </h1>
          <p className="text-sm text-barber-paper/70">
            Flusso deterministico con revisione delle scelte: competenze, incantesimi, stile di
            combattimento e opzioni di classe prima del PDF.
          </p>
        </header>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="characterName" className="text-sm font-medium text-barber-paper">
              Nome Personaggio
            </label>
            <input
              id="characterName"
              name="characterName"
              type="text"
              required
              placeholder="Es. Tharion il Grigio"
              defaultValue={initial.characterName}
              disabled={isPending}
              className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper placeholder:text-barber-paper/45 focus:outline-none focus:ring-2 focus:ring-barber-gold"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="raceSlug" className="text-sm font-medium text-barber-paper">
                Razza
              </label>
              <select
                id="raceSlug"
                name="raceSlug"
                required
                defaultValue={initial.raceSlug}
                disabled={isPending}
                onChange={(e) => {
                  setSelectedRaceSlug(e.target.value);
                }}
                className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
              >
                <option value="" disabled>
                  Seleziona razza
                </option>
                {RACE_OPTIONS.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="subraceSlug" className="text-sm font-medium text-barber-paper">
                Sottorazza (opzionale)
              </label>
              <select
                id="subraceSlug"
                name="subraceSlug"
                defaultValue={initial.subraceSlug}
                disabled={isPending || !race?.subraces?.length}
                className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
              >
                <option value="">Nessuna</option>
                {(race?.subraces ?? []).map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="classLabel" className="text-sm font-medium text-barber-paper">
                Classe
              </label>
              <select
                id="classLabel"
                name="classLabel"
                required
                defaultValue={initial.classLabel}
                disabled={isPending}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
              >
                <option value="" disabled>
                  Seleziona classe
                </option>
                {CLASS_OPTIONS.map((c) => (
                  <option key={c.slug} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="classSubclass" className="text-sm font-medium text-barber-paper">
                Sottoclasse
              </label>
              <select
                id="classSubclass"
                name="classSubclass"
                defaultValue={initial.classSubclass}
                disabled={isPending || classSubclasses.length === 0}
                className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
              >
                <option value="">Nessuna</option>
                {classSubclasses.map((s) => (
                  <option key={s.slug} value={s.label}>
                    {s.label} ({subclassCatalogSourceSuffix(s)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="backgroundSlug" className="text-sm font-medium text-barber-paper">
                Background
              </label>
              <select
                id="backgroundSlug"
                name="backgroundSlug"
                required
                defaultValue={initial.backgroundSlug}
                disabled={isPending}
                className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
              >
                <option value="" disabled>Seleziona background</option>
                {BACKGROUND_OPTIONS.map((b) => (
                  <option key={b.slug} value={b.slug}>{b.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="level" className="text-sm font-medium text-barber-paper">Livello</label>
              <input
                id="level"
                name="level"
                type="number"
                min={1}
                max={20}
                step={1}
                required
                defaultValue={Number.parseInt(initial.level, 10) || 1}
                disabled={isPending}
                className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="alignment" className="text-sm font-medium text-barber-paper">Allineamento</label>
              <input id="alignment" name="alignment" type="text" defaultValue={initial.alignment} disabled={isPending} className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="age" className="text-sm font-medium text-barber-paper">Eta</label>
              <input id="age" name="age" type="text" defaultValue={initial.age} disabled={isPending} className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold" />
            </div>
            <div className="space-y-2">
              <label htmlFor="height" className="text-sm font-medium text-barber-paper">Altezza</label>
              <input id="height" name="height" type="text" defaultValue={initial.height} disabled={isPending} className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold" />
            </div>
            <div className="space-y-2">
              <label htmlFor="weight" className="text-sm font-medium text-barber-paper">Peso</label>
              <input id="weight" name="weight" type="text" defaultValue={initial.weight} disabled={isPending} className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold" />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="sex" className="text-sm font-medium text-barber-paper">Sesso</label>
            <input id="sex" name="sex" type="text" defaultValue={initial.sex} disabled={isPending} className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold" />
          </div>

          <div className="space-y-2">
            <label htmlFor="generator-character-story" className="text-sm font-medium text-barber-paper">
              Storia del personaggio (opzionale)
            </label>
            <Textarea
              id="generator-character-story"
              name="characterStory"
              rows={6}
              value={characterStory}
              onChange={(e) => setCharacterStory(e.target.value)}
              disabled={isPending}
              placeholder="Narrazione, legami, obiettivi… come nella sezione Background / Storia della card PG."
              maxLength={50_000}
              className="min-h-[100px] border-barber-gold/30 bg-barber-dark/80 text-barber-paper placeholder:text-barber-paper/35"
            />
          </div>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-barber-gold/25 bg-barber-dark/50 px-4 py-3 text-sm text-barber-paper">
              <input
                type="checkbox"
                name="torneoMode"
                value="1"
                defaultChecked={initial.torneoMode}
                disabled={isPending}
                className="mt-1 h-4 w-4 shrink-0 rounded border-barber-gold/40 text-barber-red focus:ring-barber-gold"
              />
              <span>
                <span className="font-medium text-barber-gold">Modalità torneo</span>
                <span className="mt-1 block text-barber-paper/75">
                  Aggiunge al PDF un Manuale rapido (dopo la scheda) con tratti razziali, privilegi di
                  classe/sottoclasse e testo completo degli incantesimi scelti.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-barber-gold/25 bg-barber-dark/50 px-4 py-3 text-sm text-barber-paper">
              <input
                type="checkbox"
                name="includeBackgroundStoryInPdf"
                value="1"
                defaultChecked={initial.includeBackgroundStoryInPdf}
                disabled={isPending}
                className="mt-1 h-4 w-4 shrink-0 rounded border-barber-gold/40 text-barber-red focus:ring-barber-gold"
              />
              <span>
                <span className="font-medium text-barber-gold">Background e storia nel PDF</span>
                <span className="mt-1 block text-barber-paper/75">
                  Dopo la scheda (e dopo il manuale rapido, se attivo): testo del background scelto dal
                  manuale e, se hai scritto la storia sopra, una pagina «Storia del personaggio».
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-barber-gold/25 bg-barber-dark/50 px-4 py-3 text-sm text-barber-paper">
              <input
                type="checkbox"
                name="powerPlayer"
                value="1"
                defaultChecked={initial.powerPlayer}
                disabled={isPending}
                className="mt-1 h-4 w-4 shrink-0 rounded border-barber-gold/40 text-barber-red focus:ring-barber-gold"
              />
              <span>
                <span className="font-medium text-barber-gold">Power player (scheda)</span>
                <span className="mt-1 block text-barber-paper/75">
                  Trucchetti e incantesimi scelti da una tier list orientata al combattimento, rispettando
                  gli slot disponibili per livello (niente liste piene solo di incantesimi al massimo livello).
                </span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending || phase === "choices"}
            className="inline-flex h-11 items-center justify-center rounded-md bg-barber-red px-5 text-sm font-medium text-barber-paper transition hover:bg-barber-red/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Caricamento scelte..." : "Genera Scheda"}
          </button>
        </form>

        {phase === "choices" && choicesPreview && (
          <>
            <SheetBuildChoicesPanel
              key={`choices-${formLevel}-${choicesPreview.slots.length}`}
              preview={choicesPreview}
              level={formLevel}
              disabled={isPending}
              onChange={(_slots, overrides) => setBuildOverrides(overrides)}
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={handleBackToForm}
                className="inline-flex h-10 items-center rounded-md border border-barber-gold/40 px-4 text-sm text-barber-gold hover:bg-barber-gold/10 disabled:opacity-60"
              >
                Torna al form
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmChoices}
                className="inline-flex h-10 items-center rounded-md bg-barber-red px-5 text-sm font-medium text-barber-paper hover:bg-barber-red/90 disabled:opacity-60"
              >
                {isPending ? "Generazione PDF in corso..." : "Conferma e genera PDF"}
              </button>
            </div>
          </>
        )}

        {resultMessage && (
          <p className="mt-5 rounded-md border border-barber-gold/25 bg-barber-dark/70 px-4 py-3 text-sm text-barber-paper/90">
            {resultMessage}
          </p>
        )}
        {warnings.length > 0 && (
          <div className="mt-5 rounded-md border border-yellow-500/30 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-100">
            {warnings.map((w) => (
              <div key={w}>- {w}</div>
            ))}
          </div>
        )}
        {sheet && (
          <GeneratedSheetView
            sheet={sheet}
            sheetData={sheetDataObj}
            characterStory={characterStory || null}
            includeBackgroundStoryInPdf={includeBackgroundStoryInPdf}
            quickManualSections={quickManualSections}
            backgroundPdfSections={backgroundPdfSections}
          />
        )}
        {resultJson && (
          <div className="mt-5 rounded-md border border-barber-gold/25 bg-black/30 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-barber-gold/80">
              JSON Scheda Generata
            </p>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap text-xs text-barber-paper/90">
              {resultJson}
            </pre>
          </div>
        )}
      </section>
    </main>
  );
}

export default function GeneratorPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-barber-dark" />}>
      <GeneratorPageContent />
    </Suspense>
  );
}
