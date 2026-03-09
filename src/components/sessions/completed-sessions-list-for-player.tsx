"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCompletedSessionsForCurrentUser, type CompletedSessionForUser } from "@/app/campaigns/actions";
import { cn } from "@/lib/utils";

const SUMMARY_CLAMP_LINES = 4;

type CompletedSessionsListForPlayerProps = {
  campaignId: string;
};

export function CompletedSessionsListForPlayer({ campaignId }: CompletedSessionsListForPlayerProps) {
  const [sessions, setSessions] = useState<CompletedSessionForUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getCompletedSessionsForCurrentUser(campaignId);
    setLoading(false);
    if (result.success && result.data) setSessions(result.data);
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-barber-gold" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="rounded-xl border border-barber-gold/20 bg-barber-dark/50 px-4 py-6 text-center text-sm text-barber-paper/60">
        Nessuna sessione conclusa visibile per il tuo gruppo. Le sessioni del tuo gruppo appariranno qui.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-4 border-t border-barber-gold/20 pt-8">
      <h2 className="text-lg font-semibold text-barber-paper">
        Sessioni concluse (del tuo gruppo)
      </h2>
      <ul className="space-y-3">
        {sessions.map((session) => (
          <li key={session.id}>
            <CompletedSessionCardForPlayer session={session} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompletedSessionCardForPlayer({ session }: { session: CompletedSessionForUser }) {
  const [expanded, setExpanded] = useState(false);
  const dateLabel = format(new Date(session.scheduled_at), "EEEE d MMMM yyyy", { locale: it });
  const party = session.campaign_parties;
  const summary = session.session_summary?.trim() ?? "";
  const hasLongSummary = summary.split("\n").length > SUMMARY_CLAMP_LINES || summary.length > 280;

  return (
    <Card className="border-barber-gold/20 bg-barber-dark/60 text-barber-paper shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-barber-paper">
          {session.title?.trim() || "Sessione senza titolo"}
        </CardTitle>
        <p className="text-xs text-barber-paper/60">{dateLabel}</p>
        {party?.name && (
          <Badge
            className="mt-2 border-barber-gold/40 bg-barber-gold/10 text-barber-gold"
            style={party.color ? { borderColor: party.color, backgroundColor: `${party.color}20`, color: party.color } : undefined}
          >
            {party.name}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {summary ? (
          <div className="space-y-1">
            <p
              className={cn(
                "whitespace-pre-wrap text-sm text-barber-paper/80 leading-relaxed",
                !expanded && hasLongSummary && "line-clamp-4"
              )}
            >
              {summary}
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
          <p className="text-sm italic text-barber-paper/50">Nessun riassunto.</p>
        )}
      </CardContent>
    </Card>
  );
}
