"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { it } from "date-fns/locale";
import { formatSessionInRome } from "@/lib/session-datetime";
import { toast } from "sonner";
import { CalendarIcon, MapPinIcon, Check, X, UserCheck, User, UserPlus, Trash2, UserX, ClipboardCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateSignupStatus, deleteSignup, joinSession, deleteSession, closeSessionQuestOrOneshot } from "@/app/campaigns/actions";
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

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => {
          const isOpen = session.status === "scheduled";
          const sessionInstant = new Date(session.scheduled_at);
          const isTodayOrPast = sessionInstant <= new Date();

          return (
            <Card
              key={session.id}
              className="border-barber-gold/40 bg-barber-dark/90"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-400 min-w-0">
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
                      className="h-7 w-7 p-0 shrink-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      disabled={!!deleteSessionLoadingId}
                      onClick={() => handleDeleteSession(session.id)}
                      title="Elimina sessione"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <CardTitle className="text-base text-slate-50">
                  {isOpen ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                      Open
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-600/50 px-2 py-0.5 text-xs font-medium text-slate-400">
                      Closed
                    </span>
                  )}
                </CardTitle>
                {session.dm_name && (
                  <p className="text-xs font-medium text-slate-400 mt-1">
                    DM: {session.dm_name}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {session.notes && (
                  <CardDescription className="flex items-center gap-2 text-slate-300">
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
                  <div className="border-t border-slate-700/60 pt-3">
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
                      <div className="rounded-lg bg-slate-800/50 px-2 py-1.5">
                        {normalizeStatus(session.currentUserSignupStatus) === "pending" && (
                          <span className="text-xs text-amber-300">In attesa di approvazione</span>
                        )}
                        {normalizeStatus(session.currentUserSignupStatus) === "approved" && (
                          <span className="text-xs text-barber-gold">Approvato</span>
                        )}
                        {normalizeStatus(session.currentUserSignupStatus) === "attended" && (
                          <span className="text-xs text-barber-gold">Presente</span>
                        )}
                        {normalizeStatus(session.currentUserSignupStatus) === "rejected" && (
                          <span className="text-xs text-slate-500">Rifiutato</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* GM/Admin: lista iscritti con Approva, Rifiuta, Conferma presenza, Elimina */}
                {isGmOrAdmin && (
                  <div className="space-y-2 border-t border-slate-700/60 pt-3">
                    <p className="text-xs font-medium text-slate-400">Iscritti</p>
                    {session.signups.length === 0 ? (
                      <p className="text-xs text-slate-500 py-1">Nessun iscritto ancora</p>
                    ) : (
                      <ul className="space-y-2">
                        {session.signups.map((signup) => {
                          const status = normalizeStatus(signup.status);
                          const busy = loadingId === signup.id;
                          return (
                            <li
                              key={signup.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-800/50 px-2 py-1.5"
                            >
                              <span className="text-sm text-slate-200 truncate">
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
                                    className="h-7 bg-blue-600 hover:bg-blue-500 text-xs"
                                    disabled={busy}
                                    onClick={() => handleStatus(signup.id, "attended", signup)}
                                  >
                                    <UserCheck className="h-3 w-3 mr-0.5" />
                                    Conferma presenza
                                  </Button>
                                )}
                                {status === "attended" && (
                                  <Badge variant="secondary" className="bg-barber-gold/20 text-barber-gold text-xs">
                                    <User className="h-3 w-3 mr-0.5" />
                                    Presente
                                  </Badge>
                                )}
                                {status === "absent" && (
                                  <Badge variant="secondary" className="bg-red-500/20 text-red-300 text-xs">
                                    <UserX className="h-3 w-3 mr-0.5" />
                                    Assente
                                  </Badge>
                                )}
                                {status === "rejected" && (
                                  <>
                                    <span className="text-xs text-slate-500 mr-1.5">Rifiutato</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 border-amber-500/60 text-amber-300 hover:bg-amber-500/10 text-[11px]"
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
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                  disabled={busy}
                                  onClick={() => handleRemove(signup.id)}
                                  title="Rimuovi dalla sessione"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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
