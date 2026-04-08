"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { generateSheetAction } from "@/lib/actions/generator-actions";

const RACES = [
  "Umano",
  "Nano",
  "Elfo",
  "Mezzelfo",
  "Halfling",
  "Mezzorco",
  "Gnomo",
  "Tiefling",
] as const;

const CLASSES = [
  "Guerriero",
  "Mago",
  "Ladro",
  "Chierico",
  "Paladino",
  "Ranger",
  "Druido",
  "Bardo",
  "Monaco",
  "Stregone",
  "Warlock",
  "Barbaro",
  "Artefice",
] as const;

export default function GeneratorPage() {
  const [isPending, startTransition] = useTransition();
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultJson, setResultJson] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    setResultMessage(null);
    setResultJson(null);
    startTransition(async () => {
      const result = await generateSheetAction(formData);
      setResultMessage(result.message);
      if (result.success && result.sheetData) {
        setResultJson(JSON.stringify(result.sheetData, null, 2));
      }
    });
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-[#12100f] via-[#161312] to-[#1d1714] px-4 py-10 text-barber-paper md:px-8">
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-barber-gold/30 bg-barber-dark/80 p-6 shadow-[0_0_50px_rgba(251,191,36,0.08)]">
        <header className="mb-6 space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-barber-gold">
            <Sparkles className="h-5 w-5" />
            Generatore Schede D&D (RAG)
          </h1>
          <p className="text-sm text-barber-paper/70">
            Inserisci i parametri del personaggio: nel prossimo step collegheremo la consultazione dei manuali vettorializzati.
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
              disabled={isPending}
              className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper placeholder:text-barber-paper/45 focus:outline-none focus:ring-2 focus:ring-barber-gold"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="race" className="text-sm font-medium text-barber-paper">
                Razza
              </label>
              <select
                id="race"
                name="race"
                required
                defaultValue=""
                disabled={isPending}
                className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
              >
                <option value="" disabled>
                  Seleziona razza
                </option>
                {RACES.map((race) => (
                  <option key={race} value={race}>
                    {race}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="dndClass" className="text-sm font-medium text-barber-paper">
                Classe
              </label>
              <select
                id="dndClass"
                name="dndClass"
                required
                defaultValue=""
                disabled={isPending}
                className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
              >
                <option value="" disabled>
                  Seleziona classe
                </option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="level" className="text-sm font-medium text-barber-paper">
              Livello
            </label>
            <input
              id="level"
              name="level"
              type="number"
              min={1}
              max={20}
              step={1}
              required
              defaultValue={1}
              disabled={isPending}
              className="h-11 w-32 rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center rounded-md bg-barber-red px-5 text-sm font-medium text-barber-paper transition hover:bg-barber-red/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Consultazione manuali in corso..." : "Genera Scheda"}
          </button>
        </form>

        {resultMessage && (
          <p className="mt-5 rounded-md border border-barber-gold/25 bg-barber-dark/70 px-4 py-3 text-sm text-barber-paper/90">
            {resultMessage}
          </p>
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
