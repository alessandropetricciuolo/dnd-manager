"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { it } from "date-fns/locale";
import { formatSessionInRome } from "@/lib/session-datetime";
import { Pencil, Loader2, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getCompletedSessionsForCampaign,
  type CompletedSessionRow,
} from "@/app/campaigns/gm-actions";
import { updateSession } from "@/app/campaigns/actions";
import { cn } from "@/lib/utils";

const SUMMARY_CLAMP_LINES = 4;

type SessionHistoryManagerProps = {
  campaignId: string;
};

export function SessionHistoryManager({ campaignId }: SessionHistoryManagerProps) {
  const [sessions, setSessions] = useState<CompletedSessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getCompletedSessionsForCampaign(campaignId);
    setLoading(false);
    if (result.success && result.data) setSessions(result.data);
    else if (!result.success) toast.error(result.error);
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-barber-gold" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="rounded-xl border border-barber-gold/20 bg-barber-dark/50 px-4 py-6 text-center text-sm text-barber-paper/70">
        Nessuna sessione conclusa. Le sessioni chiuse (es. da GM Screen) appariranno qui.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-barber-paper">
        Storia sessioni
      </h2>
      <div className="relative space-y-0">
        {/* Timeline verticale: linea laterale */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-barber-gold/20 md:left-6" />
        <ul className="space-y-4">
          {sessions.map((session) => (
            <li key={session.id} className="relative pl-10 md:pl-12">
              {/* Pallino timeline */}
              <div className="absolute left-0 top-6 h-3 w-3 rounded-full border-2 border-barber-gold/50 bg-barber-dark md:left-[18px]" />
              <SessionHistoryCard
                session={session}
                campaignId={campaignId}
                onSaved={load}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type SessionHistoryCardProps = {
  session: CompletedSessionRow;
  campaignId: string;
  onSaved: () => void;
};

function SessionHistoryCard({ session, campaignId, onSaved }: SessionHistoryCardProps) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(session.title ?? "");
  const [summary, setSummary] = useState(session.session_summary ?? "");
  const [gmPrivateNotes, setGmPrivateNotes] = useState(session.gm_private_notes ?? "");
  const [saving, setSaving] = useState(false);

  const dateLabel = formatSessionInRome(session.scheduled_at, "EEEE d MMMM yyyy", { locale: it });
  const party = session.campaign_parties;
  const hasLongSummary = (session.session_summary ?? "").split("\n").length > SUMMARY_CLAMP_LINES ||
    (session.session_summary ?? "").length > 280;

  function handleCancel() {
    setTitle(session.title ?? "");
    setSummary(session.session_summary ?? "");
    setGmPrivateNotes(session.gm_private_notes ?? "");
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateSession(session.id, {
      title: title.trim() || null,
      session_summary: summary.trim() || null,
      gm_private_notes: gmPrivateNotes.trim() || null,
    });
    setSaving(false);
    if (result.success) {
      toast.success(result.message);
      setEditing(false);
      onSaved();
    } else {
      toast.error(result.message);
    }
  }

  return (
    <Card className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-2">
                <Label htmlFor={`session-title-${session.id}`} className="text-barber-paper/80">
                  Titolo sessione
                </Label>
                <Input
                  id={`session-title-${session.id}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Es. Capitolo 3 - La foresta"
                  className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                />
              </div>
            ) : (
              <CardTitle className="text-base font-semibold text-barber-paper">
                {session.title?.trim() || "Sessione senza titolo"}
              </CardTitle>
            )}
            <p className="mt-1 text-xs text-barber-paper/60">
              {dateLabel}
            </p>
            {party?.name && (
              <Badge
                className="mt-2 border-barber-gold/40 bg-barber-gold/10 text-barber-gold"
                style={party.color ? { borderColor: party.color, backgroundColor: `${party.color}20`, color: party.color } : undefined}
              >
                {party.name}
              </Badge>
            )}
          </div>
          {!editing && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-barber-gold hover:bg-barber-gold/20"
              onClick={() => setEditing(true)}
              aria-label="Modifica"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {editing ? (
          <>
            <div className="space-y-2">
              <Label htmlFor={`session-summary-${session.id}`} className="text-barber-paper/80">
                Riassunto pubblico
              </Label>
              <Textarea
                id={`session-summary-${session.id}`}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Riassunto narrativo visibile ai partecipanti..."
                rows={6}
                className="min-h-[120px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`session-gm-notes-${session.id}`} className="text-red-300/90">
                Note segrete GM
              </Label>
              <Textarea
                id={`session-gm-notes-${session.id}`}
                value={gmPrivateNotes}
                onChange={(e) => setGmPrivateNotes(e.target.value)}
                placeholder="Appunti privati, solo per te..."
                rows={4}
                className="min-h-[80px] resize-y border border-dashed border-red-500/50 bg-red-950/20 text-barber-paper placeholder:text-barber-paper/50"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-barber-gold/20 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-barber-gold/40 text-barber-paper"
                onClick={handleCancel}
                disabled={saving}
              >
                Annulla
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salva
              </Button>
              <Link
                href={`/campaigns/${campaignId}?tab=wiki`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border border-red-500/40 px-3 py-2 text-sm font-medium",
                  "text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
                )}
              >
                <Wrench className="h-4 w-4" />
                Correggi Stato Mondo / Wiki
              </Link>
            </div>
            <p className="text-xs text-barber-paper/50">
              Il link sopra porta alla Wiki della campagna per gestire manualmente lo stato degli NPC/Mostri (es. correggere un &quot;morto&quot; segnato per errore).
            </p>
          </>
        ) : (
          <>
            {session.session_summary?.trim() ? (
              <div className="space-y-1">
                <p
                  className={cn(
                    "whitespace-pre-wrap text-sm text-barber-paper/80 leading-relaxed",
                    !expanded && hasLongSummary && "line-clamp-4"
                  )}
                >
                  {session.session_summary}
                </p>
                {hasLongSummary && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-barber-gold hover:bg-transparent hover:text-barber-gold/80"
                    onClick={() => setExpanded((e) => !e)}
                  >
                    {expanded ? (
                      <>Riduci <ChevronUp className="ml-0.5 inline h-3 w-3" /></>
                    ) : (
                      <>Espandi <ChevronDown className="ml-0.5 inline h-3 w-3" /></>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm italic text-barber-paper/50">
                Nessun riassunto.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

