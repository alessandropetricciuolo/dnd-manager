"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function CampaignError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
