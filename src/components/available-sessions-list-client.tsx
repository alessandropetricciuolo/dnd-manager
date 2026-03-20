"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { it } from "date-fns/locale";
import { formatSessionInRome } from "@/lib/session-datetime";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarIcon, MapPinIcon, UserPlus } from "lucide-react";
import { joinSession } from "@/app/campaigns/actions";
import type { AvailableSessionRow } from "@/components/available-sessions-list";

export function AvailableSessionsListClient({
  rows,
}: {
  rows: AvailableSessionRow[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleJoin(sessionId: string) {
    setLoadingId(sessionId);
    const res = await joinSession(sessionId);
    setLoadingId(null);
    if (res.success) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => {
        const date = new Date(row.scheduledAt);
        const isSignedUp = row.mySignupStatus != null;
        return (
          <Card
            key={row.sessionId}
            className="border-emerald-700/50 bg-slate-950/70"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-50">
                {row.campaignName}
              </CardTitle>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <CalendarIcon className="h-4 w-4 shrink-0" />
                <time dateTime={row.scheduledAt}>
                  {formatSessionInRome(row.scheduledAt, "EEEE d MMMM yyyy, HH:mm", { locale: it })}
                </time>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {row.notes && (
                <p className="flex items-center gap-2 text-sm text-slate-300">
                  <MapPinIcon className="h-4 w-4 shrink-0 text-emerald-400/80" />
                  {row.notes}
                </p>
              )}
              {!isSignedUp ? (
                <Button
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs"
                  disabled={!!loadingId}
                  onClick={() => handleJoin(row.sessionId)}
                >
                  <UserPlus className="h-3.5 w-3 mr-1.5" />
                  {loadingId === row.sessionId ? "Iscrizione..." : "Iscriviti"}
                </Button>
              ) : (
                <div className="rounded-lg bg-slate-800/50 px-2 py-1.5 text-xs">
                  {row.mySignupStatus === "pending" && (
                    <span className="text-amber-300">In attesa di approvazione</span>
                  )}
                  {row.mySignupStatus === "approved" && (
                    <span className="text-emerald-300">Approvato</span>
                  )}
                  {row.mySignupStatus === "attended" && (
                    <span className="text-emerald-400">Presente</span>
                  )}
                  {row.mySignupStatus === "rejected" && (
                    <span className="text-slate-500">Rifiutato</span>
                  )}
                </div>
              )}
              <Link
                href={`/campaigns/${row.campaignId}`}
                className="block text-center text-xs text-emerald-400/80 hover:text-emerald-300"
              >
                Vai alla campagna →
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
