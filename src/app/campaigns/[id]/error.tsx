"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function CampaignError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[campaign-route-error]", {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
    });
  }, [error]);

  const showDebug = process.env.NODE_ENV !== "production";

  return (
    <div className="min-h-screen bg-barber-dark flex items-center justify-center px-4">
      <div className="rounded-xl border border-barber-gold/40 bg-barber-dark/90 p-8 max-w-md text-center shadow-xl">
        <AlertCircle className="mx-auto h-12 w-12 text-barber-gold" />
        <h1 className="mt-4 text-xl font-semibold text-barber-paper">
          Errore nel caricamento della campagna
        </h1>
        <p className="mt-2 text-sm text-barber-paper/70">
          Controlla che le variabili d&apos;ambiente Supabase siano impostate in Vercel (Settings → Environment Variables). Se il problema persiste, riprova più tardi.
        </p>
        {showDebug && error?.message ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-300">Dettaglio errore</p>
            <p className="mt-2 break-words text-xs text-red-100">{error.message}</p>
            {error.digest ? (
              <p className="mt-2 text-[11px] text-red-200/70">digest: {error.digest}</p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" className="border-barber-gold/40 text-barber-paper/80">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna alla Dashboard
            </Link>
          </Button>
          <Button onClick={reset} className="bg-barber-red hover:bg-barber-red/90">
            Riprova
          </Button>
        </div>
      </div>
    </div>
  );
}
