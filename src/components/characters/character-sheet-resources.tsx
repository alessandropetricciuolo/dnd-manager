"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import type { CharacterSheetV1 } from "@/lib/character-sheet";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CharacterResourceState = {
  hit_points: number | null;
  rules_snapshot: Record<string, unknown>;
  updated_at: string;
};

type ResourceOperation =
  | { type: "hp"; hitPoints: number; tempHp: number }
  | { type: "toggleInspiration" }
  | { type: "spellSlot"; level: number; usedCount: number };

function getSnapshot(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function intValue(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function toRecord(character: CampaignCharacterRow): CharacterResourceState {
  return {
    hit_points: character.hit_points ?? null,
    rules_snapshot: getSnapshot(character.rules_snapshot),
    updated_at: character.updated_at,
  };
}

export function CharacterSheetResources({ character, sheet }: { character: CampaignCharacterRow; sheet: CharacterSheetV1 }) {
  const router = useRouter();
  const [state, setState] = useState(() => toRecord(character));
  const [damage, setDamage] = useState("");
  const [healing, setHealing] = useState("");
  const [tempHpDraft, setTempHpDraft] = useState("0");
  const [busy, setBusy] = useState(false);

  useEffect(() => setState(toRecord(character)), [character]);

  const snapshot = state.rules_snapshot;
  const maxHp = intValue(sheet.hpMax) ?? intValue(snapshot.max_hp);
  const currentHp = state.hit_points;
  const tempHp = intValue(snapshot.temp_hp) ?? 0;
  useEffect(() => setTempHpDraft(String(tempHp)), [tempHp]);
  const usedSpellSlots = getSnapshot(snapshot.usedSpellSlots);
  const slots = sheet.spellSlots !== undefined
    ? Object.entries(sheet.spellSlots).flatMap(([levelRaw, countRaw]) => {
      const level = intValue(Number(levelRaw));
      const count = intValue(countRaw);
      return level !== null && count !== null && level >= 1 && level <= 9 && count >= 0 ? [{ level, count }] : [];
    })
    : Array.isArray(snapshot.spellSlots)
    ? snapshot.spellSlots.flatMap((slot) => {
      if (!slot || typeof slot !== "object") return [];
      const item = slot as Record<string, unknown>;
      const level = intValue(item.level);
      const count = intValue(item.count);
      return level !== null && count !== null && level >= 1 && level <= 9 && count >= 0 ? [{ level, count }] : [];
    })
    : [];
  const canTrackHp = currentHp !== null && maxHp !== null && maxHp >= 0;
  const inspiration = Boolean(snapshot.inspiration);

  async function save(operation: ResourceOperation) {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (error || !accessToken) {
        toast.error("Accedi di nuovo per aggiornare le risorse.");
        return;
      }
      const response = await fetch(`/api/mobile/characters/${encodeURIComponent(character.id)}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ expectedUpdatedAt: state.updated_at, operation }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; character?: Record<string, unknown> };
      if (response.status === 409) {
        toast.error("La scheda è cambiata su un altro dispositivo. Ho ricaricato i dati: riprova.");
        router.refresh();
        return;
      }
      if (!response.ok || !result.character) {
        toast.error(result.error === "max_hp_unavailable" ? "Il massimo dei PF non è disponibile: chiedi al Master di completare la scheda." : "Non è stato possibile salvare le risorse. Riprova.");
        return;
      }
      const saved = result.character;
      setState({
        hit_points: typeof saved.hit_points === "number" ? saved.hit_points : null,
        rules_snapshot: getSnapshot(saved.rules_snapshot),
        updated_at: typeof saved.updated_at === "string" ? saved.updated_at : state.updated_at,
      });
      setDamage("");
      setHealing("");
      router.refresh();
      toast.success("Risorse aggiornate.");
    } catch {
      toast.error("Errore di rete durante il salvataggio delle risorse.");
    } finally {
      setBusy(false);
    }
  }

  function applyDamageOrHealing(amountRaw: string, direction: "damage" | "healing") {
    if (!canTrackHp || currentHp === null || maxHp === null) return;
    const amount = Number(amountRaw);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Inserisci una quantità intera maggiore di zero.");
      return;
    }
    if (direction === "damage") {
      const absorbed = Math.min(tempHp, amount);
      void save({ type: "hp", hitPoints: Math.max(0, currentHp - (amount - absorbed)), tempHp: tempHp - absorbed });
    } else {
      void save({ type: "hp", hitPoints: Math.min(maxHp, currentHp + amount), tempHp });
    }
  }

  return (
    <section className="space-y-3 border-t border-barber-gold/20 pt-4" aria-labelledby="character-resources-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 id="character-resources-heading" className="font-cinzel text-base font-semibold text-barber-gold">Risorse di gioco</h3><p className="text-xs text-barber-paper/60">Le modifiche si salvano e si sincronizzano con l’app.</p></div>
        <Button type="button" size="sm" variant={inspiration ? "default" : "outline"} disabled={busy} onClick={() => void save({ type: "toggleInspiration" })}>{busy ? "Salvataggio…" : inspiration ? "Ispirazione · attiva" : "Attiva ispirazione"}</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-3 rounded border border-barber-gold/20 p-3">
          <div className="flex items-baseline justify-between gap-2"><h4 className="font-medium">Punti ferita</h4><span className="tabular-nums">{currentHp === null ? "Non disponibili" : `${currentHp} / ${maxHp ?? "—"}`}</span></div>
          {canTrackHp ? <>
            <div className="grid grid-cols-[1fr_auto] gap-2"><Input aria-label="Danno da applicare" type="number" min={1} value={damage} onChange={(e) => setDamage(e.target.value)} placeholder="Danno" disabled={busy} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /><Button type="button" variant="outline" disabled={busy || !damage} onClick={() => applyDamageOrHealing(damage, "damage")}>Subisci danno</Button></div>
            <div className="grid grid-cols-[1fr_auto] gap-2"><Input aria-label="PF da recuperare" type="number" min={1} value={healing} onChange={(e) => setHealing(e.target.value)} placeholder="PF da recuperare" disabled={busy} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /><Button type="button" variant="outline" disabled={busy || !healing} onClick={() => applyDamageOrHealing(healing, "healing")}>Cura</Button></div>
            <div className="space-y-1"><label htmlFor={`temp-hp-${character.id}`} className="text-xs text-barber-paper/65">Punti ferita temporanei</label><div className="grid grid-cols-[1fr_auto] gap-2"><Input id={`temp-hp-${character.id}`} type="number" min={0} max={1000000} value={tempHpDraft} onChange={(e) => setTempHpDraft(e.target.value)} disabled={busy} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /><Button type="button" variant="outline" disabled={busy || !Number.isInteger(Number(tempHpDraft)) || Number(tempHpDraft) < 0} onClick={() => { if (currentHp !== null) void save({ type: "hp", hitPoints: currentHp, tempHp: Number(tempHpDraft) }); }}>Salva</Button></div></div>
          </> : <p className="text-xs text-barber-paper/60">Il massimo dei PF non è stato ancora salvato. Le risorse diventano modificabili quando la scheda contiene PF massimi e PF correnti reali.</p>}
        </div>

        <div className="space-y-2 rounded border border-barber-gold/20 p-3">
          <h4 className="font-medium">Slot incantesimo usati</h4>
          {slots.length ? <div className="space-y-2">{slots.map(({ level, count }) => {
            const used = Math.min(count, Math.max(0, intValue(usedSpellSlots[String(level)]) ?? 0));
            return <div key={level} className="flex items-center justify-between gap-3 text-sm"><span>Livello {level}: {used} / {count} usati</span><div className="flex gap-1"><Button type="button" size="sm" variant="outline" aria-label={`Consuma uno slot di livello ${level}`} disabled={busy || used >= count} onClick={() => void save({ type: "spellSlot", level, usedCount: used + 1 })}>Usa</Button><Button type="button" size="sm" variant="ghost" aria-label={`Ripristina uno slot di livello ${level}`} disabled={busy || used <= 0} onClick={() => void save({ type: "spellSlot", level, usedCount: used - 1 })}>Ripristina</Button></div></div>;
          })}</div> : <p className="text-sm text-barber-paper/55">Gli slot non sono stati compilati nella scheda.</p>}
        </div>
      </div>
    </section>
  );
}
