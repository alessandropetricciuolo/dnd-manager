"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import {
  Mic,
  MicOff,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  AlertCircle,
  X,
  HelpCircle,
  Shield,
  Heart,
  Flame,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useVoiceDictation } from "@/modules/command-center/voice/use-voice-dictation";
import {
  parseLocalCombatCommand,
  type SimpleCombatantRef,
} from "@/lib/fight-mode/command-parser";
import {
  initiativeStateSyncSignature,
  type ApplyCombatCommandResult,
  type UndoCombatCommandResult,
} from "@/lib/fight-mode/state-transitions";
import type {
  CombatCommandOperation,
  CombatCommandProposal,
} from "@/lib/fight-mode/types";
import type { InitiativeTrackerState } from "@/components/gm/initiative-tracker";
import { interpretCombatCommandWithAiAction } from "@/lib/actions/combat-command-ai-actions";

export type CombatCommandBarProps = {
  state: InitiativeTrackerState;
  onApplyProposal: (
    proposal: CombatCommandProposal,
    selectedOpIds?: string[]
  ) => ApplyCombatCommandResult;
  onUndoLastCommand?: () => UndoCombatCommandResult;
  campaignId?: string;
  className?: string;
};

function isMissingDataComplete(field: string, value: number | string | undefined): boolean {
  if (field === "amount") return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 10000;
  if (field === "exactHp") return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10000;
  if (field === "durationTurns") return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 10000;
  if (field === "sourceCasterId") return value === "manual" || (typeof value === "string" && value.length > 0);
  if (field === "casterId") return typeof value === "string" && value.length > 0;
  if (field === "spellName" || field === "statusId") return typeof value === "string" && value.trim().length > 0 && value.length <= 160;
  return false;
}

export function CombatCommandBar({
  state,
  onApplyProposal,
  onUndoLastCommand,
  campaignId,
  className = "",
}: CombatCommandBarProps) {
  const [inputText, setInputText] = useState("");
  const [activeProposal, setActiveProposal] = useState<CombatCommandProposal | null>(null);
  const [selectedOpIds, setSelectedOpIds] = useState<string[]>([]);
  const [isPendingAi, startAiTransition] = useTransition();
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Mappa per risoluzione inline di bersagli ambigui / dati mancanti
  const [resolvedAmbiguities, setResolvedAmbiguities] = useState<Record<string, string>>({});
  const [filledMissingData, setFilledMissingData] = useState<Record<string, number | string>>({});

  const combatantRefs: SimpleCombatantRef[] = useMemo(() => {
    return state.entries.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
    }));
  }, [state.entries]);

  // Hook per dettatura push-to-talk
  const voice = useVoiceDictation({
    language: "it-IT",
    onFinalTranscript: (piece) => {
      if (piece.trim()) {
        setInputText((prev) => {
          const cleanPrev = prev.trim();
          return cleanPrev ? `${cleanPrev} ${piece.trim()}` : piece.trim();
        });
      }
    },
  });

  // Aggiorna lo stato dei checkbox quando cambia la proposta
  useEffect(() => {
    if (activeProposal) {
      setSelectedOpIds(activeProposal.operations.map((op) => op.id));
      setResolvedAmbiguities({});
      setFilledMissingData({});
    }
  }, [activeProposal]);

  const currentSig = useMemo(() => initiativeStateSyncSignature(state), [state]);
  const isStale = activeProposal ? currentSig !== activeProposal.stateSignatureAtCreation : false;

  const handleRunLocalParse = () => {
    setActionError(null);
    setActionFeedback(null);
    const trimmed = inputText.trim();
    if (!trimmed) {
      setActionError("Inserisci o detta un comando prima di analizzare.");
      return;
    }
    const prop = parseLocalCombatCommand(trimmed, combatantRefs, currentSig);
    setActiveProposal(prop);
  };

  const handleRunAiParse = () => {
    setActionError(null);
    setActionFeedback(null);
    const trimmed = inputText.trim();
    if (!trimmed) {
      setActionError("Inserisci o detta un comando prima di richiedere l'IA.");
      return;
    }

    startAiTransition(async () => {
      const res = await interpretCombatCommandWithAiAction({
        campaignId,
        rawInput: trimmed,
        combatants: state.entries.map((e) => ({
          id: e.id,
          name: e.name,
          type: e.type,
          hp: e.hp,
          maxHp: e.maxHp,
        })),
        stateSignatureAtCreation: currentSig,
      });

      if (res.success) {
        setActiveProposal(res.proposal);
      } else {
        setActionError(res.error);
      }
    });
  };

  const handleApply = () => {
    if (!activeProposal) return;
    if (isStale) {
      setActionError("Lo stato del combattimento è cambiato dall'analisi della proposta. Rianalizza prima di applicare.");
      return;
    }

    // Costruisci le operazioni finali integrando eventuali valori risolti inline
    let finalOperations: CombatCommandOperation[] = activeProposal.operations.map((op) => {
      let modOp = { ...op };
      const missingField = activeProposal.missingData.find((item) => item.operationId === op.id)?.field;
      if (filledMissingData[op.id] !== undefined) {
        const val = filledMissingData[op.id];
        if (modOp.kind === "add_effect" && !modOp.sourceCasterId && modOp.linkToConcentration && typeof val === "string") {
          modOp = val === "manual"
            ? { ...modOp, linkToConcentration: false, sourceCasterId: undefined }
            : { ...modOp, linkToConcentration: true, sourceCasterId: val, sourceName: combatantRefs.find((c) => c.id === val)?.name };
        }
        if ((modOp.kind === "add_effect" || modOp.kind === "start_concentration") && typeof val === "string" && missingField === "spellName") {
          modOp = { ...modOp, spellName: val };
        }
        if (modOp.kind === "start_concentration" && typeof val === "string" && missingField === "casterId") {
          const caster = combatantRefs.find((c) => c.id === val);
          if (caster) modOp = { ...modOp, casterId: caster.id, casterName: caster.name };
        }
        if (typeof val === "number" && (modOp.kind === "damage" || modOp.kind === "heal")) {
          modOp = { ...modOp, amount: val };
        } else if (typeof val === "number" && modOp.kind === "set_exact_hp") {
          modOp = { ...modOp, exactHp: val };
        }
      }
      return modOp;
    });

    // Se ci sono bersagli ambigui risolti dal master nel popover, convertili in operazioni
    const resolvedTargetOperations: CombatCommandOperation[] = [];
    const unresolvedMissingData: CombatCommandProposal["missingData"] = [];
    const remainingUnresolved: CombatCommandProposal["unresolvedTargets"] = [];
    for (const [index, ut] of activeProposal.unresolvedTargets.entries()) {
      const target = combatantRefs.find((c) => c.id === resolvedAmbiguities[ut.query]);
      if (!target || !ut.intent) { remainingUnresolved.push(ut); continue; }
      const id = `resolved-${activeProposal.proposalId}-${index}`;
      const value = filledMissingData[`target:${ut.query}`];
      if (ut.intent.kind === "damage" || ut.intent.kind === "heal") {
        const amount = ut.intent.amount ?? (typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null);
        resolvedTargetOperations.push({ id, kind: ut.intent.kind, targetId: target.id, targetName: target.name, amount: amount ?? 0, ...(ut.intent.kind === "damage" && ut.intent.sourceLabel ? { sourceLabel: ut.intent.sourceLabel } : {}) });
        if (amount === null) unresolvedMissingData.push({ operationId: id, field: "amount", message: `Specifica i punti per ${ut.intent.kind === "damage" ? "il danno" : "la cura"} su ${target.name}.` });
      } else if (ut.intent.kind === "set_exact_hp") {
        const exactHp = ut.intent.exactHp ?? (typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null);
        resolvedTargetOperations.push({ id, kind: "set_exact_hp", targetId: target.id, targetName: target.name, exactHp: exactHp ?? 0 });
        if (exactHp === null) unresolvedMissingData.push({ operationId: id, field: "exactHp", message: `Specifica i PF esatti per ${target.name}.` });
      } else if (ut.intent.kind === "add_effect") {
        resolvedTargetOperations.push({ id, kind: "add_effect", targetId: target.id, targetName: target.name, statusId: ut.intent.statusId, label: ut.intent.label, linkToConcentration: ut.intent.linkToConcentration, spellName: ut.intent.spellName, durationTurns: ut.intent.durationTurns });
        if (ut.intent.linkToConcentration) unresolvedMissingData.push({ operationId: id, field: "sourceCasterId", message: `Seleziona il caster della concentrazione per ${ut.intent.label} su ${target.name}, oppure scegli di applicarla senza collegamento.` });
      } else {
        if (ut.intent.kind === "remove_effect") {
          resolvedTargetOperations.push({ id, kind: "remove_effect", targetId: target.id, targetName: target.name, statusId: ut.intent.statusId, effectId: ut.intent.effectId });
        } else if (ut.intent.kind === "start_concentration") {
          const spellName = ut.intent.spellName?.trim() || "";
          resolvedTargetOperations.push({ id, kind: "start_concentration", casterId: target.id, casterName: target.name, spellName: spellName || "Concentrazione", linkedStatusId: ut.intent.linkedStatusId });
          if (!spellName) unresolvedMissingData.push({ operationId: id, field: "spellName", message: `Specifica l'incantesimo per la concentrazione di ${target.name}.` });
        } else {
          resolvedTargetOperations.push({ id, kind: "break_concentration", casterId: target.id, casterName: target.name });
        }
      }
    }

    if (activeProposal.unresolvedTargets.length > 0) {
      if (remainingUnresolved.length === activeProposal.unresolvedTargets.length) {
        setActionError("Risolvi i bersagli prima di applicare la proposta.");
        return;
      }
      const reviewedProposal: CombatCommandProposal = {
        ...activeProposal,
        operations: [...activeProposal.operations, ...resolvedTargetOperations],
        unresolvedTargets: remainingUnresolved,
        missingData: [...activeProposal.missingData, ...unresolvedMissingData],
      };
      setActiveProposal(reviewedProposal);
      setActionFeedback("Bersagli risolti. Controlla le operazioni aggiunte e completa i dati richiesti.");
      return;
    }

    const proposalToApply: CombatCommandProposal = {
      ...activeProposal,
      operations: [...finalOperations, ...resolvedTargetOperations],
      unresolvedTargets: remainingUnresolved,
      missingData: [...activeProposal.missingData.filter((md) => !isMissingDataComplete(md.field, filledMissingData[md.operationId])), ...unresolvedMissingData],
    };

    const selectedMissing = proposalToApply.missingData.find((md) => selectedOpIds.includes(md.operationId));
    if (selectedMissing) {
      setActionError(selectedMissing.message);
      return;
    }

    const res = onApplyProposal(proposalToApply, [...selectedOpIds, ...resolvedTargetOperations.map((op) => op.id)]);
    if (res.success) {
      setActionFeedback(res.message);
      setActiveProposal(null);
      setInputText("");
    } else {
      setActionError(res.message);
    }
  };

  const handleUndo = () => {
    if (!onUndoLastCommand) return;
    setActionError(null);
    const res = onUndoLastCommand();
    if (res.undone) {
      setActionFeedback(res.message);
    } else {
      setActionError(res.message);
    }
  };

  const toggleOpSelection = (opId: string) => {
    setSelectedOpIds((prev) =>
      prev.includes(opId) ? prev.filter((id) => id !== opId) : [...prev, opId]
    );
  };

  const canUndo = Boolean(state.lastCommandUndoSnapshot);

  return (
    <div className={`flex flex-col gap-2 rounded-lg border border-border/60 bg-card/60 p-2.5 backdrop-blur-sm ${className}`}>
      {/* Barra principale compatta */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Pulsante Push-To-Talk vocale */}
        <Button
          type="button"
          size="sm"
          variant={voice.isListening ? "destructive" : "outline"}
          onClick={voice.isListening ? voice.stop : voice.start}
          disabled={!voice.isSupported}
          title={
            !voice.isSupported
              ? "Dettatura vocale non supportata in questo browser"
              : voice.isListening
              ? "In ascolto... Clicca per fermare la registrazione"
              : "Dettatura push-to-talk (clicca per registrare)"
          }
          className={`h-9 px-2.5 transition-colors ${
            voice.isListening ? "animate-pulse ring-2 ring-red-500/50" : ""
          }`}
        >
          {voice.isListening ? <Mic className="h-4 w-4 text-white" /> : <MicOff className="h-4 w-4 text-muted-foreground" />}
          <span className="ml-1.5 hidden text-xs font-medium sm:inline">
            {voice.isListening ? "Ascolto..." : "Voce"}
          </span>
        </Button>

        {/* Input testuale comando */}
        <div className="relative min-w-[200px] flex-1">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleRunLocalParse();
              }
            }}
            placeholder="Comando tattico: es. '10 danni a Goblin 1', 'cura 5 a Thorin', 'Kaelen concentra Benedizione'..."
            className="h-9 pr-8 text-xs sm:text-sm"
          />
          {inputText && (
            <button
              type="button"
              onClick={() => setInputText("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Pulisci testo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Pulsante Analisi Locale */}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleRunLocalParse}
          disabled={!inputText.trim() || isPendingAi}
          className="h-9 text-xs"
          title="Analizza localmente in modo deterministico (zero latenza e affidabile)"
        >
          <Play className="mr-1.5 h-3.5 w-3.5 text-primary" />
          <span>Analizza</span>
        </Button>

        {/* Pulsante Interpretazione con IA */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRunAiParse}
          disabled={!inputText.trim() || isPendingAi}
          className="h-9 text-xs text-amber-500 hover:text-amber-400"
          title="Interpreta frasi complesse o discorsive tramite IA (OpenRouter)"
        >
          <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${isPendingAi ? "animate-spin" : ""}`} />
          <span>{isPendingAi ? "Interpretazione..." : "IA"}</span>
        </Button>

        {/* Pulsante Annulla Ultimo Comando */}
        {canUndo && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleUndo}
            className="h-9 text-xs text-muted-foreground hover:text-destructive"
            title="Annulla l'ultimo comando applicato (ripristina lo stato se non sono intervenute modifiche successive)"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            <span>Annulla</span>
          </Button>
        )}
      </div>

      {/* Trascrizione vocale provvisoria o errori */}
      {(voice.isListening || voice.error || actionFeedback || actionError) && (
        <div className="flex flex-col gap-1 text-xs">
          {voice.isListening && voice.interimTranscript && (
            <div className="italic text-muted-foreground">
              Riconosciuto: &ldquo;{voice.interimTranscript}&rdquo;
            </div>
          )}
          {voice.error && (
            <div className="flex items-center gap-1 text-amber-500">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{voice.error}</span>
            </div>
          )}
          {actionError && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{actionError}</span>
            </div>
          )}
          {actionFeedback && !actionError && (
            <div className="flex items-center gap-1 text-emerald-500">
              <Check className="h-3.5 w-3.5" />
              <span>{actionFeedback}</span>
            </div>
          )}
        </div>
      )}

      {/* Modale di Revisione e Conferma Proposta */}
      <Dialog
        open={Boolean(activeProposal)}
        onOpenChange={(open) => {
          if (!open) setActiveProposal(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Shield className="h-5 w-5 text-primary" />
                <span>Revisione Proposta Comando</span>
              </DialogTitle>
              {activeProposal && (
                <Badge variant={activeProposal.source === "ai" ? "default" : "secondary"}>
                  {activeProposal.source === "ai" ? "IA Assistita" : "Parser Locale"}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {activeProposal && (
            <div className="flex flex-col gap-4 text-xs sm:text-sm">
              {/* Testo originale */}
              <div className="rounded-md border border-border/60 bg-muted/30 p-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Comando Trascritto
                </div>
                <div className="mt-0.5 font-medium italic">&ldquo;{activeProposal.rawInput}&rdquo;</div>
                {activeProposal.explanation && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {activeProposal.explanation}
                  </div>
                )}
              </div>

              {/* Alert stato obsoleto (stale state) */}
              {isStale && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Stato combattimento mutato!</div>
                    <div className="text-xs">
                      Danni, effetti o turni sono cambiati dopo l&apos;analisi. Rianalizza il comando per garantire la coerenza dei dati.
                    </div>
                  </div>
                </div>
              )}

              {/* Bersagli Ambigui o non Trovati */}
              {activeProposal.unresolvedTargets.length > 0 && (
                <div className="flex flex-col gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                    <HelpCircle className="h-4 w-4" />
                    <span>Disambiguazione Bersagli ({activeProposal.unresolvedTargets.length})</span>
                  </div>
                  {activeProposal.unresolvedTargets.map((ut, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5 border-t border-border/40 pt-2 first:border-0 first:pt-0">
                      <div className="text-xs">
                        {ut.reason === "ambiguous" ? (
                          <span>Corrispondenza multipla per &ldquo;<strong>{ut.query}</strong>&rdquo;: seleziona il combattente corretto.</span>
                        ) : (
                          <span>Bersaglio &ldquo;<strong>{ut.query}</strong>&rdquo; non trovato nei combattenti in iniziativa.</span>
                        )}
                      </div>
                      {ut.candidates && ut.candidates.length > 0 ? (
                        <select
                          className="h-8 rounded border border-border bg-background px-2 text-xs"
                          value={resolvedAmbiguities[ut.query] || ""}
                          onChange={(e) =>
                            setResolvedAmbiguities((prev) => ({
                              ...prev,
                              [ut.query]: e.target.value,
                            }))
                          }
                        >
                          <option value="">-- Seleziona combattente --</option>
                          {ut.candidates.map((cand) => (
                            <option key={cand.id} value={cand.id}>
                              {cand.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          className="h-8 rounded border border-border bg-background px-2 text-xs"
                          value={resolvedAmbiguities[ut.query] || ""}
                          onChange={(e) =>
                            setResolvedAmbiguities((prev) => ({
                              ...prev,
                              [ut.query]: e.target.value,
                            }))
                          }
                        >
                          <option value="">-- Assegna manualmente tra tutti --</option>
                          {combatantRefs.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.type})
                            </option>
                          ))}
                        </select>
                      )}
                      {ut.intent && ((ut.intent.kind === "damage" || ut.intent.kind === "heal") ? ut.intent.amount === null : ut.intent.kind === "set_exact_hp" && ut.intent.exactHp === null) && (
                        <Input type="number" min={ut.intent.kind === "set_exact_hp" ? 0 : 1} max={10000} placeholder={ut.intent.kind === "set_exact_hp" ? "PF esatti" : "Punti"} className="h-8 w-28 text-xs" value={filledMissingData[`target:${ut.query}`] ?? ""} onChange={(e) => setFilledMissingData((prev) => ({ ...prev, [`target:${ut.query}`]: e.target.value === "" ? "" : Number(e.target.value) }))} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Dati Mancanti */}
              {activeProposal.missingData.length > 0 && (
                <div className="flex flex-col gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>Dati Mancanti da Specificare</span>
                  </div>
                  {activeProposal.missingData.map((md) => (
                    <div key={md.operationId} className="flex items-center justify-between gap-2">
                      <span className="text-xs">{md.message}</span>
                      {md.field === "sourceCasterId" || md.field === "casterId" ? (
                        <select className="h-8 max-w-52 rounded border border-border bg-background px-2 text-xs" value={String(filledMissingData[md.operationId] ?? "")} onChange={(e) => setFilledMissingData((prev) => ({ ...prev, [md.operationId]: e.target.value }))}>
                          <option value="">Seleziona caster...</option>
                          {combatantRefs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          {md.field === "sourceCasterId" && <option value="manual">Applica senza concentrazione</option>}
                        </select>
                      ) : md.field === "spellName" ? <Input type="text" maxLength={160} placeholder="Nome incantesimo" className="h-8 w-40 text-xs" value={String(filledMissingData[md.operationId] ?? "")} onChange={(e) => setFilledMissingData((prev) => ({ ...prev, [md.operationId]: e.target.value }))} /> : <Input
                        type="number"
                        min={md.field === "exactHp" ? 0 : 1}
                        placeholder="Valore"
                        className="h-8 w-24 text-xs"
                        value={filledMissingData[md.operationId] ?? ""}
                        onChange={(e) => setFilledMissingData((prev) => ({ ...prev, [md.operationId]: e.target.value === "" ? "" : Number(e.target.value) }))}
                      />}
                    </div>
                  ))}
                </div>
              )}

              {/* Elenco Operazioni con Checkbox */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Operazioni Proposte ({activeProposal.operations.length})
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOpIds(activeProposal.operations.map((op) => op.id))}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Seleziona tutte
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOpIds([])}
                      className="text-[11px] text-muted-foreground hover:underline"
                    >
                      Deseleziona tutte
                    </button>
                  </div>
                </div>

                {activeProposal.operations.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Nessuna operazione atomica riconosciuta. Verifica la query o completa i dati mancanti.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-md border border-border/60 divide-y divide-border/40">
                    {activeProposal.operations.map((op) => {
                      const isSelected = selectedOpIds.includes(op.id);
                      return (
                        <div
                          key={op.id}
                          className={`flex items-center justify-between p-2.5 transition-colors ${
                            isSelected ? "bg-muted/40" : "bg-card opacity-60"
                          }`}
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOpSelection(op.id)}
                              className="rounded border-border"
                            />
                            <div className="flex flex-wrap items-center gap-1.5">
                              {op.kind === "damage" && (
                                <Badge variant="monster" className="h-5 px-1.5 text-[10px]">
                                  <Flame className="mr-1 h-3 w-3" />
                                  Danno
                                </Badge>
                              )}
                              {op.kind === "heal" && (
                                <Badge variant="outline" className="h-5 border-emerald-500 text-emerald-500 px-1.5 text-[10px]">
                                  <Heart className="mr-1 h-3 w-3" />
                                  Cura
                                </Badge>
                              )}
                              {op.kind === "set_exact_hp" && (
                                <Badge variant="outline" className="h-5 border-blue-500 text-blue-500 px-1.5 text-[10px]">
                                  PF Esatti
                                </Badge>
                              )}
                              {op.kind === "add_effect" && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                  <Zap className="mr-1 h-3 w-3" />
                                  +Stato
                                </Badge>
                              )}
                              {op.kind === "remove_effect" && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                  -Stato
                                </Badge>
                              )}
                              {op.kind === "start_concentration" && (
                                <Badge variant="default" className="h-5 bg-indigo-600 px-1.5 text-[10px]">
                                  Avvia Conc.
                                </Badge>
                              )}
                              {op.kind === "break_concentration" && (
                                <Badge variant="monster" className="h-5 px-1.5 text-[10px]">
                                  Interrompi Conc.
                                </Badge>
                              )}

                              {/* Descrizione operazione */}
                              <span className="font-medium">
                                {op.kind === "damage" && (
                                  <span>
                                    <strong>{op.targetName}</strong>: {filledMissingData[op.id] ?? op.amount} danni
                                    {op.sourceLabel ? ` (${op.sourceLabel})` : ""}
                                  </span>
                                )}
                                {op.kind === "heal" && (
                                  <span>
                                    <strong>{op.targetName}</strong>: +{filledMissingData[op.id] ?? op.amount} PF
                                  </span>
                                )}
                                {op.kind === "set_exact_hp" && (
                                  <span>
                                    <strong>{op.targetName}</strong>: imposta a {filledMissingData[op.id] ?? op.exactHp} PF
                                  </span>
                                )}
                                {op.kind === "add_effect" && (
                                  <span>
                                    <strong>{op.targetName}</strong>: {op.label}
                                    {op.linkToConcentration ? " (concentrazione)" : ""}
                                  </span>
                                )}
                                {op.kind === "remove_effect" && (
                                  <span>
                                    <strong>{op.targetName}</strong>: rimuovi {op.statusId ?? "effetto"}
                                  </span>
                                )}
                                {op.kind === "start_concentration" && (
                                  <span>
                                    <strong>{op.casterName}</strong> su {op.spellName}
                                  </span>
                                )}
                                {op.kind === "break_concentration" && (
                                  <span>
                                    <strong>{op.casterName}</strong>
                                  </span>
                                )}
                              </span>
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-border/40 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveProposal(null)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isStale || selectedOpIds.length === 0}
              onClick={handleApply}
              className="bg-primary text-primary-foreground"
            >
              <Check className="mr-1.5 h-4 w-4" />
              <span>Conferma ed Esegui ({selectedOpIds.length})</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
