"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  COMBAT_CONDITIONS,
  COMBAT_STATUS_CATALOG,
  getCombatStatusDefinition,
  normalizeCombatConditions,
  isSingleUseStatus,
  type CombatConditionId,
  type CombatStatusDefinition,
} from "@/lib/combat-conditions";
import { reconcileEntryEffectsAndConditions } from "@/lib/fight-mode/state-transitions";
import type { ActiveConcentration, CombatEffectInstance } from "@/lib/fight-mode/types";
import type { AddCombatEffectPayload } from "@/lib/fight-mode/state-transitions";
import { cn } from "@/lib/utils";

function EffectBadgeDescription({
  effect,
  def,
}: {
  effect: CombatEffectInstance;
  def?: CombatStatusDefinition;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const cancelClose = () => clearTimeout(timer.current);
  const close = () => {
    cancelClose();
    timer.current = setTimeout(() => setOpen(false), 180);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const icon = def?.icon ?? "✨";
  const label = effect.label || def?.label || effect.statusId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] font-medium hover:bg-white/10 focus-visible:outline focus-visible:outline-amber-400"
          onMouseEnter={() => {
            cancelClose();
            setOpen(true);
          }}
          onMouseLeave={close}
          aria-label={`Descrizione: ${label}`}
        >
          <span>{icon}</span>
          <span className="truncate max-w-[110px]">{label}</span>
          {effect.concentrationId ? (
            <span
              className="rounded bg-amber-500/30 px-1 text-[9px] font-mono font-bold text-amber-200"
              title="Collegato a Concentrazione"
            >
              C
            </span>
          ) : null}
          {effect.sourceName ? (
            <span className="truncate max-w-[75px] text-[9px] opacity-75">
              ({effect.sourceName})
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[min(70vh,32rem)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto border-amber-600/30 bg-zinc-900 p-3 text-zinc-100 shadow-xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={cancelClose}
        onMouseLeave={close}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm text-amber-200">
            {icon} {label}
          </p>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
            Rimozione manuale
          </span>
        </div>
        {effect.sourceName ? (
          <p className="mt-1 text-xs text-amber-300/90">
            Fonte: <span className="font-semibold">{effect.sourceName}</span>
            {effect.concentrationId ? " · 🔗 Concentrazione" : ""}
          </p>
        ) : null}
        {def?.page ? (
          <p className="mb-2 mt-1 text-[11px] text-zinc-400">
            Manuale del Giocatore · Appendice A · p. {def.page}
            {def.id === "pietrificato" ? "–292" : ""}
          </p>
        ) : null}
        <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-zinc-200">
          {def?.paragraphs && def.paragraphs.length > 0 ? (
            def.paragraphs.map((paragraph) => (
              <p className="whitespace-pre-line" key={paragraph}>
                {paragraph}
              </p>
            ))
          ) : (
            <p>{def?.summary ?? "Stato personalizzato applicato manualmente dal Master."}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type CombatantOption = {
  id: string;
  name: string;
};

type ConditionsCellProps = {
  entryId?: string;
  name: string;
  value?: CombatConditionId[];
  activeEffects?: CombatEffectInstance[];
  activeConcentration?: ActiveConcentration | null;
  allCombatants?: CombatantOption[];
  onChange: (conditions: CombatConditionId[]) => void;
  onAddEffect?: (payload: AddCombatEffectPayload) => void;
  onRemoveEffect?: (effectId: string) => void;
  onStartConcentration?: (payload: {
    casterId: string;
    spellName: string;
    effectStatusId?: string;
    targetIds?: string[];
  }) => void;
  onBreakConcentration?: () => void;
  onConsumeEffect?: (effectId: string) => void;
};

export function ConditionsCell({
  entryId = "entry",
  name,
  value,
  activeEffects,
  activeConcentration,
  allCombatants = [],
  onChange,
  onAddEffect,
  onRemoveEffect,
  onStartConcentration,
  onBreakConcentration,
  onConsumeEffect,
}: ConditionsCellProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"condition" | "buff" | "tactical" | "custom" | "concentration">(
    "condition"
  );
  const [sourceCasterId, setSourceCasterId] = useState<string>("");
  const [sourceLabelDraft, setSourceLabelDraft] = useState<string>("");
  const [linkConcDraft, setLinkConcDraft] = useState<boolean>(false);
  const [customStatusLabel, setCustomStatusLabel] = useState<string>("");
  const [concSpellName, setConcSpellName] = useState<string>("");
  const [concStatusId, setConcStatusId] = useState<string>("");
  const [concTargetIds, setConcTargetIds] = useState<string[]>([]);

  const reconciled = reconcileEntryEffectsAndConditions(entryId, activeEffects, value);
  const effects = reconciled.activeEffects;
  const canonicalSelected = reconciled.conditions;

  const handleSelectStatus = (def: CombatStatusDefinition) => {
    if (onAddEffect) {
      const effectiveCasterId = sourceCasterId || undefined;
      const shouldLink = effectiveCasterId ? (linkConcDraft || Boolean(def.requiresConcentration)) : false;
      onAddEffect({
        targetIds: [entryId],
        statusId: def.id,
        sourceCasterId: effectiveCasterId,
        sourceName: sourceLabelDraft.trim() || undefined,
        linkToConcentration: shouldLink,
        concentrationSpellName: def.label,
      });
      setPickerOpen(false);
      return;
    }

    // Fallback puramente legacy se onAddEffect non è passato
    if (COMBAT_CONDITIONS.some((c) => c.id === def.id)) {
      onChange(normalizeCombatConditions([...canonicalSelected, def.id]));
      setPickerOpen(false);
    }
  };

  const handleAddCustomStatus = () => {
    const clean = customStatusLabel.trim();
    if (!clean || !onAddEffect) return;
    const effectiveCasterId = sourceCasterId || undefined;
    onAddEffect({
      targetIds: [entryId],
      customLabel: clean,
      sourceCasterId: effectiveCasterId,
      sourceName: sourceLabelDraft.trim() || undefined,
      linkToConcentration: effectiveCasterId ? linkConcDraft : false,
      concentrationSpellName: clean,
    });
    setCustomStatusLabel("");
    setPickerOpen(false);
  };

  const handleStartManualConcentration = () => {
    const cleanSpell = concSpellName.trim();
    if (!cleanSpell || !onStartConcentration) return;
    onStartConcentration({
      casterId: entryId,
      spellName: cleanSpell,
      effectStatusId: concStatusId || undefined,
      targetIds: concStatusId && concTargetIds.length > 0 ? concTargetIds : undefined,
    });
    setConcSpellName("");
    setConcStatusId("");
    setConcTargetIds([]);
    setPickerOpen(false);
  };

  const handleRemoveBadge = (eff: CombatEffectInstance) => {
    if (onRemoveEffect) {
      onRemoveEffect(eff.effectId);
      return;
    }
    onChange(canonicalSelected.filter((id) => id !== eff.statusId));
  };

  const conditionsList = COMBAT_STATUS_CATALOG.filter((s) => s.category === "condition");
  const buffsList = COMBAT_STATUS_CATALOG.filter((s) => s.category === "buff");
  const tacticalList = COMBAT_STATUS_CATALOG.filter((s) => s.category === "tactical");

  return (
    <div className="flex min-w-[160px] max-w-[280px] flex-col gap-1.5">
      {/* Concentrazione Attiva del Combattente */}
      {activeConcentration ? (
        <div className="flex items-center justify-between gap-1 rounded border border-amber-500/60 bg-amber-950/70 px-2 py-1 text-[11px] text-amber-200 shadow-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 font-semibold">
              <Sparkles className="h-3 w-3 shrink-0 text-amber-400" />
              <span className="truncate" title={`Concentrato su: ${activeConcentration.spellName}`}>
                Conc: {activeConcentration.spellName}
              </span>
            </div>
            {activeConcentration.linkedEffectIds.length > 0 ? (
              <span className="block text-[9px] text-amber-300/80">
                {activeConcentration.linkedEffectIds.length}{" "}
                {activeConcentration.linkedEffectIds.length === 1 ? "effetto collegato" : "effetti collegati"}
              </span>
            ) : (
              <span className="block text-[9px] text-amber-300/70">Incantesimo attivo (senza bersagli)</span>
            )}
          </div>
          {onBreakConcentration ? (
            <button
              type="button"
              onClick={onBreakConcentration}
              aria-label={`Interrompi concentrazione di ${name}`}
              title="Interrompi concentrazione (rimuove gli effetti collegati)"
              className="rounded p-1 text-amber-300 hover:bg-red-950/80 hover:text-red-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Trigger Popover Catalogo Esteso */}
      <div className="flex items-center gap-1">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Aggiungi stato a ${name}`}
              className="flex h-7 flex-1 items-center justify-between rounded border border-amber-600/30 bg-zinc-900 px-2 text-xs text-zinc-200 hover:border-amber-500/60 hover:bg-zinc-800"
            >
              <span className="truncate">+ Stato / Buff / Conc…</span>
              <Plus className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-80 sm:w-96 border-amber-600/40 bg-[#140e0a] p-3 text-zinc-100 shadow-2xl space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-amber-600/20 pb-1.5">
              <span className="font-cinzel text-xs font-bold text-amber-300">
                Stati, Buff &amp; Concentrazione ({name})
              </span>
              <span className="text-[10px] font-mono text-zinc-400">Rimozione manuale</span>
            </div>

            {/* Tabs Categoria */}
            <div className="grid grid-cols-5 gap-1 rounded bg-black/50 p-1 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("condition")}
                className={cn(
                  "rounded py-1 px-1 transition-colors",
                  activeTab === "condition"
                    ? "bg-rose-950 text-rose-200 border border-rose-500/40"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                🔴 Condiz.
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("buff")}
                className={cn(
                  "rounded py-1 px-1 transition-colors",
                  activeTab === "buff"
                    ? "bg-emerald-950 text-emerald-200 border border-emerald-500/40"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                🟢 Buff
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tactical")}
                className={cn(
                  "rounded py-1 px-1 transition-colors",
                  activeTab === "tactical"
                    ? "bg-sky-950 text-sky-200 border border-sky-500/40"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                🔵 Tattici
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("custom")}
                className={cn(
                  "rounded py-1 px-1 transition-colors",
                  activeTab === "custom"
                    ? "bg-purple-950 text-purple-200 border border-purple-500/40"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                ✨ Custom
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("concentration")}
                className={cn(
                  "rounded py-1 px-1 transition-colors",
                  activeTab === "concentration"
                    ? "bg-amber-950 text-amber-200 border border-amber-500/40"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                🔮 Conc.
              </button>
            </div>

            {/* Opzioni Fonte & Concentrazione per Condizioni/Buff/Tattici/Custom */}
            {activeTab !== "concentration" && allCombatants.length > 0 ? (
              <div className="rounded border border-amber-600/20 bg-black/40 p-2 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-zinc-400 shrink-0">Fonte / Caster:</label>
                  <select
                    aria-label="Seleziona caster o fonte dell'effetto"
                    value={sourceCasterId}
                    onChange={(e) => setSourceCasterId(e.target.value)}
                    className="h-6 flex-1 rounded border border-zinc-700 bg-zinc-900 px-1.5 text-[11px] text-zinc-100"
                  >
                    <option value="">Nessuna fonte specifica</option>
                    {allCombatants.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Input
                    type="text"
                    value={sourceLabelDraft}
                    onChange={(e) => setSourceLabelDraft(e.target.value)}
                    placeholder="Etichetta fonte opz. (es. Veleno Ragno)"
                    className="h-6 flex-1 bg-zinc-900 px-2 text-[11px] text-zinc-100 border-zinc-700"
                  />
                  {sourceCasterId ? (
                    <label className="flex items-center gap-1 text-[10px] text-amber-300 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={linkConcDraft}
                        onChange={(e) => setLinkConcDraft(e.target.checked)}
                        className="accent-amber-500"
                      />
                      Concentrazione
                    </label>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Lista Stati per Tab */}
            {(activeTab === "condition" || activeTab === "buff" || activeTab === "tactical") && (
              <div className="max-h-52 overflow-y-auto grid grid-cols-2 gap-1 pr-0.5">
                {(activeTab === "condition"
                  ? conditionsList
                  : activeTab === "buff"
                  ? buffsList
                  : tacticalList
                ).map((def) => (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => handleSelectStatus(def)}
                    className={cn(
                      "flex items-center justify-between gap-1 rounded border px-2 py-1.5 text-left text-xs transition-colors hover:brightness-125",
                      def.colorClass
                    )}
                  >
                    <span className="truncate font-medium">
                      {def.icon} {def.label}
                    </span>
                    {def.requiresConcentration ? (
                      <span
                        className="rounded bg-amber-500/20 px-1 text-[9px] font-mono text-amber-300 shrink-0"
                        title="Richiede concentrazione se associato a un caster"
                      >
                        C
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}

            {/* Tab Stato Custom */}
            {activeTab === "custom" && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-zinc-400">
                  Crea uno stato personalizzato su <strong>{name}</strong> (rimozione manuale).
                </p>
                <div className="flex gap-1.5">
                  <Input
                    type="text"
                    value={customStatusLabel}
                    onChange={(e) => setCustomStatusLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomStatus();
                      }
                    }}
                    placeholder="Es. Maledetto, Guardia Alta, +2 Danni..."
                    className="h-8 bg-zinc-900 text-xs text-zinc-100 border-amber-600/40"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomStatus}
                    disabled={!customStatusLabel.trim()}
                    className="h-8 bg-amber-600 text-zinc-950 hover:bg-amber-500 text-xs font-bold"
                  >
                    Applica
                  </Button>
                </div>
              </div>
            )}

            {/* Tab Concentrazione Manuale */}
            {activeTab === "concentration" && (
              <div className="space-y-2 pt-1 text-xs">
                <p className="text-[11px] text-zinc-400">
                  Avvia o sostituisci la concentrazione di <strong>{name}</strong> (anche per incantesimi da zona come{" "}
                  <em>Guardiani Spirituali</em> o con effetti su più bersagli).
                </p>
                <Input
                  type="text"
                  value={concSpellName}
                  onChange={(e) => setConcSpellName(e.target.value)}
                  placeholder="Nome incantesimo (es. Guardiani Spirituali, Benedizione)"
                  className="h-8 bg-zinc-900 text-xs text-zinc-100 border-amber-600/40"
                />
                <div className="space-y-1">
                  <label className="block text-[10px] text-zinc-400">
                    Effetto collegato sui bersagli (opzionale):
                  </label>
                  <select
                    value={concStatusId}
                    onChange={(e) => setConcStatusId(e.target.value)}
                    className="h-7 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                  >
                    <option value="">Nessun effetto su bersagli (solo concentrazione)</option>
                    {COMBAT_STATUS_CATALOG.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                {concStatusId && allCombatants.length > 0 ? (
                  <div className="space-y-1">
                    <span className="block text-[10px] text-zinc-400">Seleziona bersagli collegati:</span>
                    <div className="max-h-28 overflow-y-auto grid grid-cols-2 gap-1 rounded border border-zinc-800 bg-black/40 p-1.5">
                      {allCombatants.map((c) => {
                        const checked = concTargetIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className="flex items-center gap-1.5 text-[11px] text-zinc-200 cursor-pointer truncate"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setConcTargetIds((prev) =>
                                  checked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                                )
                              }
                              className="accent-amber-500"
                            />
                            <span className="truncate">{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="flex justify-end gap-1.5 pt-1">
                  {activeConcentration && onBreakConcentration ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onBreakConcentration();
                        setPickerOpen(false);
                      }}
                      className="h-7 border-red-500/40 text-red-300 hover:bg-red-950/50 text-[11px]"
                    >
                      Interrompi Attuale
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleStartManualConcentration}
                    disabled={!concSpellName.trim()}
                    className="h-7 bg-amber-600 text-zinc-950 hover:bg-amber-500 text-[11px] font-bold"
                  >
                    Avvia Concentrazione
                  </Button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Lista Badge Istanze Attive */}
      {effects.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {effects.map((eff) => {
            const def = getCombatStatusDefinition(eff.statusId);
            const colorClass =
              def?.colorClass ?? "text-purple-200 border-purple-500/40 bg-purple-950/60";
            return (
              <div
                key={eff.effectId}
                className={cn(
                  "inline-flex items-center rounded border transition-colors",
                  colorClass
                )}
              >
                <EffectBadgeDescription effect={eff} def={def} />
                {eff.duration?.anchorRemoved ? (
                  <span
                    className="ml-1 rounded bg-red-950/80 px-1 text-[9px] font-mono text-red-300 border border-red-700/50"
                    title="L'ancora di questo effetto è stata rimossa dal combattimento. Durata sospesa: gestione manuale."
                  >
                    ⚠️ Ancora rimossa
                  </span>
                ) : eff.duration?.remainingTurns !== null && eff.duration?.remainingTurns !== undefined ? (
                  <span
                    className="ml-1 rounded bg-black/40 px-1 text-[9px] font-mono text-zinc-300"
                    title={`Durata residua: ${eff.duration.remainingTurns} turni`}
                  >
                    ⏱️ {eff.duration.remainingTurns}t
                  </span>
                ) : null}
                {isSingleUseStatus(eff.statusId) && onConsumeEffect ? (
                  <button
                    type="button"
                    onClick={() => onConsumeEffect(eff.effectId)}
                    className="ml-1 rounded bg-amber-500/25 px-1 py-0.5 text-[9px] font-bold text-amber-300 hover:bg-amber-500/40 border border-amber-500/30"
                    title={`Consuma ${eff.label} adesso`}
                  >
                    ⚡ Usa
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label={`Rimuovi ${eff.label} da ${name}`}
                  title={`Rimuovi ${eff.label}${eff.sourceName ? ` (${eff.sourceName})` : ""}`}
                  className="rounded p-1 text-zinc-400 hover:text-zinc-100 focus-visible:outline focus-visible:outline-amber-400"
                  onClick={() => handleRemoveBadge(eff)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
