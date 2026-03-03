"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDays, History, MapPin } from "lucide-react";

export type SessionRowWithDate = {
  id: string;
  campaign_name: string;
  scheduled_at: string;
  location: string | null;
  session_title: string | null;
  formatted_date: string;
};

export function MySessionsListClient({
  inProgramma,
  storico,
}: {
  inProgramma: SessionRowWithDate[];
  storico: SessionRowWithDate[];
}) {
  return (
    <Tabs defaultValue="in-programma" className="w-full">
      <TabsList className="mb-4 rounded-xl border border-emerald-700/50 bg-slate-950/80 p-1">
        <TabsTrigger
          value="in-programma"
          className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          In programma ({inProgramma.length})
        </TabsTrigger>
        <TabsTrigger
          value="storico"
          className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
        >
          <History className="mr-2 h-4 w-4" />
          Storico ({storico.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="in-programma" className="mt-0">
        <SessionCards rows={inProgramma} />
      </TabsContent>
      <TabsContent value="storico" className="mt-0">
        <SessionCards rows={storico} />
      </TabsContent>
    </Tabs>
  );
}

function SessionCards({ rows }: { rows: SessionRowWithDate[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-emerald-700/40 bg-slate-950/60 px-4 py-6 text-center text-slate-400">
        Nessuna sessione in questa sezione.
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <Card
          key={r.id}
          className="border-emerald-700/50 bg-slate-950/70"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-50">
              {r.campaign_name}
            </CardTitle>
            {r.session_title && (
              <p className="text-sm text-slate-400">{r.session_title}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-slate-300">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-emerald-400/80" />
              {r.formatted_date}
            </p>
            {r.location ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-emerald-400/80" />
                {r.location}
              </p>
            ) : (
              <p className="flex items-center gap-2 text-slate-500">
                <MapPin className="h-4 w-4 shrink-0" />
                Luogo da definire
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
