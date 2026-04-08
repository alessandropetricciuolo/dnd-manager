"use client";

import type { GeneratedCharacterSheet } from "@/lib/sheet-generator/types";

type Props = {
  sheet: GeneratedCharacterSheet;
};

function block(title: string, body: string | null | undefined) {
  if (!body?.trim()) return null;
  return (
    <section className="rounded border border-barber-gold/20 bg-black/20 p-3">
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-barber-gold/80">{title}</h4>
      <pre className="whitespace-pre-wrap text-xs text-barber-paper/90">{body}</pre>
    </section>
  );
}

export function GeneratedSheetView({ sheet }: Props) {
  return (
    <div className="mt-6 space-y-4 print:mt-0">
      <div className="flex justify-end print:hidden">
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
