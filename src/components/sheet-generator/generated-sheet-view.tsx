"use client";

import type { GeneratedCharacterSheet } from "@/lib/sheet-generator/types";
import type { QuickManualSection } from "@/lib/sheet-generator/quick-manual-builder";

type Props = {
  sheet: GeneratedCharacterSheet;
  sheetData?: Record<string, unknown> | null;
  /** Narrazione PG: pagina extra se includeBackgroundStoryInPdf. */
  characterStory?: string | null;
  includeBackgroundStoryInPdf?: boolean;
  quickManualSections?: QuickManualSection[];
  backgroundPdfSections?: QuickManualSection[];
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

function inventoryPreviewText(lines: string[]): string {
  const cleaned = lines.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!cleaned.length) return "—";
  return cleaned.map((s) => `• ${s}`).join("\n");
}

export function GeneratedSheetView({
  sheet,
  sheetData,
  characterStory,
  includeBackgroundStoryInPdf = false,
  quickManualSections = [],
  backgroundPdfSections = [],
}: Props) {
  const storyTrim = (characterStory ?? "").trim();
  const storyInPdf = includeBackgroundStoryInPdf && !!storyTrim;

  return (
    <div className="mt-6 space-y-4 print:mt-0">
      <article className="rounded-xl border border-barber-gold/30 bg-barber-dark/70 p-5 print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black">
        <header className="mb-4 grid gap-2 md:grid-cols-3">
          <div><b>Nome:</b> {sheet.characterName}</div>
          <div><b>Razza:</b> {sheet.subraceLabel ? `${sheet.raceLabel} (${sheet.subraceLabel})` : sheet.raceLabel}</div>
          <div><b>Classe:</b> {sheet.classLabel} {sheet.level}{sheet.classSubclass ? ` - ${sheet.classSubclass}` : ""}</div>
          <div><b>Background:</b> {sheet.backgroundLabel}</div>
          <div><b>Allineamento:</b> {sheet.alignment ?? "-"}</div>
          <div><b>Età/Sesso:</b> {sheet.age ?? "-"} / {sheet.sex ?? "-"}</div>
        </header>

        {(quickManualSections.length > 0 || backgroundPdfSections.length > 0 || storyInPdf) && (
          <p className="mb-4 text-xs text-barber-paper/65 print:hidden">
            PDF compilato: scheda
            {quickManualSections.length ? " + manuale rapido" : ""}
            {storyInPdf ? " + storia del personaggio" : ""}
          </p>
        )}

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

        {sheet.artificer&&<section className="mb-4 space-y-3 rounded border border-barber-gold/30 p-3" aria-label="Infusioni dell’Artefice">
          <h3 className="font-semibold">Infusioni e oggetti</h3>
          <p className="text-sm">Conosciute {sheet.artificer.known.length}/{sheet.artificer.knownLimit} · Oggetti infusi {sheet.artificer.assignments.length}/{sheet.artificer.itemLimit}{sheet.artificer.armorBonusSlots?` + ${sheet.artificer.armorBonusSlots} parti dell’armatura`:''} · Massimo {sheet.artificer.attunementLimit} oggetti in sintonia</p>
          <ul className="space-y-2 text-sm">{sheet.artificer.assignments.map(a=><li key={a.infusionId}><strong>{a.title}</strong> → {a.itemLabel}: {a.state==='attuned'?'usato dal PG, in sintonia':a.state==='self'?'usato dal PG, senza sintonia':a.state==='other'?'assegnato ad altri':a.state==='carried-attuned'?'portato, in sintonia, non usato':'portato, non usato'}{a.requiresAttunement&&a.state==='self'?' (bonus non applicato: richiede sintonia)':''}{a.resistance&&a.infusionId==='resistant'?` · resistenza a ${a.resistance}`:''}</li>)}</ul>
          <p className="text-xs text-barber-paper/70">I bonus indicati nei valori della scheda derivano solo dagli oggetti usati dal PG, con sintonia quando necessaria. Gli effetti temporanei richiedono la loro normale attivazione.</p>
          {sheet.artificer.notes.map((note,i)=><p key={i} className="text-xs">{note}</p>)}
        </section>}

        <section className="mb-4">
          <h3 className="mb-2 font-semibold">Incantesimi</h3>
          <div className="mb-2 text-sm">
            <b>Classe:</b> {sheet.spellcastingClass ?? "-"} | <b>Caratt:</b>{" "}
            {sheet.spellcastingAbility?.toUpperCase() ?? "-"} | <b>CD:</b> {sheet.spellSaveDc ?? "-"} | <b>TxC:</b>{" "}
            {sheet.spellAttackBonus != null ? `+${sheet.spellAttackBonus}` : "-"}
          </div>
          <div className="space-y-1 text-sm">
            {sheet.spells.map((s, idx) => {
              const tags = [
                s.origin === "race"
                  ? `Razza${s.ability ? ` (${s.ability.toUpperCase()})` : ""}`
                  : s.origin === "arcanum"
                  ? "Arcanum Mistico"
                  : s.origin === "feat"
                  ? "Talento"
                  : s.origin === "item"
                  ? "Oggetto"
                  : null,
                s.alwaysPrepared ? "Sempre preparato" : null,
                s.usesPerRest ? s.usesPerRest : null,
                s.requiresSlot === false && s.level > 0 ? "Senza slot" : null,
                s.ritual ? "Rituale" : null,
                s.concentration ? "Concentrazione" : null,
              ].filter(Boolean);
              return (
                <div key={`${s.level}-${s.name}-${s.origin ?? "cls"}-${idx}`} className="rounded border border-barber-gold/15 p-2">
                  <div>
                    <b>{s.name}</b> (lvl {s.level}){tags.length ? ` [${tags.join(" · ")}]` : ""} - {s.summary}
                  </div>
                  {s.fullTextMd?.trim() ? (
                    <details className="mt-1 print:hidden">
                      <summary className="cursor-pointer text-xs text-barber-gold/80 hover:text-barber-gold">
                        Testo integrale dal manuale
                      </summary>
                      <pre className="mt-1 whitespace-pre-wrap rounded bg-black/25 p-2 text-xs text-barber-paper/90">
                        {s.fullTextMd.trim()}
                      </pre>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {storyTrim ? (
          <section className="mb-4 rounded border border-barber-gold/25 bg-black/15 p-3 print:break-before-page">
            <h3 className="mb-2 text-sm font-semibold text-barber-paper">
              Storia del personaggio{storyInPdf ? " (inclusa nel PDF)" : ""}
            </h3>
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
