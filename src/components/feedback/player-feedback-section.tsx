"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { it } from "date-fns/locale";
import { formatSessionInRome } from "@/lib/session-datetime";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  listFeedbackSessionsForPlayer,
  submitSessionFeedback,
  type FeedbackSessionForPlayer,
} from "@/app/campaigns/feedback-actions";
import { cn } from "@/lib/utils";

type PlayerFeedbackSectionProps = {
  campaignId: string;
};

type DraftFeedback = {
  sessionRating: number;
  campaignRating: number;
  comment: string;
};

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-barber-paper/90">{label}</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="rounded p-1"
            aria-label={`${star} stelle`}
          >
            <Star
              className={cn(
                "h-5 w-5 transition-colors",
                star <= value ? "fill-amber-400 text-amber-400" : "text-barber-paper/40"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function PlayerFeedbackSection({ campaignId }: PlayerFeedbackSectionProps) {
  const [sessions, setSessions] = useState<FeedbackSessionForPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftFeedback>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listFeedbackSessionsForPlayer(campaignId);
    setLoading(false);
    if (!result.success || !result.data) return;
    setSessions(result.data);
    const nextDrafts: Record<string, DraftFeedback> = {};
    for (const row of result.data) {
      nextDrafts[row.sessionId] = {
        sessionRating: row.sessionRating ?? 0,
        campaignRating: row.campaignRating ?? 0,
        comment: row.comment ?? "",
      };
    }
    setDrafts(nextDrafts);
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => sessions.filter((s) => !s.sessionRating || !s.campaignRating).length,
    [sessions]
  );

  async function saveFeedback(sessionId: string) {
    const draft = drafts[sessionId];
    if (!draft || draft.sessionRating < 1 || draft.campaignRating < 1) {
      toast.error("Inserisci entrambe le valutazioni (1-5 stelle).");
      return;
    }
    setSavingSessionId(sessionId);
    const result = await submitSessionFeedback(campaignId, sessionId, {
      sessionRating: draft.sessionRating,
      campaignRating: draft.campaignRating,
      comment: draft.comment || null,
    });
    setSavingSessionId(null);
    if (result.success) {
      toast.success(result.message ?? "Feedback salvato.");
      await load();
    } else {
      toast.error(result.error);
    }
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-xl border border-barber-gold/20 bg-barber-dark/60 p-4 text-sm text-barber-paper/70">
        Caricamento feedback...
      </div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <section className="mt-8 space-y-4 border-t border-barber-gold/20 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-barber-paper">Feedback sessioni e campagna</h2>
        <span className="rounded-full border border-barber-gold/30 px-3 py-1 text-xs text-barber-gold">
          {pendingCount} da compilare
        </span>
      </div>
      <p className="text-sm text-barber-paper/70">
        Aiutaci a migliorare: valuta ogni sessione conclusa a cui hai partecipato.
      </p>

      <div className="space-y-4">
        {sessions.map((session) => {
          const draft = drafts[session.sessionId] ?? {
            sessionRating: 0,
            campaignRating: 0,
            comment: "",
          };
          const dateLabel = formatSessionInRome(session.scheduledAt, "EEEE d MMMM yyyy, HH:mm", {
            locale: it,
          });

          return (
            <div key={session.sessionId} className="rounded-xl border border-barber-gold/25 bg-barber-dark/70 p-4">
              <div className="mb-3">
                <h3 className="font-medium text-barber-paper">{session.title}</h3>
                <p className="text-xs text-barber-paper/60">{dateLabel}</p>
              </div>

              <div className="space-y-4">
                <StarRating
                  value={draft.sessionRating}
                  onChange={(value) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [session.sessionId]: { ...draft, sessionRating: value },
                    }))
                  }
                  label="Sessione: quanto ti sei divertito? Esperienza di gioco generale."
                />

                <StarRating
                  value={draft.campaignRating}
                  onChange={(value) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [session.sessionId]: { ...draft, campaignRating: value },
                    }))
                  }
                  label="Campagna: ti è piaciuta la campagna? La consiglieresti?"
                />

                <div className="space-y-2">
                  <p className="text-sm text-barber-paper/90">
                    Campo libero (opzionale): cosa ne pensi di noi? Cosa miglioreresti?
                  </p>
                  <Textarea
                    value={draft.comment}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [session.sessionId]: { ...draft, comment: e.target.value },
                      }))
                    }
                    className="min-h-[90px] border-barber-gold/25 bg-barber-dark/80 text-barber-paper"
                    placeholder="Scrivi qui il tuo feedback..."
                  />
                </div>

                <Button
                  type="button"
                  className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
                  disabled={savingSessionId === session.sessionId}
                  onClick={() => void saveFeedback(session.sessionId)}
                >
                  {savingSessionId === session.sessionId ? "Salvataggio..." : "Salva feedback"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
