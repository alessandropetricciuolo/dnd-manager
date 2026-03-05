"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function saveAndClose(value: "necessary" | "all") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
      setVisible(false);
    } catch {
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Preferenze cookie"
      className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border border-b-0 border-barber-gold/40 bg-[#1a1614] px-4 py-4 shadow-[0_-8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(251,191,36,0.06)] backdrop-blur-sm sm:px-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-barber-paper/90">
          Usiamo i cookie per migliorare la tua esperienza nelle terre di Barber & Dragons.{" "}
          <Link
            href="/privacy"
            className="font-medium text-barber-gold underline underline-offset-2 hover:text-barber-gold/90"
          >
            Leggi la Policy
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="border-barber-paper/30 text-barber-paper/90 hover:bg-barber-paper/10"
            onClick={() => saveAndClose("necessary")}
          >
            Accetta solo tecnici
          </Button>
          <Button
            size="sm"
            className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
            onClick={() => saveAndClose("all")}
          >
            Accetta tutto
          </Button>
        </div>
      </div>
    </div>
  );
}
