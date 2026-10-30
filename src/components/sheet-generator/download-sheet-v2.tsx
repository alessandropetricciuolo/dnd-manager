"use client";

import { useState } from "react";
import type { GeneratedCharacterSheet, SkillKey } from "@/lib/sheet-generator/types";
import { SKILL_LABELS } from "@/lib/sheet-generator/bard-print-model";

export function DownloadSheetV2({ sheet, input }: { sheet: GeneratedCharacterSheet; input: Record<string, string> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bonusSkills, setBonusSkills] = useState<SkillKey[] | null>(null);
  const lore = sheet.level >= 3 && /sapienza/i.test(sheet.classSubclass ?? "");
  const available = (Object.keys(sheet.skills) as SkillKey[]).filter((k) => !sheet.skills[k].proficient);
  const chosen = bonusSkills ?? available.slice(0, 3);

  async function download() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/sheet-pdf-v2", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, bonusSkills: lore ? chosen : [] }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? "Esportazione non riuscita."); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `${sheet.characterName || "scheda"}-v2.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) { setError(e instanceof Error ? e.message : "Errore esportazione."); }
    finally { setBusy(false); }
  }

  return <section className="my-5 space-y-3 rounded-lg border border-barber-gold/40 p-4" aria-label="Esportazione scheda V2">
    <h2 className="font-semibold text-barber-gold">Scheda fantasy V2</h2>
    {lore && <fieldset disabled={busy}>
      <legend className="mb-2 text-sm">Collegio della Sapienza: scegli tre competenze aggiuntive ({chosen.length}/3)</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{available.map((key) => <label key={key} className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={chosen.includes(key)} onChange={(e) => setBonusSkills(e.target.checked ? [...chosen, key] : chosen.filter((v) => v !== key))} disabled={!chosen.includes(key) && chosen.length >= 3} />
        {SKILL_LABELS[key]}
      </label>)}</div>
    </fieldset>}
    <p className="text-sm text-barber-paper/70">PDF completo con risorse, capacità del livello attuale, dotazione e tabella degli incantesimi.</p>
    <button type="button" onClick={download} disabled={busy || (lore && chosen.length !== 3)} className="rounded-md bg-barber-red px-5 py-3 text-sm font-medium text-barber-paper disabled:opacity-60">
      {busy ? "Preparazione della scheda V2…" : "Genera scheda V2"}
    </button>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </section>;
}
