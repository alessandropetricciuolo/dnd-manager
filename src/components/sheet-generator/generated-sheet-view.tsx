"use client";

import type { GeneratedCharacterSheet } from "@/lib/sheet-generator/types";

type Props = {
  sheet: GeneratedCharacterSheet;
  sheetData?: Record<string, unknown> | null;
  /** Narrazione PG (campo «Background / Storia» sulla card): aggiunta come pagina dopo la Scheda_Base nel PDF compilato. */
  storyText?: string | null;
};

function pdfStoryContextLine(sheet: GeneratedCharacterSheet): string {
  const name = sheet.characterName?.trim();
  const cls = [sheet.classLabel, sheet.level ? `liv. ${sheet.level}` : ""].filter(Boolean).join(" ");
  const bg = sheet.backgroundLabel?.trim() ?? "";
  return [name, cls, bg ? `Background: ${bg}` : ""].filter(Boolean).join(" · ");
}

function block(title: string, body: string | null | undefined) {
  if (!body?.trim()) return null;
  return (
    <section className="rounded border border-barber-gold/20 bg-black/20 p-3">
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-barber-gold/80">{title}</h4>
      <pre className="whitespace-pre-wrap text-xs text-barber-paper/90">{body}</pre>
    </section>
  );
}

function inventoryPreviewText(lines: string[]): string {
  const cleaned = lines.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!cleaned.length) return "—";
  return cleaned.map((s) => `• ${s}`).join("\n");
}

export function GeneratedSheetView({ sheet, sheetData, storyText }: Props) {
  const storyPdf = typeof storyText === "string" ? storyText : "";
  const storyTrim = storyPdf.trim();

  async function downloadCompiledPdf() {
    if (!sheetData) return;
    const res = await fetch("/api/sheet-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: sheetData,
        fileName: `${sheet.characterName || "scheda"}-compilata.pdf`,
        ...(storyTrim
          ? { storyText: storyTrim, storyContextLine: pdfStoryContextLine(sheet) }
          : {}),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error ?? "Errore durante la generazione del PDF compilato.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sheet.characterName || "scheda"}-compilata.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-6 space-y-4 print:mt-0">
      <div className="flex justify-end gap-2 print:hidden">
        <button
          type="button"
          onClick={downloadCompiledPdf}
          disabled={!sheetData}
          className="rounded border border-barber-gold/40 bg-barber-dark px-4 py-2 text-sm font-medium text-barber-gold hover:bg-barber-gold/10 disabled:opacity-60"
        >
          Scarica Scheda_Base compilata
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded bg-barber-red px-4 py-2 text-sm font-medium text-barber-paper hover:bg-barber-red/90"
        >
          Stampa / Salva PDF
        </button>
      </div>
      <article className="rounded-xl border border-barber-gold/30 bg-barber-dark/70 p-5 print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black">
        <header className="mb-4 grid gap-2 md:grid-cols-3">
          <div><b>Nome:</b> {sheet.characterName}</div>
          <div><b>Razza:</b> {sheet.subraceLabel ? `${sheet.raceLabel} (${sheet.subraceLabel})` : sheet.raceLabel}</div>
          <div><b>Classe:</b> {sheet.classLabel} {sheet.level}{sheet.classSubclass ? ` - ${sheet.classSubclass}` : ""}</div>
          <div><b>Background:</b> {sheet.backgroundLabel}</div>
          <div><b>Allineamento:</b> {sheet.alignment ?? "-"}</div>
          <div><b>Età/Sesso:</b> {sheet.age ?? "-"} / {sheet.sex ?? "-"}</div>
        </header>

        <section className="mb-4 grid gap-3 md:grid-cols-3">
          {(["str", "dex", "con", "int", "wis", "cha"] as const).map((a) => (
            <div key={a} className="rounded border border-barber-gold/20 p-2 text-sm">
              <div className="uppercase">{a}</div>
              <div className="text-lg font-semibold">{sheet.abilities[a]}</div>
              <div>mod {sheet.abilityMods[a] >= 0 ? `+${sheet.abilityMods[a]}` : sheet.abilityMods[a]}</div>
            </div>
          ))}
        </section>

        <section className="mb-4 grid gap-3 md:grid-cols-4">
          <div><b>PB</b> +{sheet.proficiencyBonus}</div>
          <div><b>CA</b> {sheet.armorClass}</div>
          <div><b>PF</b> {sheet.hpMax}</div>
          <div><b>Iniziativa</b> {sheet.initiative >= 0 ? `+${sheet.initiative}` : sheet.initiative}</div>
        </section>

        <section className="mb-4 rounded border border-barber-gold/20 bg-black/20 p-3">
          <h3 className="mb-2 text-sm font-semibold text-barber-paper">Inventario</h3>
          <p className="mb-2 text-xs text-barber-paper/65">
            Dotazione di partenza dal background (come sul campo inventario della Scheda_Base PDF).
          </p>
          <pre className="whitespace-pre-wrap text-sm text-barber-paper/90">{inventoryPreviewText(sheet.inventory)}</pre>
        </section>

        <section className="mb-4">
          <h3 className="mb-2 font-semibold">Incantesimi</h3>
          <div className="mb-2 text-sm">
            <b>Classe:</b> {sheet.spellcastingClass ?? "-"} | <b>Caratt:</b>{" "}
            {sheet.spellcastingAbility?.toUpperCase() ?? "-"} | <b>CD:</b> {sheet.spellSaveDc ?? "-"} | <b>TxC:</b>{" "}
            {sheet.spellAttackBonus != null ? `+${sheet.spellAttackBonus}` : "-"}
          </div>
          <div className="space-y-1 text-sm">
            {sheet.spells.slice(0, 20).map((s) => (
              <div key={`${s.level}-${s.name}`} className="rounded border border-barber-gold/15 p-2">
                <b>{s.name}</b> (lvl {s.level}) - {s.summary}
              </div>
            ))}
          </div>
        </section>

        {storyTrim ? (
          <section className="mb-4 rounded border border-barber-gold/25 bg-black/15 p-3 print:break-before-page">
            <h3 className="mb-2 text-sm font-semibold text-barber-paper">Storia del personaggio (anche in PDF)</h3>
            <pre className="whitespace-pre-wrap text-sm text-barber-paper/90">{storyTrim}</pre>
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2">
          {block("Tratti razziali", [sheet.raceTraitsMd, sheet.subraceTraitsMd].filter(Boolean).join("\n\n"))}
          {block("Privilegi classe", sheet.classFeaturesMd)}
          {block("Privilegi sottoclasse", sheet.subclassFeaturesMd)}
          {block("Background", sheet.backgroundMd)}
        </section>
      </article>
    </div>
  );
}
