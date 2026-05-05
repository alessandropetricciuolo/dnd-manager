"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { it } from "date-fns/locale";
import { formatSessionInRome } from "@/lib/session-datetime";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignCampaignToOpenSession, type OpenCalendarSessionRow } from "@/app/campaigns/actions";

type CampaignOption = { id: string; name: string };

export function OpenCalendarSessionsGmPanelClient({
  sessions,
  campaigns,
}: {
  sessions: OpenCalendarSessionRow[];
  campaigns: CampaignOption[];
}) {
  const router = useRouter();
  const [selectionBySession, setSelectionBySession] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleAssign(sessionId: string) {
    const campaignId = selectionBySession[sessionId]?.trim();
    if (!campaignId) {
      toast.error("Seleziona una campagna.");
      return;
    }
    setLoadingId(sessionId);
    const res = await assignCampaignToOpenSession(sessionId, campaignId);
    setLoadingId(null);
    if (res.success) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  return (
    <section className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
      <h2 className="text-lg font-semibold text-barber-paper">Eventi senza campagna</h2>
      <p className="mt-1 text-sm text-barber-paper/70">
        Collega una campagna a uno slot già creato: gli iscritti restano sulla stessa sessione.
      </p>
      {campaigns.length === 0 ? (
        <p className="mt-4 text-sm text-amber-200/90">
          Non hai campagne assegnabili (come GM titolare). Crea una campagna prima di collegarla.
        </p>
      ) : null}
      <ul className="mt-4 space-y-4">
        {sessions.map((s) => {
          const dateLabel = formatSessionInRome(s.scheduled_at, "EEEE d MMMM yyyy, HH:mm", { locale: it });
          return (
            <li
              key={s.id}
              className="flex flex-col gap-3 rounded-lg border border-barber-gold/20 bg-barber-dark/60 p-3 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium text-barber-paper">{s.title?.trim() || "Evento senza titolo"}</p>
                <p className="text-xs text-barber-paper/60">{dateLabel}</p>
                {s.notes?.trim() ? <p className="text-xs text-barber-paper/55">{s.notes}</p> : null}
                <p className="text-xs text-barber-gold/80">{s.signup_count} iscritti</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
                <Label htmlFor={`camp-${s.id}`} className="text-xs text-barber-paper/70">
                  Campagna
                </Label>
                <Select
                  value={selectionBySession[s.id] ?? ""}
                  onValueChange={(v) => setSelectionBySession((prev) => ({ ...prev, [s.id]: v }))}
                  disabled={loadingId === s.id || campaigns.length === 0}
                >
                  <SelectTrigger id={`camp-${s.id}`} className="bg-barber-dark border-barber-gold/30 text-barber-paper">
                    <SelectValue placeholder="Scegli campagna..." />
                  </SelectTrigger>
                  <SelectContent className="border-barber-gold/30 bg-barber-dark">
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-barber-paper">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                  disabled={loadingId === s.id || campaigns.length === 0}
                  onClick={() => handleAssign(s.id)}
                >
                  {loadingId === s.id ? "Salvataggio..." : "Collega campagna"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
