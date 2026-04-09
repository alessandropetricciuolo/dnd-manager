"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateSheetAction } from "@/lib/actions/generator-actions";
import { BACKGROUND_OPTIONS, CLASS_OPTIONS, RACE_OPTIONS } from "@/lib/character-build-catalog";
import { subclassCatalogSourceSuffix, supplementSubclassesForClass } from "@/lib/character-subclass-catalog";
import { GeneratedSheetView } from "@/components/sheet-generator/generated-sheet-view";
import type { GeneratedCharacterSheet } from "@/lib/sheet-generator/types";
import { useSearchParams } from "next/navigation";
import { saveGeneratedSheetToCharacter } from "@/app/campaigns/character-actions";

export default function GeneratorPage() {
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
    }),
    [searchParams]
  );

  const [selectedClass, setSelectedClass] = useState<string>(initial.classLabel);
  const [selectedRaceSlug, setSelectedRaceSlug] = useState<string>(initial.raceSlug);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultJson, setResultJson] = useState<string | null>(null);
  const [sheetDataObj, setSheetDataObj] = useState<Record<string, unknown> | null>(null);
  const [sheet, setSheet] = useState<GeneratedCharacterSheet | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSavingSheet, setIsSavingSheet] = useState(false);

  const race = RACE_OPTIONS.find((r) => r.slug === selectedRaceSlug) ?? null;
  const classSubclasses = supplementSubclassesForClass(selectedClass);

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }

  async function handleSaveToCharacterSheet() {
    if (isSavingSheet) return;
    if (!sheetDataObj || !sheet) {
      setResultMessage("Genera prima una scheda.");
      toast.error("Genera prima una scheda.");
      return;
    }
    if (!initial.campaignId || !initial.characterId) {
      const msg = "Per salvare nella scheda tecnica PG apri il generatore dal personaggio (campagna/characterId mancanti).";
      setResultMessage(msg);
      toast.error(msg);
      return;
    }
    setIsSavingSheet(true);
    try {
      const pdfRes = await fetch("/api/sheet-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: sheetDataObj,
          fileName: `${sheet.characterName || "scheda"}-compilata.pdf`,
        }),
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
      const saved = await saveGeneratedSheetToCharacter(
        initial.campaignId,
        initial.characterId,
        base64,
        `${sheet.characterName || "scheda"}-compilata.pdf`
      );
      if (saved.success) {
        const msg = "Scheda PDF salvata nella scheda tecnica del personaggio.";
        setResultMessage(msg);
        toast.success(msg);
      } else {
        setResultMessage(saved.error);
        toast.error(saved.error);
      }
    } catch {
      const msg = "Errore imprevisto durante il salvataggio della scheda PDF.";
      setResultMessage(msg);
      toast.error(msg);
    } finally {
      setIsSavingSheet(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    setResultMessage(null);
    setResultJson(null);
    setSheetDataObj(null);
    setSheet(null);
    setWarnings([]);
    startTransition(async () => {
      const result = await generateSheetAction(formData);
      setResultMessage(result.message);
      setWarnings(result.warnings ?? []);
      if (result.success && result.sheet) setSheet(result.sheet);
      if (result.success && result.sheetData) {
        setSheetDataObj(result.sheetData);
        setResultJson(JSON.stringify(result.sheetData, null, 2));
      }
    });
  }

  useEffect(() => {
    setSelectedClass(initial.classLabel);
    setSelectedRaceSlug(initial.raceSlug);
  }, [initial.classLabel, initial.raceSlug]);

  useEffect(() => {
    if (!initial.autogen) return;
    if (!initial.characterName || !initial.raceSlug || !initial.classLabel || !initial.backgroundSlug) return;
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

    startTransition(async () => {
      const result = await generateSheetAction(fd);
      setResultMessage(result.message);
      setWarnings(result.warnings ?? []);
      if (result.success && result.sheet) setSheet(result.sheet);
      if (result.success && result.sheetData) {
        setSheetDataObj(result.sheetData);
        setResultJson(JSON.stringify(result.sheetData, null, 2));
      }
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
                if (initial.returnTo) window.location.href = initial.returnTo;
                else window.history.back();
              }}
              className="rounded border border-barber-gold/40 px-3 py-1.5 text-xs text-barber-gold hover:bg-barber-gold/10"
            >
              Torna alla creazione PG
            </button>
            <button
              type="button"
              onClick={handleSaveToCharacterSheet}
              disabled={isSavingSheet || !sheetDataObj || !sheet || !initial.campaignId || !initial.characterId}
              className="rounded border border-barber-gold/40 px-3 py-1.5 text-xs text-barber-gold hover:bg-barber-gold/10"
            >
              {isSavingSheet ? "Salvataggio PDF..." : "Salva scheda PDF (scheda tecnica PG)"}
            </button>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-barber-gold">
            <Sparkles className="h-5 w-5" />
            Generatore Schede D&D (HTML)
          </h1>
          <p className="text-sm text-barber-paper/70">
            Flusso deterministico: point-buy, abilita, privilegi, equipaggiamento e incantesimi da manuali catalogati.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center rounded-md bg-barber-red px-5 text-sm font-medium text-barber-paper transition hover:bg-barber-red/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Generazione scheda in corso..." : "Genera Scheda"}
          </button>
        </form>

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
        {sheet && <GeneratedSheetView sheet={sheet} sheetData={sheetDataObj} />}
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
