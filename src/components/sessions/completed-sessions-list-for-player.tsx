"use client";

import { useState, useEffect, useCallback } from "react";
import { it } from "date-fns/locale";
import { formatSessionInRome } from "@/lib/session-datetime";
import { Loader2, ChevronDown, ChevronUp, History } from "lucide-react";
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
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getCompletedSessionsForCurrentUser(campaignId);
    setLoading(false);
    if (result.success && result.data) setSessions(result.data);
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mt-8 border-t border-barber-gold/20 pt-8">
      <div className="overflow-hidden rounded-xl border border-barber-gold/25 bg-barber-dark/60">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-barber-gold/[0.06]"
        >
          <span className="flex min-w-0 items-center gap-2 font-semibold text-barber-paper">
            <History className="h-4 w-4 shrink-0 text-barber-gold" />
            <span className="truncate">
              Storico sessioni{loading ? "" : ` (${sessions.length})`}
            </span>
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-barber-gold/70" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-barber-gold/70" aria-hidden />
          )}
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="border-t border-barber-gold/20 px-4 pb-4 pt-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-barber-gold" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="rounded-xl border border-barber-gold/20 bg-barber-dark/50 px-4 py-6 text-center text-sm text-barber-paper/60">
                  Nessuna sessione conclusa visibile per il tuo gruppo. Le sessioni del tuo gruppo appariranno qui.
                </p>
              ) : (
                <ul className="space-y-3">
                  {sessions.map((session) => (
                    <li key={session.id}>
                      <CompletedSessionCardForPlayer session={session} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletedSessionCardForPlayer({ session }: { session: CompletedSessionForUser }) {
  const [expanded, setExpanded] = useState(false);
  const dateLabel = formatSessionInRome(session.scheduled_at, "EEEE d MMMM yyyy", { locale: it });
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
