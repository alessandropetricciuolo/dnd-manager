"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import {
  resolveCharacterHitDice,
  resolveCharacterMaxHp,
  resolveCharacterSpellSlots,
  type CharacterSheetV1,
} from "@/lib/character-sheet";
import { operationTouchesSessionLiveResources, type MobileCharacterOperation } from "@/lib/mobile-character-state";
import { SESSION_LIVE_RESOURCES_LOCKED } from "../../../mobile/src/lib/session-live";
import { useSessionLiveCharacter } from "./use-session-live-character";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CharacterResourceState = {
  hit_points: number | null;
  coins_gp: number;
  coins_sp: number;
  coins_cp: number;
  rules_snapshot: Record<string, unknown>;
  updated_at: string;
};

function getSnapshot(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function intValue(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function toRecord(character: CampaignCharacterRow): CharacterResourceState {
  return {
    hit_points: character.hit_points ?? null,
    coins_gp: character.coins_gp ?? 0,
    coins_sp: character.coins_sp ?? 0,
    coins_cp: character.coins_cp ?? 0,
    rules_snapshot: getSnapshot(character.rules_snapshot),
    updated_at: character.updated_at,
  };
}

const EXHAUSTION_HINTS: Record<number, string> = {
  1: "Svantaggio alle prove di caratteristica",
  2: "Velocità dimezzata",
  3: "Svantaggio a tiri per colpire e tiri salvezza",
  4: "PF massimi dimezzati",
  5: "Velocità ridotta a 0",
  6: "Morte",
};

export function CharacterSheetResources({
  character,
  sheet,
  isLongCampaign = false,
}: {
  character: CampaignCharacterRow;
  sheet?: CharacterSheetV1 | null;
  isLongCampaign?: boolean;
}) {
  const router = useRouter();
  const { resources: live, stale } = useSessionLiveCharacter(character.id, () => router.refresh());
  const [state, setState] = useState(() => toRecord(character));
  const [damage, setDamage] = useState("");
  const [healing, setHealing] = useState("");
  const [tempHpDraft, setTempHpDraft] = useState("0");
  const [gpDraft, setGpDraft] = useState(String(character.coins_gp ?? 0));
  const [spDraft, setSpDraft] = useState(String(character.coins_sp ?? 0));
  const [cpDraft, setCpDraft] = useState(String(character.coins_cp ?? 0));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = toRecord(character);
    setState(next);
    setGpDraft(String(next.coins_gp));
    setSpDraft(String(next.coins_sp));
    setCpDraft(String(next.coins_cp));
  }, [character]);

  const snapshot = state.rules_snapshot;
  const maxHp = resolveCharacterMaxHp(snapshot);
  const currentHp = live?.hitPoints ?? state.hit_points;
  const tempHp = live?.tempHp ?? intValue(snapshot.temp_hp) ?? 0;
  useEffect(() => setTempHpDraft(String(tempHp)), [tempHp]);

  const hitDice = resolveCharacterHitDice(snapshot);
  const conScore = sheet?.abilities?.con ?? intValue((snapshot.abilities as Record<string, unknown> | undefined)?.con);
  const conMod = sheet?.abilityMods?.con ?? (typeof conScore === "number" ? Math.floor((conScore - 10) / 2) : 0);

  const deathSavesRaw = live?.deathSaves ?? getSnapshot(snapshot.death_saves);
  const deathSuccesses = intValue(deathSavesRaw.successes) ?? 0;
  const deathFailures = intValue(deathSavesRaw.failures) ?? 0;
  const exhaustion = intValue(snapshot.exhaustion) ?? 0;

  const trackedFeatures = (Array.isArray(snapshot.features) ? snapshot.features : []).flatMap((f) => {
    if (!f || typeof f !== "object") return [];
    const rec = f as Record<string, unknown>;
    if (typeof rec.id !== "string" || typeof rec.name !== "string" || typeof rec.usesMax !== "number") return [];
    return [
      {
        id: rec.id,
        name: rec.name,
        usesMax: rec.usesMax,
        usesCurrent: typeof rec.usesCurrent === "number" ? rec.usesCurrent : rec.usesMax,
        resetOn: rec.resetOn === "shortRest" ? "Riposo breve" : "Riposo lungo",
      },
    ];
  });

  const usedSpellSlots = live?.usedSpellSlots ?? getSnapshot(snapshot.usedSpellSlots);
  const slots = resolveCharacterSpellSlots(snapshot);
  const canTrackHp = currentHp !== null && maxHp !== null && maxHp >= 0;
  const inspiration = Boolean(snapshot.inspiration);

  const touchesLive = (operation: MobileCharacterOperation) =>
    operationTouchesSessionLiveResources({ ...state, character_class: character.character_class }, operation);

  async function save(operation: MobileCharacterOperation, toastMsg = "Risorse aggiornate.") {
    if (busy || (live && touchesLive(operation))) return;
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (error || !accessToken) {
        toast.error("Accedi di nuovo per aggiornare le risorse.");
        return;
      }
      let expectedUpdatedAt = state.updated_at;
      if (live) {
        const { data: revision, error: revisionError } = await supabase.from("campaign_characters")
          .select("updated_at").eq("id", character.id).maybeSingle();
        if (revisionError || !revision?.updated_at) {
          toast.error("Impossibile leggere la revisione della scheda.");
          return;
        }
        expectedUpdatedAt = revision.updated_at;
      }
      const response = await fetch(`/api/mobile/characters/${encodeURIComponent(character.id)}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ expectedUpdatedAt, operation }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        character?: Record<string, unknown>;
      };
      if (response.status === 409) {
        toast.error("La scheda è cambiata su un altro dispositivo. Ho ricaricato i dati: riprova.");
        router.refresh();
        return;
      }
      if (result.error === SESSION_LIVE_RESOURCES_LOCKED) {
        toast.info("Sessione live · Risorse gestite dal GM.");
        return;
      }
      if (!response.ok || !result.character) {
        toast.error(
          result.error === "max_hp_unavailable"
            ? "Il massimo dei PF non è disponibile: chiedi al Master di completare la scheda."
            : result.error === "hit_dice_unavailable"
              ? "Nessun Dado Vita disponibile."
              : "Non è stato possibile salvare le risorse. Riprova.",
        );
        return;
      }
      const saved = result.character;
      setState({
        hit_points: typeof saved.hit_points === "number" ? saved.hit_points : null,
        coins_gp: typeof saved.coins_gp === "number" ? saved.coins_gp : state.coins_gp,
        coins_sp: typeof saved.coins_sp === "number" ? saved.coins_sp : state.coins_sp,
        coins_cp: typeof saved.coins_cp === "number" ? saved.coins_cp : state.coins_cp,
        rules_snapshot: getSnapshot(saved.rules_snapshot),
        updated_at: typeof saved.updated_at === "string" ? saved.updated_at : state.updated_at,
      });
      setDamage("");
      setHealing("");
      router.refresh();
      toast.success(toastMsg);
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

  function spendHitDieAndHeal() {
    if (!hitDice || hitDice.current <= 0 || !canTrackHp || currentHp === null || maxHp === null) return;
    const faces = Number.parseInt(hitDice.die.match(/d(\d+)/i)?.[1] ?? "8", 10) || 8;
    const roll = Math.floor(Math.random() * faces) + 1;
    const healed = Math.max(1, roll + conMod);
    void save(
      { type: "shortRestHitDie", hitPoints: Math.min(maxHp, currentHp + healed) },
      `Dado Vita tirato: 1${hitDice.die} (${roll}) ${conMod >= 0 ? `+ ${conMod}` : `- ${Math.abs(conMod)}`} = +${healed} PF!`,
    );
  }

  function rollDeathSaveWeb() {
    const roll = Math.floor(Math.random() * 20) + 1;
    if (roll === 20) {
      void save({ type: "hp", hitPoints: 1 }, "20 Naturale! Ti risvegli a 1 PF!");
    } else if (roll === 1) {
      void save({ type: "deathSaves", successes: deathSuccesses, failures: Math.min(3, deathFailures + 2) }, `1 Naturale! 2 fallimenti TS Morte.`);
    } else if (roll >= 10) {
      void save({ type: "deathSaves", successes: Math.min(3, deathSuccesses + 1), failures: deathFailures }, `Tiro ${roll}: Successo TS Morte!`);
    } else {
      void save({ type: "deathSaves", successes: deathSuccesses, failures: Math.min(3, deathFailures + 1) }, `Tiro ${roll}: Fallimento TS Morte.`);
    }
  }

  return (
    <section className="space-y-3 border-t border-barber-gold/20 pt-4" aria-labelledby="character-resources-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="character-resources-heading" className="font-cinzel text-base font-semibold text-barber-gold">
            Risorse di gioco e Riposi
          </h3>
          <p className="text-xs text-barber-paper/60">Sincronizzate in tempo reale tra sito web e app mobile.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={inspiration ? "default" : "outline"}
            disabled={busy}
            onClick={() => void save({ type: "toggleInspiration" })}
          >
            {inspiration ? "Ispirazione · attiva" : "Attiva ispirazione"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || Boolean(live && touchesLive({ type: "shortRest" }))}
            onClick={() => void save({ type: "shortRest" }, "Riposo Breve completato.")}
          >
            Riposo Breve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || Boolean(live) || maxHp === null}
            onClick={() => void save({ type: "longRest" }, "Riposo Lungo completato: PF, slot e risorse ripristinati.")}
          >
            Riposo Lungo
          </Button>
        </div>
      </div>

      {live && (
        <div className="rounded border border-emerald-700/40 px-3 py-2 text-sm text-emerald-200" role="status">
          <p className="font-medium">Sessione live · Gestita dal GM</p>
          {stale && <p className="text-xs">Ultimo aggiornamento ricevuto. I dati potrebbero essere superati.</p>}
          {live.conditions.length > 0 && <p className="text-xs">Condizioni · {live.conditions.join(" · ")}</p>}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {/* PUNTI FERITA + DADI VITA + TS MORTE */}
        <div className="space-y-3 rounded border border-barber-gold/20 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="font-medium">Punti ferita</h4>
            <span className="tabular-nums font-semibold">
              {currentHp === null ? "Non disponibili" : `${currentHp} / ${maxHp ?? "—"}${tempHp > 0 ? ` (+${tempHp} temp)` : ""}`}
            </span>
          </div>
          {canTrackHp && !live ? (
            <>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  aria-label="Danno da applicare"
                  type="number"
                  min={1}
                  value={damage}
                  onChange={(e) => setDamage(e.target.value)}
                  placeholder="Danno"
                  disabled={busy}
                  className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                />
                <Button type="button" variant="outline" disabled={busy || !damage} onClick={() => applyDamageOrHealing(damage, "damage")}>
                  Subisci danno
                </Button>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  aria-label="PF da recuperare"
                  type="number"
                  min={1}
                  value={healing}
                  onChange={(e) => setHealing(e.target.value)}
                  placeholder="PF da recuperare"
                  disabled={busy}
                  className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                />
                <Button type="button" variant="outline" disabled={busy || !healing} onClick={() => applyDamageOrHealing(healing, "healing")}>
                  Cura
                </Button>
              </div>
              <div className="space-y-1">
                <label htmlFor={`temp-hp-${character.id}`} className="text-xs text-barber-paper/65">
                  Punti ferita temporanei
                </label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    id={`temp-hp-${character.id}`}
                    type="number"
                    min={0}
                    max={1000000}
                    value={tempHpDraft}
                    onChange={(e) => setTempHpDraft(e.target.value)}
                    disabled={busy}
                    className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || !Number.isInteger(Number(tempHpDraft)) || Number(tempHpDraft) < 0}
                    onClick={() => {
                      if (currentHp !== null) void save({ type: "hp", hitPoints: currentHp, tempHp: Number(tempHpDraft) });
                    }}
                  >
                    Salva
                  </Button>
                </div>
              </div>
            </>
          ) : !canTrackHp ? (
            <p className="text-xs text-barber-paper/60">
              Il massimo dei PF o i PF correnti non sono stati ancora salvati.
            </p>
          ) : null}

          {/* Dadi Vita */}
          <div className="border-t border-barber-gold/15 pt-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Dadi Vita:{" "}
                <strong>{hitDice ? `${hitDice.current} / ${hitDice.total} (${hitDice.die})` : "Non compilati"}</strong>
              </span>
              {hitDice ? (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || Boolean(live) || hitDice.current <= 0 || !canTrackHp}
                    onClick={spendHitDieAndHeal}
                  >
                    Tira e cura
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy || hitDice.current <= 0}
                    onClick={() => void save({ type: "spendHitDie", count: 1 })}
                  >
                    -1 dado
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Tiri Salvezza contro Morte */}
          <div className="border-t border-barber-gold/15 pt-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-barber-paper/85">TS contro Morte</span>
              <Button type="button" size="sm" variant="outline" disabled={busy || Boolean(live)} onClick={rollDeathSaveWeb} className="h-7 text-xs">
                Tira d20
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-300">Successi:</span>
                {[1, 2, 3].map((n) => (
                  <button
                    key={`ds-s-${n}`}
                    type="button"
                    disabled={busy || Boolean(live)}
                    onClick={() => void save({ type: "deathSaves", successes: deathSuccesses >= n ? n - 1 : n, failures: deathFailures })}
                    className={`h-5 w-5 rounded-full border ${deathSuccesses >= n ? "border-emerald-400 bg-emerald-500" : "border-barber-gold/40 bg-black/40"}`}
                    aria-label={`Successi morte ${n}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-red-300">Fallimenti:</span>
                {[1, 2, 3].map((n) => (
                  <button
                    key={`ds-f-${n}`}
                    type="button"
                    disabled={busy || Boolean(live)}
                    onClick={() => void save({ type: "deathSaves", successes: deathSuccesses, failures: deathFailures >= n ? n - 1 : n })}
                    className={`h-5 w-5 rounded-full border ${deathFailures >= n ? "border-red-400 bg-red-600" : "border-barber-gold/40 bg-black/40"}`}
                    aria-label={`Fallimenti morte ${n}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Indebolimento (0-6) */}
          <div className="border-t border-barber-gold/15 pt-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span>
                Indebolimento: <strong className={exhaustion > 0 ? "text-amber-300" : ""}>{exhaustion} / 6</strong>
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  disabled={busy || exhaustion <= 0}
                  onClick={() => void save({ type: "exhaustion", level: exhaustion - 1 })}
                >
                  -1
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  disabled={busy || exhaustion >= 6}
                  onClick={() => void save({ type: "exhaustion", level: exhaustion + 1 })}
                >
                  +1
                </Button>
              </div>
            </div>
            {exhaustion > 0 ? <p className="mt-1 text-amber-200/85">Effetto attivo: {EXHAUSTION_HINTS[exhaustion]}</p> : null}
          </div>
        </div>

        {/* SLOT INCANTESIMO + CAPACITÀ A USI + MONETE */}
        <div className="space-y-3 rounded border border-barber-gold/20 p-3">
          <div>
            <h4 className="font-medium">Slot incantesimo</h4>
            {slots.length ? (
              <div className="mt-2 space-y-2">
                {slots.map(({ level, count }) => {
                  const used = Math.min(count, Math.max(0, intValue(usedSpellSlots[String(level)]) ?? 0));
                  return (
                    <div key={level} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        Liv. {level}°: <strong>{count - used}</strong> / {count} disponibili
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy || Boolean(live) || used >= count}
                          onClick={() => void save({ type: "spellSlot", level, usedCount: used + 1 })}
                        >
                          Usa
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy || Boolean(live) || used <= 0}
                          onClick={() => void save({ type: "spellSlot", level, usedCount: used - 1 })}
                        >
                          +1
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-1 text-xs text-barber-paper/55">Nessuno slot incantesimo attivo.</p>
            )}
          </div>

          {trackedFeatures.length > 0 ? (
            <div className="border-t border-barber-gold/15 pt-2.5">
              <h4 className="text-sm font-medium">Capacità a usi</h4>
              <div className="mt-2 space-y-2">
                {trackedFeatures.map((feat) => (
                  <div key={feat.id} className="flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-medium text-barber-paper">{feat.name}</span>{" "}
                      <span className="text-barber-gold">({feat.usesCurrent}/{feat.usesMax})</span>{" "}
                      <span className="text-barber-paper/50">· {feat.resetOn}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={busy || feat.usesCurrent <= 0}
                        onClick={() => void save({ type: "useFeature", featureId: feat.id })}
                      >
                        Usa
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        disabled={busy || feat.usesCurrent >= feat.usesMax}
                        onClick={() => void save({ type: "restoreFeature", featureId: feat.id })}
                      >
                        +1
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {isLongCampaign ? (
            <div className="border-t border-barber-gold/15 pt-2.5">
              <h4 className="text-sm font-medium text-barber-gold">Borsello Monete</h4>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-barber-paper/65">Oro (MO)</label>
                  <Input
                    type="number"
                    min={0}
                    value={gpDraft}
                    onChange={(e) => setGpDraft(e.target.value)}
                    disabled={busy}
                    className="h-8 border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-barber-paper/65">Argento (MA)</label>
                  <Input
                    type="number"
                    min={0}
                    value={spDraft}
                    onChange={(e) => setSpDraft(e.target.value)}
                    disabled={busy}
                    className="h-8 border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-barber-paper/65">Rame (MR)</label>
                  <Input
                    type="number"
                    min={0}
                    value={cpDraft}
                    onChange={(e) => setCpDraft(e.target.value)}
                    disabled={busy}
                    className="h-8 border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper"
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                className="mt-2 w-full text-xs"
                onClick={() => {
                  const gp = Math.max(0, Number.parseInt(gpDraft || "0", 10) || 0);
                  const sp = Math.max(0, Number.parseInt(spDraft || "0", 10) || 0);
                  const cp = Math.max(0, Number.parseInt(cpDraft || "0", 10) || 0);
                  void save({ type: "coins", gp, sp, cp }, "Borsello monete aggiornato.");
                }}
              >
                Salva Monete
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
