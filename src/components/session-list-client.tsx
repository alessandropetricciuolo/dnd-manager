"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { it } from "date-fns/locale";
import { formatSessionInRome } from "@/lib/session-datetime";
import { toast } from "sonner";
import { CalendarIcon, MapPinIcon, Check, X, UserCheck, User, UserPlus, Trash2, UserX, ClipboardCheck, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import {
  updateSignupStatus,
  deleteSignup,
  joinSession,
  deleteSession,
  closeSessionQuestOrOneshot,
  addSessionSignupForGm,
  listAssignablePlayersForSession,
  type AssignablePlayerForCampaignRow,
} from "@/app/campaigns/actions";
import { UnlockContentDialog } from "@/components/sessions/unlock-content-dialog";
import { EndSessionWizard } from "@/components/sessions/end-session-wizard";
import type { ApprovedSignupForWizard } from "@/components/sessions/end-session-wizard";

export type SignupWithPlayer = {
  id: string;
  session_id: string;
  player_id: string;
  status: string;
  player_name: string;
};

export type SessionWithSignups = {
  id: string;
  scheduled_at: string;
  notes: string | null;
  status: string;
  dm_id: string | null;
  dm_name: string | null;
  signups: SignupWithPlayer[];
  /** Stato iscrizione utente corrente: null = non iscritto. */
  currentUserSignupStatus?: string | null;
};

type SessionListClientProps = {
  sessions: SessionWithSignups[];
  isGmOrAdmin: boolean;
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
};

function normalizeStatus(s: string): string {
  if (s === "confirmed") return "approved";
  if (s === "waitlist") return "pending";
  if (s === "cancelled") return "rejected";
  return s;
}

function signupSummary(signups: SignupWithPlayer[]): string {
  if (signups.length === 0) return "Nessun iscritto";
  const pending = signups.filter((s) => normalizeStatus(s.status) === "pending").length;
  const approved = signups.filter((s) => normalizeStatus(s.status) === "approved").length;
  const attended = signups.filter((s) => normalizeStatus(s.status) === "attended").length;
  const parts = [`${signups.length} iscritti`];
  if (pending > 0) parts.push(`${pending} in attesa`);
  if (approved > 0) parts.push(`${approved} approvati`);
  if (attended > 0) parts.push(`${attended} presenti`);
  return parts.join(" · ");
}

export function SessionListClient({
  sessions,
  isGmOrAdmin,
  campaignId,
  campaignType,
}: SessionListClientProps) {
  const router = useRouter();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPlayerId, setUnlockPlayerId] = useState<string | null>(null);
  const [unlockPlayerName, setUnlockPlayerName] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [joinLoadingSessionId, setJoinLoadingSessionId] = useState<string | null>(null);
  const [deleteSessionLoadingId, setDeleteSessionLoadingId] = useState<string | null>(null);
  const [closeSimpleLoadingId, setCloseSimpleLoadingId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [manualAddOpenSessionId, setManualAddOpenSessionId] = useState<string | null>(null);
  const [manualAddLoadingSessionId, setManualAddLoadingSessionId] = useState<string | null>(null);
  const [manualAddSubmittingSessionId, setManualAddSubmittingSessionId] = useState<string | null>(null);
  const [manualAddPlayerId, setManualAddPlayerId] = useState("");
  const [manualAddOptions, setManualAddOptions] = useState<AssignablePlayerForCampaignRow[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [sessionForClose, setSessionForClose] = useState<{
    sessionId: string;
    approvedSignups: ApprovedSignupForWizard[];
    campaignType?: "oneshot" | "quest" | "long" | null;
  } | null>(null);

  async function handleJoin(sessionId: string) {
    setJoinLoadingSessionId(sessionId);
    const res = await joinSession(sessionId);
    setJoinLoadingSessionId(null);
    if (res.success) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  async function handleRemove(signupId: string) {
    setLoadingId(signupId);
    const res = await deleteSignup(signupId);
    setLoadingId(null);
    if (res.success) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm("Eliminare questa sessione? Tutte le iscrizioni verranno rimosse.")) return;
    setDeleteSessionLoadingId(sessionId);
    const res = await deleteSession(sessionId);
    setDeleteSessionLoadingId(null);
    if (res.success) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  async function handleCloseQuestOrOneshot(sessionId: string) {
    setCloseSimpleLoadingId(sessionId);
    const res = await closeSessionQuestOrOneshot(sessionId);
    setCloseSimpleLoadingId(null);
    if (res.success) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  async function handleStatus(signupId: string, newStatus: "approved" | "rejected" | "attended", signup: SignupWithPlayer) {
    setLoadingId(signupId);
    const res = await updateSignupStatus(signupId, newStatus);
    setLoadingId(null);
    if (res.success) {
      toast.success(res.message);
      router.refresh();
      if (newStatus === "attended" && campaignType === "long") {
        setUnlockPlayerId(signup.player_id);
        setUnlockPlayerName(signup.player_name);
        setUnlockOpen(true);
      }
    } else {
      toast.error(res.message);
    }
  }

  async function handleOpenManualAdd(sessionId: string) {
    if (manualAddOpenSessionId === sessionId) {
      setManualAddOpenSessionId(null);
      setManualAddPlayerId("");
      setManualAddOptions([]);
      return;
    }
    setManualAddOpenSessionId(sessionId);
    setManualAddPlayerId("");
    setManualAddOptions([]);
    setManualAddLoadingSessionId(sessionId);
    const res = await listAssignablePlayersForSession(sessionId);
    setManualAddLoadingSessionId(null);
    if (!res.success) {
      toast.error(res.message ?? "Errore nel caricamento dei giocatori disponibili.");
      setManualAddOpenSessionId(null);
      return;
    }
    setManualAddOptions(res.data ?? []);
  }

  async function handleManualAdd(sessionId: string) {
    if (!manualAddPlayerId) return;
    setManualAddSubmittingSessionId(sessionId);
    const res = await addSessionSignupForGm(sessionId, manualAddPlayerId);
    setManualAddSubmittingSessionId(null);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success(res.message);
    setManualAddOpenSessionId(null);
    setManualAddPlayerId("");
    setManualAddOptions([]);
    router.refresh();
  }

  return (
    <>
      <div
        className={cn(
          isGmOrAdmin ? "flex flex-col" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {sessions.map((session, sessionIndex) => {
          const isOpen = session.status === "scheduled";
          const sessionInstant = new Date(session.scheduled_at);
          const isTodayOrPast = sessionInstant <= new Date();

          const sessionCard = (
            <Card className="w-full border-barber-gold/40 bg-barber-dark/90">
              <CardHeader className="pb-2">
                {isGmOrAdmin ? (
                  <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-barber-gold/10 pb-2 sm:hidden">
                    <CalendarIcon className="h-4 w-4 shrink-0 text-barber-gold/70" />
                    <time
                      dateTime={session.scheduled_at}
                      className="text-sm font-medium text-barber-paper"
                    >
                      {formatSessionInRome(session.scheduled_at, "EEE d MMM yyyy · HH:mm", {
                        locale: it,
                      })}
                    </time>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-2 text-barber-paper/55",
                      isGmOrAdmin && "sm:sr-only"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 shrink-0" />
                    <time dateTime={session.scheduled_at}>
                      {formatSessionInRome(session.scheduled_at, "EEEE d MMMM yyyy, HH:mm", {
                        locale: it,
                      })}
                    </time>
                  </div>
                  {isGmOrAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0 text-barber-paper/55 hover:text-red-400 hover:bg-red-500/10"
                      disabled={!!deleteSessionLoadingId}
                      onClick={() => handleDeleteSession(session.id)}
                      title="Elimina sessione"
                      aria-label="Elimina sessione"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <CardTitle className="text-base text-barber-paper">
                  {isOpen ? (
                    <StatusBadge tone="success">Open</StatusBadge>
                  ) : (
                    <StatusBadge tone="muted">Closed</StatusBadge>
                  )}
                </CardTitle>
                {session.dm_name && (
                  <p className="text-xs font-medium text-barber-paper/55 mt-1">
                    DM: {session.dm_name}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {session.notes && (
                  <CardDescription className="flex items-center gap-2 text-barber-paper/85">
                    <MapPinIcon className="h-4 w-4 shrink-0" />
                    <span>{session.notes}</span>
                  </CardDescription>
                )}
                {/* GM/Admin: Chiudi Sessione (solo se data passata e ancora scheduled) */}
                {isGmOrAdmin && isTodayOrPast && session.status === "scheduled" && (
                  <div className="space-y-1.5">
                    {(campaignType === "quest" || campaignType === "oneshot") &&
                      session.signups.length > 0 &&
                      session.signups.every((s) => normalizeStatus(s.status) === "attended") && (
                        <Button
                          size="sm"
                          className="w-full bg-barber-gold/90 text-barber-dark hover:bg-barber-gold font-medium text-xs"
                          disabled={!!closeSimpleLoadingId}
                          onClick={() => handleCloseQuestOrOneshot(session.id)}
                        >
                          {closeSimpleLoadingId === session.id ? "Chiusura..." : "Chiudi sessione (tutti presenti)"}
                        </Button>
                      )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-barber-red/50 text-barber-red hover:bg-barber-red/10 font-medium text-xs"
                      onClick={() => {
                        const approved = session.signups
                          .filter((s) => normalizeStatus(s.status) === "approved")
                          .map((s) => ({ id: s.id, player_id: s.player_id, player_name: s.player_name }));
                        setSessionForClose({
                          sessionId: session.id,
                          approvedSignups: approved,
                          campaignType: campaignType ?? undefined,
                        });
                        setWizardOpen(true);
                      }}
                    >
                      <ClipboardCheck className="h-3.5 w-3 mr-1.5" />
                      Chiudi sessione (con riepilogo e XP)
                    </Button>
                  </div>
                )}
                {/* Player: bottone Iscriviti o stato iscrizione */}
                {!isGmOrAdmin && (
                  <div className="border-t border-barber-gold/15 pt-3">
                    {session.currentUserSignupStatus == null ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full bg-barber-red hover:bg-barber-red/90 text-xs"
                        disabled={!!joinLoadingSessionId}
                        onClick={() => handleJoin(session.id)}
                      >
                        <UserPlus className="h-3.5 w-3 mr-1.5" />
                        {joinLoadingSessionId === session.id ? "Iscrizione..." : "Iscriviti"}
                      </Button>
                    ) : (
                      <div className="flex items-center justify-start rounded-lg bg-barber-dark/60 px-2 py-1.5">
                        {normalizeStatus(session.currentUserSignupStatus) === "pending" && (
                          <StatusBadge tone="warning">In attesa di approvazione</StatusBadge>
                        )}
                        {normalizeStatus(session.currentUserSignupStatus) === "approved" && (
                          <StatusBadge tone="info">Approvato</StatusBadge>
                        )}
                        {normalizeStatus(session.currentUserSignupStatus) === "attended" && (
                          <StatusBadge tone="success">Presente</StatusBadge>
                        )}
                        {normalizeStatus(session.currentUserSignupStatus) === "rejected" && (
                          <StatusBadge tone="muted">Rifiutato</StatusBadge>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* GM/Admin: lista iscritti con Approva, Rifiuta, Conferma presenza, Elimina */}
                {isGmOrAdmin && (
                  <div className="space-y-2 border-t border-barber-gold/15 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-barber-paper/55">Iscritti</p>
                        {expandedSessionId !== session.id ? (
                          <p className="mt-0.5 text-[11px] text-barber-paper/45">
                            {signupSummary(session.signups)}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-barber-gold/30 text-barber-paper hover:bg-barber-gold/10 text-[11px]"
                        onClick={() =>
                          setExpandedSessionId((current) => {
                            const next = current === session.id ? null : session.id;
                            if (next !== session.id) {
                              setManualAddOpenSessionId(null);
                              setManualAddPlayerId("");
                              setManualAddOptions([]);
                            }
                            return next;
                          })
                        }
                        aria-label={expandedSessionId === session.id ? "Comprimi gestione iscritti" : "Espandi gestione iscritti"}
                      >
                        {expandedSessionId === session.id ? (
                          <ChevronUp className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 mr-1" />
                        )}
                        {expandedSessionId === session.id ? "Comprimi" : "Gestisci iscritti"}
                      </Button>
                    </div>
                    {expandedSessionId === session.id && (
                      <>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10 text-[11px]"
                        disabled={manualAddLoadingSessionId === session.id || manualAddSubmittingSessionId === session.id}
                        onClick={() => void handleOpenManualAdd(session.id)}
                        aria-label={manualAddOpenSessionId === session.id ? "Chiudi aggiunta iscritto" : "Apri aggiunta iscritto"}
                      >
                        {manualAddLoadingSessionId === session.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                        )}
                        {manualAddOpenSessionId === session.id ? "Chiudi" : "Aggiungi iscritto"}
                      </Button>
                    </div>
                    {manualAddOpenSessionId === session.id && (
                      <div className="rounded-lg border border-barber-gold/20 bg-barber-dark/70 p-2.5 space-y-2">
                        {manualAddLoadingSessionId === session.id ? (
                          <div className="flex items-center gap-2 text-xs text-barber-paper/55">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Caricamento giocatori disponibili...
                          </div>
                        ) : (
                          <>
                            <select
                              className="flex h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-sm text-barber-paper"
                              value={manualAddPlayerId}
                              onChange={(event) => setManualAddPlayerId(event.target.value)}
                              disabled={manualAddSubmittingSessionId === session.id}
                            >
                              <option value="">Seleziona giocatore</option>
                              {manualAddOptions.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.label}
                                </option>
                              ))}
                            </select>
                            <p className="text-[11px] text-barber-paper/45">
                              L&apos;aggiunta manuale inserisce il giocatore come iscritto gi&agrave; approvato.
                            </p>
                            {manualAddOptions.length === 0 ? (
                              <p className="text-xs text-barber-paper/45">
                                {campaignType === "long"
                                  ? "Nessun membro campagna disponibile da aggiungere a questa sessione."
                                  : "Nessun giocatore disponibile da aggiungere a questa sessione."}
                              </p>
                            ) : null}
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-barber-paper/85 hover:bg-barber-dark/60"
                                disabled={manualAddSubmittingSessionId === session.id}
                                onClick={() => {
                                  setManualAddOpenSessionId(null);
                                  setManualAddPlayerId("");
                                  setManualAddOptions([]);
                                }}
                              >
                                Annulla
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 bg-barber-red hover:bg-barber-red/90 text-xs"
                                disabled={!manualAddPlayerId || manualAddSubmittingSessionId === session.id}
                                onClick={() => void handleManualAdd(session.id)}
                                aria-label="Conferma aggiunta iscritto"
                              >
                                {manualAddSubmittingSessionId === session.id ? "Aggiungo..." : "Aggiungi"}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {session.signups.length === 0 ? (
                      <p className="text-xs text-barber-paper/45 py-1">Nessun iscritto ancora</p>
                    ) : (
                      <ul className="space-y-2">
                        {session.signups.map((signup) => {
                          const status = normalizeStatus(signup.status);
                          const busy = loadingId === signup.id;
                          return (
                            <li
                              key={signup.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-barber-dark/60 px-2 py-1.5"
                            >
                              <span className="text-sm text-barber-paper truncate">
                                {signup.player_name}
                              </span>
                              <div className="flex items-center gap-1">
                                {status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-7 bg-barber-red hover:bg-barber-red/90 text-xs"
                                      disabled={busy}
                                      onClick={() => handleStatus(signup.id, "approved", signup)}
                                    >
                                      <Check className="h-3 w-3 mr-0.5" />
                                      Approva
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 text-xs"
                                      disabled={busy}
                                      onClick={() => handleStatus(signup.id, "rejected", signup)}
                                    >
                                      <X className="h-3 w-3 mr-0.5" />
                                      Rifiuta
                                    </Button>
                                  </>
                                )}
                                {status === "approved" && isTodayOrPast && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-7 bg-emerald-600 hover:bg-emerald-500 text-xs"
                                    disabled={busy}
                                    onClick={() => handleStatus(signup.id, "attended", signup)}
                                  >
                                    <UserCheck className="h-3 w-3 mr-0.5" />
                                    Conferma presenza
                                  </Button>
                                )}
                                {status === "attended" && (
                                  <StatusBadge tone="success" icon={<User />}>
                                    Presente
                                  </StatusBadge>
                                )}
                                {status === "absent" && (
                                  <StatusBadge tone="danger" icon={<UserX />}>
                                    Assente
                                  </StatusBadge>
                                )}
                                {status === "rejected" && (
                                  <>
                                    <StatusBadge tone="muted" className="mr-1.5">
                                      Rifiutato
                                    </StatusBadge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 border-barber-gold/40 text-barber-gold hover:bg-barber-gold/10 text-[11px]"
                                      disabled={busy}
                                      onClick={() => handleStatus(signup.id, "approved", signup)}
                                    >
                                      Ripristina
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 w-9 p-0 text-barber-paper/55 hover:text-red-400 hover:bg-red-500/10"
                                  disabled={busy}
                                  onClick={() => handleRemove(signup.id)}
                                  title="Rimuovi dalla sessione"
                                  aria-label={`Rimuovi ${signup.player_name} dalla sessione`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );

          if (!isGmOrAdmin) {
            return (
              <div key={session.id} className="min-w-0">
                {sessionCard}
              </div>
            );
          }

          const dateLabel = formatSessionInRome(session.scheduled_at, "EEEE", { locale: it });
          const dayLabel = formatSessionInRome(session.scheduled_at, "d MMM", { locale: it });
          const timeLabel = formatSessionInRome(session.scheduled_at, "HH:mm", { locale: it });

          return (
            <div key={session.id} className="relative flex gap-3 sm:gap-5">
              {sessionIndex < sessions.length - 1 ? (
                <div
                  aria-hidden
                  className="absolute bottom-0 left-[4.75rem] top-14 hidden w-px bg-barber-gold/20 sm:block"
                />
              ) : null}
              <div className="hidden w-[4.75rem] shrink-0 flex-col items-end border-r border-barber-gold/15 pr-3 pt-5 text-right sm:flex">
                <span className="text-[10px] font-medium uppercase tracking-wide text-barber-gold/80">
                  {dateLabel}
                </span>
                <span className="font-serif text-lg leading-none text-barber-paper">{dayLabel}</span>
                <span className="mt-1 text-xs text-barber-paper/55">{timeLabel}</span>
              </div>
              <div className="min-w-0 flex-1 pb-4">{sessionCard}</div>
            </div>
          );
        })}
      </div>
      {campaignType === "long" && unlockPlayerId && (
        <UnlockContentDialog
          open={unlockOpen}
          onOpenChange={setUnlockOpen}
          campaignId={campaignId}
          userId={unlockPlayerId}
          playerName={unlockPlayerName}
          onSuccess={() => {
            setUnlockPlayerId(null);
            setUnlockPlayerName("");
          }}
        />
      )}
      {sessionForClose && (
        <EndSessionWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          sessionId={sessionForClose.sessionId}
          campaignId={campaignId}
          campaignType={sessionForClose.campaignType}
          sessionLabel={
            sessions.find((s) => s.id === sessionForClose.sessionId)?.scheduled_at
              ? formatSessionInRome(
                  sessions.find((s) => s.id === sessionForClose.sessionId)!.scheduled_at,
                  "d MMM yyyy",
                  { locale: it }
                )
              : undefined
          }
          initialApprovedSignups={sessionForClose.approvedSignups}
          onSuccess={() => setSessionForClose(null)}
        />
      )}
    </>
  );
}
