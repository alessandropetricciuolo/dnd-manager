"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert, X } from "lucide-react";

export function DashboardNoticeBanner() {
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (notice === "gm_only") {
      toast.info(
        "Accesso riservato: Compendio e Generatore sono strumenti dedicati ai Dungeon Master della gilda."
      );
    }
  }, [notice]);

  if (!notice || dismissed) return null;

  if (notice === "gm_only") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-brass-base/40 bg-guild-oak/95 px-4 py-3 text-xs sm:text-sm text-parchment-200 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <ShieldAlert className="h-5 w-5 shrink-0 text-brass-base" aria-hidden="true" />
          <span className="leading-snug">
            <strong className="font-serif font-bold text-brass-light">Accesso Riservato ai Master:</strong>{" "}
            la sezione richiesta è accessibile solo ai Dungeon Master della Gilda.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-1 text-parchment-400 transition hover:bg-brass-base/10 hover:text-parchment-100 focus:outline-none focus:ring-1 focus:ring-brass-base"
          aria-label="Chiudi avviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
