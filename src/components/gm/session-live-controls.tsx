"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import type { CombatSpellSlots } from "@/lib/combat-spell-slots";
import type { SessionLiveResources } from "../../../mobile/src/lib/session-live";

export type LiveScope = "session" | "torneo" | "torneo2";

type CharacterResources = SessionLiveResources & { characterId: string };
type GmState = { revision: number; active: boolean; ownsLive: boolean; characters: CharacterResources[] };
type LiveCommand = {
  id: string;
  action: "start" | "update" | "stop";
  payload: { characterIds?: string[]; changes?: CharacterResources[]; expectedRevision?: number };
};

export type LiveCombatant = {
  characterId: string;
  name: string;
  hp: number;
  tempHp?: number;
  deathSaves?: { success: number; fail: number };
  spellSlots?: CombatSpellSlots;
  conditions: string[];
};

function spentSlots(slots?: CombatSpellSlots) {
  return Object.fromEntries((slots?.max ?? []).map(({ level, count }) => [
    level,
    Math.max(0, count - (slots?.remaining.find((value) => value.level === level)?.count ?? 0)),
  ]));
}

export function slotsWithSpent(slots: CombatSpellSlots | undefined, spent: Record<string, number>) {
  return slots && {
    ...slots,
    remaining: slots.max.map(({ level, count }) => ({
      level,
      count: Math.max(0, count - (spent[level] ?? 0)),
    })),
  };
}

function sharedCombatant(combatant: LiveCombatant, visible: string[], retained: string[]): CharacterResources {
  return {
    characterId: combatant.characterId,
    hitPoints: combatant.hp,
    tempHp: combatant.tempHp ?? 0,
    deathSaves: {
      successes: combatant.deathSaves?.success ?? 0,
      failures: combatant.deathSaves?.fail ?? 0,
    },
    usedSpellSlots: spentSlots(combatant.spellSlots),
    conditions: [...new Set([...combatant.conditions, ...retained])].filter((label) => visible.includes(label)).sort(),
  };
}

const sameResources = (a: CharacterResources, b: CharacterResources) =>
  a.hitPoints === b.hitPoints && a.tempHp === b.tempHp &&
  a.deathSaves.successes === b.deathSaves.successes &&
  a.deathSaves.failures === b.deathSaves.failures &&
  Array.from({ length: 9 }, (_, i) => String(i + 1))
    .every((level) => (a.usedSpellSlots[level] ?? 0) === (b.usedSpellSlots[level] ?? 0)) &&
  a.conditions.length === b.conditions.length && a.conditions.every((condition) => b.conditions.includes(condition));

type SessionLiveControlProps = {
  scope: LiveScope;
  contextId: string | null | undefined;
  combatants: LiveCombatant[];
  applyConfirmed: (characters: CharacterResources[]) => void;
  beforeStart?: () => Promise<boolean>;
  onPendingChange?: (pending: boolean) => void;
  localEditVersion?: number;
};

export function SessionLiveControls({ contextId, ...props }: SessionLiveControlProps) {
  const [actorId, setActorId] = useState<string | null>(null);
  useEffect(() => {
    if (!contextId) return;
    const db = createSupabaseBrowserClient();
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      setActorId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, [contextId]);
  if (!contextId || !actorId) return null;
  return (
    <BoundSessionLiveControls
      {...props}
      key={`${actorId}:${props.scope}:${contextId}`}
      actorId={actorId}
      contextId={contextId}
    />
  );
}

function BoundSessionLiveControls({
  scope, contextId, actorId, combatants, applyConfirmed, beforeStart, onPendingChange, localEditVersion,
}: Omit<SessionLiveControlProps, "contextId"> & { contextId: string; actorId: string }) {
  const key = `session-live-command:${actorId}:${scope}:${contextId}`;
  const [state, setState] = useState<GmState | null>(null);
  const [pending, setPending] = useState<LiveCommand | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState<Record<string, string[]>>({});
  const [retained, setRetained] = useState<Record<string, string[]>>({});
  const pendingRef = useRef<LiveCommand | null>(null);
  const [visibilityVersion, setVisibilityVersion] = useState(0);
  const submittedEdits = useRef([localEditVersion, 0]);
  const pendingChangeRef = useRef(onPendingChange);
  pendingChangeRef.current = onPendingChange;
  const combatantsRef = useRef(combatants);
  const applyConfirmedRef = useRef(applyConfirmed);
  const hydratedRef = useRef(new Set<string>());
  const mountedRef = useRef(false);
  const inFlight = useRef(false);
  combatantsRef.current = combatants;
  applyConfirmedRef.current = applyConfirmed;

  const receiveState = useCallback((next: GmState, hydrate: boolean) => {
    if (hydrate) {
      hydratedRef.current.clear();
      setVisible(Object.fromEntries(next.characters.map((character) => [character.characterId, character.conditions])));
      const present = new Map(combatantsRef.current.map((combatant) => [combatant.characterId, combatant.conditions]));
      // The live write may have committed before the initiative draft caught up.
      // Keep confirmed visibility until the GM clears it or the tracker observes the condition expire.
      setRetained(Object.fromEntries(next.characters.map((record) => [
        record.characterId,
        record.conditions.filter((condition) => !present.get(record.characterId)?.includes(condition)),
      ])));
      const ready = next.characters.filter((record) => present.has(record.characterId));
      ready.forEach((record) => hydratedRef.current.add(record.characterId));
      if (ready.length) applyConfirmedRef.current(ready);
    }
    setState(next);
  }, []);

  const load = useCallback(async () => {
    const db = createSupabaseBrowserClient();
    const { data, error: loadError } = await db.rpc("session_live_gm_state", {
      p_scope: scope,
      p_context_id: contextId,
    });
    if (!mountedRef.current || inFlight.current || pendingRef.current) return;
    if (loadError) {
      setError("Stato della sessione live non disponibile.");
      return;
    }
    setError("");
    receiveState(data as GmState, true);
    pendingChangeRef.current?.(false);
  }, [scope, contextId, receiveState]);

  const submit = useCallback(async (command: LiveCommand) => {
    if (inFlight.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(command));
    } catch {
      setError("Il browser non riesce a conservare il comando live. Riprova dopo aver liberato spazio.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    pendingRef.current = command;
    pendingChangeRef.current?.(true);
    setPending(command);
    try {
      const db = createSupabaseBrowserClient();
      const { data, error: saveError } = await db.rpc("session_live_command", {
        p_scope: scope,
        p_context_id: contextId,
        p_command_id: command.id,
        p_action: command.action,
        p_payload: command.payload,
      });
      if (saveError) {
        // SQL errors report a rolled-back command. Transport failures leave its outcome unknown.
        if (saveError.code === "P0001" || /^2[23]/.test(saveError.code)) {
          if (JSON.parse(localStorage.getItem(key) ?? "null")?.id === command.id) localStorage.removeItem(key);
          pendingRef.current = null;
          if (!mountedRef.current) return;
          setPending(null);
          pendingChangeRef.current?.(command.action !== "start");
          if (command.action !== "start") {
            void db.rpc("session_live_gm_state", { p_scope: scope, p_context_id: contextId })
              .then(({ data: current }) => {
                if (mountedRef.current && current && !pendingRef.current) receiveState(current as GmState, true);
              });
          }
          setError(saveError.message.includes("invalid_roster")
            ? "Verifica che i PG nel tracker siano assegnati a giocatori del tavolo."
            : saveError.message.includes("revision_conflict")
              ? "La sessione è stata aggiornata da un’altra scheda del GM. Ricarica i valori confermati."
              : "Il comando live è stato rifiutato.");
          return;
        }
        throw saveError;
      }
      if (JSON.parse(localStorage.getItem(key) ?? "null")?.id === command.id) localStorage.removeItem(key);
      pendingRef.current = null;
      if (!mountedRef.current) return;
      setPending(null);
      pendingChangeRef.current?.(false);
      receiveState(data as GmState, true);
    } catch {
      if (mountedRef.current) setError("Conferma del salvataggio non ricevuta.");
    } finally {
      inFlight.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }, [contextId, key, receiveState, scope]);

  useEffect(() => {
    mountedRef.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const command = JSON.parse(raw) as LiveCommand;
        pendingRef.current = command;
        pendingChangeRef.current?.(true);
        setPending(command);
        setError("C’è un comando in attesa di conferma.");
      } else {
        void load();
      }
    } catch {
      setError("Impossibile leggere i comandi salvati in questo browser.");
    }
    return () => {
      mountedRef.current = false;
      pendingChangeRef.current?.(false);
    };
  }, [key, load]);

  useEffect(() => {
    if (!state?.active || !state.ownsLive || pendingRef.current || inFlight.current || error) return;
    const byId = new Map(combatants.map((combatant) => [combatant.characterId, combatant]));
    const toHydrate = state.characters.filter((c) => byId.has(c.characterId) && !hydratedRef.current.has(c.characterId));
    if (toHydrate.length) {
      toHydrate.forEach((c) => hydratedRef.current.add(c.characterId));
      applyConfirmedRef.current(toHydrate);
      return;
    }
    let observed = false;
    const nextRetained = Object.fromEntries(Object.entries(retained).map(([id, labels]) => {
      const current = labels.filter((label) => !byId.get(id)?.conditions.includes(label));
      if (current.length !== labels.length) observed = true;
      return [id, current];
    }));
    if (observed) setRetained(nextRetained);
    const [lastEdit, lastVisibility] = submittedEdits.current;
    const hasLocalEdit = localEditVersion !== undefined && localEditVersion !== lastEdit;
    if (localEditVersion !== undefined && !hasLocalEdit && visibilityVersion === lastVisibility) return;
    submittedEdits.current = [localEditVersion, visibilityVersion];
    const changes = state.characters.flatMap((confirmed) => {
      const combatant = byId.get(confirmed.characterId);
      if (!combatant) return [];
      const draft = sharedCombatant(
        combatant, visible[combatant.characterId] ?? [], nextRetained[combatant.characterId] ?? [],
      );
      return sameResources(confirmed, draft) ? [] : [draft];
    });
    if (changes.length) void submit({
      id: crypto.randomUUID(), action: "update", payload: { changes, expectedRevision: state.revision },
    });
  }, [state, combatants, visible, retained, submit, pending, busy, error, localEditVersion, visibilityVersion]);

  if (!state?.ownsLive && !pending && !error) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {state?.active ? (
        <>
          <span className="font-medium text-emerald-300">Sessione live</span>
          <Button
            type="button" size="sm" variant="outline" disabled={busy || Boolean(pending)}
            onClick={() => void submit({
              id: crypto.randomUUID(), action: "stop", payload: { expectedRevision: state.revision },
            })}
          >
            Termina condivisione
          </Button>
          <details>
            <summary className="cursor-pointer">Condizioni visibili ai giocatori</summary>
            <div className="mt-1 space-y-1">
              {combatants.filter((c) => state.characters.some((record) => record.characterId === c.characterId))
                .filter((c) => c.conditions.length > 0 || retained[c.characterId]?.length > 0)
                .map((c) => (
                  <div className="flex flex-wrap items-center gap-x-2" key={c.characterId}>
                    <span>{c.name}</span>
                    {[...new Set([...c.conditions, ...(retained[c.characterId] ?? [])])].map((condition) => (
                      <label key={condition} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          disabled={Boolean(pending)}
                          checked={(visible[c.characterId] ?? []).includes(condition)}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setVisibilityVersion((version) => version + 1);
                            setVisible((current) => ({
                              ...current,
                              [c.characterId]: checked
                                ? [...(current[c.characterId] ?? []), condition]
                                : (current[c.characterId] ?? []).filter((item) => item !== condition),
                            }));
                          }}
                        />
                        {condition}
                      </label>
                    ))}
                  </div>
                ))}
            </div>
          </details>
        </>
      ) : state?.ownsLive ? (
        <Button
          type="button" size="sm" variant="outline" disabled={busy || Boolean(pending) || !combatants.length}
          onClick={async () => {
            setBusy(true);
            try {
              if (beforeStart && !await beforeStart()) {
                setError("Impossibile salvare il combattimento della partita.");
                return;
              }
              await submit({
                id: crypto.randomUUID(), action: "start",
                payload: { characterIds: [...new Set(combatants.map((c) => c.characterId))] },
              });
            } catch {
              if (mountedRef.current) setError("Impossibile salvare il combattimento della partita.");
            } finally {
              if (mountedRef.current) setBusy(false);
            }
          }}
        >
          {scope === "session" ? "Avvia sessione live" : "Condividi con i PG"}
        </Button>
      ) : null}
      {busy && <span role="status">Salvataggio…</span>}
      {error && <span role="status" className="text-amber-300">{error}</span>}
      {error && (
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => {
          if (pending) void submit(pending);
          else void load();
        }}>{pending ? "Riprova" : "Ricarica stato"}</Button>
      )}
    </div>
  );
}
