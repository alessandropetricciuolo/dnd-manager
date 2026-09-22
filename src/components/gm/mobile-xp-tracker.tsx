"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  Minus,
  Plus,
  Save,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Users,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addSessionSignupForGm,
  getApprovedSignupsForSession,
  getSessionWizardMeta,
  preCloseSessionAction,
} from "@/app/campaigns/actions";
import { getCampaignCharacters, type CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { getCampaignSessionsForGm, type CampaignSessionOption } from "@/app/campaigns/gm-actions";
import { cn } from "@/lib/utils";

const XP_STEP = 50;
const STORAGE_PREFIX = "gm-mobile-xp-";

type Attendance = Record<string, "attended" | "absent">;
type XpByPlayer = Record<string, number>;
type SaveStatus = "idle" | "saving" | "saved" | "offline" | "error";
type SessionSignup = {
  id: string;
  player_id: string;
  player_name: string;
  status: string;
};

type StoredDraft = {
  version: 1;
  attendance: Attendance;
  xpByPlayer: XpByPlayer;
};

function formatSession(session: CampaignSessionOption) {
  const date = new Date(session.scheduled_at);
  const formatted = Number.isNaN(date.getTime())
    ? session.scheduled_at
    : new Intl.DateTimeFormat("it-IT", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
  return session.title?.trim() ? `${session.title} · ${formatted}` : formatted;
}

function storageKey(campaignId: string, sessionId: string) {
  return `${STORAGE_PREFIX}${campaignId}-${sessionId}`;
}

function readDraft(campaignId: string, sessionId: string): StoredDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(campaignId, sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (parsed.version !== 1) return null;
    return {
      version: 1,
      attendance: parsed.attendance ?? {},
      xpByPlayer: parsed.xpByPlayer ?? {},
    };
  } catch {
    return null;
  }
}

function clampXp(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function MobileXpTracker({
  campaignId,
  campaignName,
  initialSessionId,
}: {
  campaignId: string;
  campaignName: string;
  initialSessionId: string | null;
}) {
  const [sessions, setSessions] = useState<CampaignSessionOption[]>([]);
  const [characters, setCharacters] = useState<CampaignCharacterRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId ?? "");
  const [signups, setSignups] = useState<SessionSignup[]>([]);
  const [attendance, setAttendance] = useState<Attendance>({});
  const [xpByPlayer, setXpByPlayer] = useState<XpByPlayer>({});
  const [loading, setLoading] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [pendingPlayers, setPendingPlayers] = useState<Set<string>>(new Set());
  const [addingPlayers, setAddingPlayers] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const hydratedSessionRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef({ attendance, xpByPlayer });

  useEffect(() => {
    draftRef.current = { attendance, xpByPlayer };
  }, [attendance, xpByPlayer]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCampaignSessionsForGm(campaignId), getCampaignCharacters(campaignId)]).then(
      ([sessionResult, characterResult]) => {
        if (cancelled) return;
        setSessions(sessionResult.success ? sessionResult.data ?? [] : []);
        setCharacters(characterResult.success ? characterResult.data ?? [] : []);
        if (!sessionResult.success) toast.error(sessionResult.error ?? "Impossibile caricare le sessioni.");
        if (!characterResult.success) toast.error(characterResult.error ?? "Impossibile caricare i personaggi.");
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const loadSession = useCallback(async () => {
    if (!selectedSessionId) {
      setSignups([]);
      setAttendance({});
      setXpByPlayer({});
      hydratedSessionRef.current = "";
      return;
    }

    setLoadingSession(true);
    setSaveStatus("idle");
    const [signupResult, metaResult] = await Promise.all([
      getApprovedSignupsForSession(selectedSessionId),
      getSessionWizardMeta(selectedSessionId),
    ]);
    const nextSignups = signupResult.success ? signupResult.data ?? [] : [];
    const local = readDraft(campaignId, selectedSessionId);
    const serverAwards = metaResult.success ? metaResult.data?.pre_closed_xp_awards ?? [] : [];
    const serverXp = Object.fromEntries(serverAwards.map((award) => [award.playerId, clampXp(award.xp)]));
    const defaultAttendance = Object.fromEntries(
      nextSignups.map((signup) => [signup.player_id, signup.status === "absent" ? "absent" : "attended"])
    ) as Attendance;

    setSignups(nextSignups);
    setAttendance({ ...defaultAttendance, ...(local?.attendance ?? {}) });
    setXpByPlayer({ ...serverXp, ...(local?.xpByPlayer ?? {}) });
    hydratedSessionRef.current = selectedSessionId;
    setLoadingSession(false);
    if (!signupResult.success) toast.error(signupResult.error ?? "Impossibile caricare i partecipanti.");
  }, [campaignId, selectedSessionId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const activeCharacters = useMemo(() => {
    const order = new Map(signups.map((signup, index) => [signup.player_id, index]));
    return characters
      .filter((character) => character.assigned_to && order.has(character.assigned_to))
      .sort((a, b) => {
        const delta = (order.get(a.assigned_to ?? "") ?? 999) - (order.get(b.assigned_to ?? "") ?? 999);
        return delta || a.name.localeCompare(b.name, "it");
      });
  }, [characters, signups]);

  const selectableCharacters = useMemo(
    () =>
      characters
        .filter((character) => character.assigned_to)
        .sort((a, b) => a.name.localeCompare(b.name, "it")),
    [characters]
  );

  const selectedPlayerIds = useMemo(() => new Set(signups.map((signup) => signup.player_id)), [signups]);
  const presentCount = activeCharacters.filter(
    (character) => character.assigned_to && attendance[character.assigned_to] !== "absent"
  ).length;
  const totalXp = activeCharacters.reduce((sum, character) => {
    if (!character.assigned_to || attendance[character.assigned_to] === "absent") return sum;
    return sum + clampXp(xpByPlayer[character.assigned_to]);
  }, 0);

  const saveDraft = useCallback(
    async (silent = false) => {
      if (!selectedSessionId || signups.length === 0) return false;
      const current = draftRef.current;
      const nextAttendance = Object.fromEntries(
        signups.map((signup) => [
          signup.player_id,
          current.attendance[signup.player_id] ?? "attended",
        ])
      ) as Attendance;
      const awards = signups
        .filter((signup) => nextAttendance[signup.player_id] === "attended")
        .map((signup) => ({ playerId: signup.player_id, xp: clampXp(current.xpByPlayer[signup.player_id]) }));

      setSaveStatus("saving");
      const result = await preCloseSessionAction(selectedSessionId, {
        attendance: nextAttendance,
        xpGained: 0,
        perPlayerXpAwards: awards,
      });
      if (result.success) {
        setSaveStatus("saved");
        if (!silent) toast.success("EXP salvata. Potrai chiudere la sessione dal PC.");
        return true;
      }
      setSaveStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      if (!silent) toast.error(result.message);
      return false;
    },
    [selectedSessionId, signups]
  );

  useEffect(() => {
    if (!selectedSessionId || hydratedSessionRef.current !== selectedSessionId) return;
    try {
      const payload: StoredDraft = { version: 1, attendance, xpByPlayer };
      localStorage.setItem(storageKey(campaignId, selectedSessionId), JSON.stringify(payload));
    } catch {
      // Il salvataggio server rimane disponibile anche se lo storage del browser è disabilitato.
    }
    if (signups.length === 0) return;
    setSaveStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "idle");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void saveDraft(true), 1200);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [attendance, campaignId, saveDraft, selectedSessionId, signups.length, xpByPlayer]);

  function updateXp(playerId: string, value: number) {
    setXpByPlayer((current) => ({ ...current, [playerId]: clampXp(value) }));
  }

  function openParticipants() {
    setPendingPlayers(new Set());
    setParticipantDialogOpen(true);
  }

  async function addSelectedPlayers() {
    if (!selectedSessionId || pendingPlayers.size === 0) return;
    setAddingPlayers(true);
    const results = await Promise.all(
      [...pendingPlayers].map((playerId) => addSessionSignupForGm(selectedSessionId, playerId))
    );
    setAddingPlayers(false);
    const failed = results.filter((result) => !result.success);
    if (failed.length > 0) {
      toast.error(failed[0]?.message ?? "Alcuni giocatori non sono stati aggiunti.");
    } else {
      toast.success(`${pendingPlayers.size} giocator${pendingPlayers.size === 1 ? "e aggiunto" : "i aggiunti"}.`);
    }
    setParticipantDialogOpen(false);
    await loadSession();
  }

  const statusLabel = {
    idle: "Modifica locale",
    saving: "Salvataggio…",
    saved: "Salvato",
    offline: "Offline · salvato sul telefono",
    error: "Da risalvare",
  }[saveStatus];

  return (
    <main className="min-h-[100dvh] bg-[#090807] text-stone-100">
      <div className="mx-auto min-h-[100dvh] w-full max-w-lg pb-28">
        <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-[#090807]/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/campaigns/${campaignId}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-stone-300"
              aria-label="Torna alla campagna"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-amber-300">
                <Smartphone className="h-4 w-4" />
                <h1 className="truncate font-serif text-lg font-semibold">Mini GM · EXP</h1>
              </div>
              <p className="truncate text-xs text-stone-500">{campaignName}</p>
            </div>
            <div
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium",
                saveStatus === "saved" && "bg-emerald-500/15 text-emerald-300",
                saveStatus === "saving" && "bg-amber-500/15 text-amber-200",
                saveStatus === "offline" && "bg-orange-500/15 text-orange-200",
                (saveStatus === "idle" || saveStatus === "error") && "bg-stone-800 text-stone-400"
              )}
            >
              {saveStatus === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {saveStatus === "saved" ? <Check className="h-3 w-3" /> : null}
              {saveStatus === "offline" ? <WifiOff className="h-3 w-3" /> : null}
              {statusLabel}
            </div>
          </div>

          <div className="relative mt-3">
            <select
              value={selectedSessionId}
              onChange={(event) => setSelectedSessionId(event.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-amber-500/30 bg-stone-900 px-3 pr-10 text-sm text-stone-100 outline-none focus:border-amber-400"
              disabled={loading}
              aria-label="Seleziona sessione"
            >
              <option value="">Seleziona una sessione…</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {formatSession(session)}{session.is_pre_closed ? " · bozza salvata" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-5 w-5 text-amber-300" />
          </div>
        </header>

        {!selectedSessionId ? (
          <section className="flex min-h-[62dvh] flex-col items-center justify-center px-8 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-300">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="font-serif text-xl font-semibold">Scegli la sessione dell’evento</h2>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Le modifiche resteranno sul telefono e verranno salvate come bozza per la chiusura dal PC.
            </p>
          </section>
        ) : loadingSession ? (
          <div className="flex min-h-[55dvh] items-center justify-center text-amber-300">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <section className="px-4 py-4">
              <div className="grid grid-cols-3 divide-x divide-amber-500/15 rounded-2xl border border-amber-500/20 bg-stone-900/80 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-stone-500">Giocatori</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-stone-100">{activeCharacters.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-stone-500">Presenti</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-300">{presentCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-stone-500">EXP totali</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-amber-300">{totalXp}</p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={openParticipants}
                className="mt-3 h-11 w-full border-stone-700 bg-stone-900 text-stone-200 hover:bg-stone-800"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Aggiungi giocatori della campagna
              </Button>
            </section>

            <section className="space-y-3 px-4">
              {activeCharacters.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-700 px-6 py-12 text-center">
                  <Users className="mx-auto h-7 w-7 text-stone-600" />
                  <p className="mt-3 text-sm font-medium text-stone-300">Nessun giocatore nella sessione</p>
                  <p className="mt-1 text-xs text-stone-500">Aggiungili singolarmente dall’intera campagna.</p>
                </div>
              ) : null}

              {activeCharacters.map((character, index) => {
                const playerId = character.assigned_to as string;
                const isPresent = attendance[playerId] !== "absent";
                const value = clampXp(xpByPlayer[playerId]);
                return (
                  <article
                    key={character.id}
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-stone-900/85 transition",
                      isPresent ? "border-amber-500/20" : "border-stone-800 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xs font-semibold text-stone-400">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className={cn("truncate font-serif text-base font-semibold", !isPresent && "line-through")}>
                          {character.name}
                        </h2>
                        <p className="text-[11px] text-stone-500">Totale scheda: {character.current_xp} EXP</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isPresent}
                        onClick={() =>
                          setAttendance((current) => ({
                            ...current,
                            [playerId]: isPresent ? "absent" : "attended",
                          }))
                        }
                        className={cn(
                          "relative h-8 w-14 shrink-0 rounded-full transition",
                          isPresent ? "bg-emerald-600" : "bg-stone-700"
                        )}
                        aria-label={`${character.name}: ${isPresent ? "presente" : "assente"}`}
                      >
                        <span
                          className={cn(
                            "absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
                            isPresent && "translate-x-6"
                          )}
                        />
                      </button>
                    </div>

                    <div className="grid grid-cols-[3.25rem_1fr_3.25rem] items-stretch border-t border-stone-800">
                      <button
                        type="button"
                        onClick={() => updateXp(playerId, value - XP_STEP)}
                        disabled={!isPresent || value === 0}
                        className="flex min-h-16 items-center justify-center border-r border-stone-800 text-red-300 active:bg-red-500/15 disabled:text-stone-700"
                        aria-label={`Togli ${XP_STEP} EXP a ${character.name}`}
                      >
                        <Minus className="h-6 w-6" />
                      </button>
                      <label className="flex min-w-0 flex-col items-center justify-center px-2 py-2">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500">EXP sessione</span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={XP_STEP}
                          value={value}
                          onChange={(event) => updateXp(playerId, Number(event.target.value))}
                          disabled={!isPresent}
                          className="mt-0.5 h-9 border-0 bg-transparent p-0 text-center text-2xl font-bold tabular-nums text-amber-300 shadow-none focus-visible:ring-0"
                          aria-label={`EXP di ${character.name}`}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => updateXp(playerId, value + XP_STEP)}
                        disabled={!isPresent}
                        className="flex min-h-16 items-center justify-center border-l border-stone-800 text-emerald-300 active:bg-emerald-500/15 disabled:text-stone-700"
                        aria-label={`Aggiungi ${XP_STEP} EXP a ${character.name}`}
                      >
                        <Plus className="h-6 w-6" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}

        {selectedSessionId && activeCharacters.length > 0 ? (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-amber-500/20 bg-[#090807]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
            <div className="mx-auto max-w-lg">
              <Button
                type="button"
                onClick={() => void saveDraft(false)}
                disabled={saveStatus === "saving"}
                className="h-12 w-full bg-amber-500 text-base font-semibold text-stone-950 hover:bg-amber-400"
              >
                {saveStatus === "saving" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                Salva EXP per la chiusura
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={participantDialogOpen} onOpenChange={setParticipantDialogOpen}>
        <DialogContent className="max-h-[85dvh] max-w-[calc(100vw-1.5rem)] overflow-hidden border-amber-500/25 bg-stone-950 p-0 text-stone-100 sm:max-w-md">
          <DialogHeader className="border-b border-stone-800 px-4 pb-3 pt-5 text-left">
            <DialogTitle className="font-serif text-xl">Aggiungi giocatori</DialogTitle>
            <DialogDescription className="text-stone-400">
              Puoi scegliere singolarmente da tutta la campagna, senza vincoli di gruppo.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {selectableCharacters.map((character) => {
              const playerId = character.assigned_to as string;
              const alreadyAdded = selectedPlayerIds.has(playerId);
              const checked = alreadyAdded || pendingPlayers.has(playerId);
              return (
                <button
                  key={character.id}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() =>
                    setPendingPlayers((current) => {
                      const next = new Set(current);
                      if (next.has(playerId)) next.delete(playerId);
                      else next.add(playerId);
                      return next;
                    })
                  }
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-left",
                    checked ? "border-amber-500/40 bg-amber-500/10" : "border-stone-800 bg-stone-900",
                    alreadyAdded && "opacity-60"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
                      checked ? "border-amber-400 bg-amber-400 text-stone-950" : "border-stone-600"
                    )}
                  >
                    {checked ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{character.name}</span>
                    <span className="block text-[11px] text-stone-500">
                      {alreadyAdded ? "Già nella sessione" : `${character.current_xp} EXP totali`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <DialogFooter className="border-t border-stone-800 px-4 py-3">
            <Button
              type="button"
              onClick={() => void addSelectedPlayers()}
              disabled={pendingPlayers.size === 0 || addingPlayers}
              className="h-11 w-full bg-amber-500 text-stone-950 hover:bg-amber-400"
            >
              {addingPlayers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Aggiungi {pendingPlayers.size || ""} {pendingPlayers.size === 1 ? "giocatore" : "giocatori"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
