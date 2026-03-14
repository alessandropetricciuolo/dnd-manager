"use client";

import { useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const BODY_CLASS = "primer-print-page";

type PrimerViewProps = {
  campaignId: string;
  campaignName: string;
  markdown: string;
};

export function PrimerView({ campaignId, campaignName, markdown }: PrimerViewProps) {
  useEffect(() => {
    document.body.classList.add(BODY_CLASS);
    return () => document.body.classList.remove(BODY_CLASS);
  }, []);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-barber-dark">
      {/* Toolbar: visibile a schermo, nascosto in stampa */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-barber-gold/20 bg-barber-dark/95 px-4 py-3 backdrop-blur">
        <Link
          href={`/campaigns/${campaignId}`}
          className="text-sm font-medium text-barber-gold hover:text-barber-gold/80"
        >
          ← Torna alla campagna
        </Link>
        <Button
          type="button"
          onClick={handlePrint}
          className="gap-2 bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
        >
          <Download className="h-4 w-4" />
          ⬇️ Scarica PDF
        </Button>
      </div>

      {/* Area stampabile: tema scuro a schermo, bianco/nero in stampa */}
      <div
        id="primer-print-area"
        className="mx-auto max-w-3xl px-4 py-8 prose prose-invert max-w-none prose-headings:text-barber-gold prose-headings:break-after-avoid prose-p:break-inside-avoid prose-ul:break-inside-avoid prose-ol:break-inside-avoid print:!max-w-none print:!bg-white print:!text-gray-900 print:prose-headings:!text-gray-900 print:prose-p:!text-gray-800 print:prose-strong:!text-gray-900 print:prose-a:!text-gray-800 print:prose-li:!text-gray-800"
      >
        <h1 className="text-2xl font-bold print:!text-gray-900">{campaignName}</h1>
        <p className="text-barber-paper/80 print:!text-gray-600 text-sm -mt-2 mb-6">
          Guida del Giocatore
        </p>
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
