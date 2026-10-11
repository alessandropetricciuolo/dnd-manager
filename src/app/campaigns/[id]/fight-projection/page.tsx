"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { Maximize2, Minimize2, Shield, Sparkles, Swords, Timer, User } from "lucide-react";
import { useFightProjectionSync } from "@/lib/fight-mode/broadcast";
import { COMBAT_CONDITIONS } from "@/lib/combat-conditions";
import { cn } from "@/lib/utils";

function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.trunc(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

const CONDITION_ICONS: Record<string, string> = {
  avvelenato: "🧪",
  accecato: "👁️",
  affascinato: "✨",
  afferrato: "✊",
  assordato: "👂",
  incapacitato: "⚡",
  indebolimento: "⏳",
  invisibile: "👻",
  paralizzato: "❄️",
  pietrificato: "🗿",
  privo_di_sensi: "💤",
  prono: "⬇️",
  spaventato: "😱",
  stordito: "💫",
  trattenuto: "⛓️",
};

export default function FightProjectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;
  const state = useFightProjectionSync(campaignId);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  };

  const active = state?.activeCombatant;
  const upcoming = state?.upcomingTurns ?? [];

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#090604] font-serif text-parchment-100 selection:bg-amber-800/40">
      {/* Background Atmosphere Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(217, 119, 6, 0.15) 0%, transparent 70%), radial-gradient(circle at 80% 80%, rgba(180, 83, 9, 0.08) 0%, transparent 50%)",
        }}
      />

      {/* Header Cinematografico */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-amber-600/30 bg-[#120a06]/90 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-950/60 text-amber-300 shadow-md">
            <Swords className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-cinzel text-base font-bold tracking-wider text-amber-200">
              SCHERMO BATTAGLIA
            </h1>
            <p className="font-sans text-[11px] text-zinc-400">Barber & Dragons · Ordine d&apos;Iniziativa</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {state ? (
            <div className="flex items-center gap-2 rounded-full border border-amber-600/40 bg-[#1a100a] px-4 py-1 font-cinzel text-xs font-bold text-amber-300 shadow-inner">
              <span>ROUND</span>
              <span className="font-mono text-sm text-white">{state.roundNumber}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-600/30 bg-[#160d07] text-amber-300 transition-colors hover:border-amber-500 hover:bg-amber-950/80"
            title={isFullscreen ? "Esci da Schermo Intero" : "Schermo Intero"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 flex flex-1 min-h-0 flex-col p-6 gap-6">
        {!state || !active ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-600/30 bg-amber-950/30 text-amber-400/60 mb-4 animate-pulse">
              <Swords className="h-8 w-8" />
            </div>
            <h2 className="font-cinzel text-2xl font-bold text-amber-200/90">
              In attesa dell&apos;Iniziativa...
            </h2>
            <p className="mt-2 max-w-md text-sm text-zinc-400">
              Il Dungeon Master sta preparando il combattimento sulla plancia tattica. Preparate i dadi!
            </p>
          </div>
        ) : (
          <>
            {/* 1. Combattente di Turno Spotlight */}
            <div className="relative flex flex-1 min-h-0 items-center justify-center">
              <div className="relative flex h-full max-h-[520px] w-full max-w-4xl flex-col items-center justify-between rounded-2xl border-2 border-amber-500/60 bg-gradient-to-b from-[#1a110a]/95 to-[#120a06]/95 p-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/30 backdrop-blur-md sm:flex-row sm:p-8">
                {/* Badge Turno Attivo */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-emerald-500/70 bg-emerald-950 px-5 py-0.5 font-cinzel text-xs font-black tracking-widest text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  IN TURNO ORA
                </div>

                {/* Avatar / Ritratto Grande */}
                <div className="relative flex h-48 w-48 sm:h-64 sm:w-64 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-[#160d08] shadow-2xl">
                  {active.portraitUrl ? (
                    <Image
                      src={active.portraitUrl}
                      alt={active.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 192px, 256px"
                      priority
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-amber-500/40">
                      {active.type === "pc" ? (
                        <User className="h-24 w-24" />
                      ) : (
                        <Shield className="h-24 w-24" />
                      )}
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-amber-500/40" />
                </div>

                {/* Dettagli Combattente di Turno */}
                <div className="flex flex-1 flex-col items-center sm:items-start justify-center gap-4 sm:pl-8 text-center sm:text-left mt-4 sm:mt-0">
                  <div>
                    <h2 className="font-cinzel text-3xl font-black tracking-wide text-amber-100 sm:text-4xl drop-shadow-md">
                      {active.name}
                    </h2>
                    <p className="font-sans text-sm font-medium text-amber-400/90 mt-1">
                      {active.characterClass || (active.type === "pc" ? "Eroe Giocatore" : "Avversario")}
                    </p>
                  </div>

                  {/* Timer Turno Digitale */}
                  <div className="flex items-center gap-3 rounded-xl border border-amber-600/40 bg-[#0e0804] px-5 py-2.5 shadow-inner">
                    <Timer
                      className={cn(
                        "h-6 w-6",
                        state.isTurnTimerRunning
                          ? "text-amber-400 animate-pulse"
                          : "text-zinc-500"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-sans text-[10px] uppercase tracking-wider text-zinc-400">
                        Tempo Turno
                      </span>
                      <span className="font-mono text-2xl font-bold tabular-nums text-amber-200">
                        {formatSeconds(state.turnElapsedSeconds)}
                      </span>
                    </div>
                  </div>

                  {/* Condizioni / Stati Attivi (con icone e descrizioni) */}
                  {active.conditions && active.conditions.length > 0 ? (
                    <div className="flex flex-col gap-1.5 w-full">
                      <span className="font-cinzel text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Condizioni Attive
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {active.conditions.map((cId) => {
                          const condObj = COMBAT_CONDITIONS.find((c) => c.id === cId);
                          const icon = CONDITION_ICONS[cId] ?? "•";
                          const label = condObj?.label ?? cId;
                          return (
                            <div
                              key={cId}
                              className="flex items-center gap-1.5 rounded-lg border border-amber-600/40 bg-amber-950/50 px-2.5 py-1 text-xs text-amber-200 shadow-sm"
                            >
                              <span>{icon}</span>
                              <span className="font-semibold">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 2. Coda dei Prossimi 5 Turni ("On-Deck Queue") */}
            <div className="shrink-0 flex flex-col gap-2 rounded-xl border border-amber-600/30 bg-[#120a06]/85 p-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Prossimi Turni in Arrivo (Prepararsi all&apos;Azione)</span>
                </div>
                <span className="text-[11px] text-zinc-400 font-sans">
                  Ordine di Combattimento
                </span>
              </div>

              {upcoming.length === 0 ? (
                <p className="py-2 text-center text-xs text-zinc-500 italic">
                  Nessun altro combattente in coda per questo round.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {upcoming.map((u, idx) => (
                    <div
                      key={`${u.id}-${idx}`}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg border p-2 transition-all",
                        idx === 0
                          ? "border-amber-500/70 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40"
                          : "border-amber-700/25 bg-[#170e08]/90"
                      )}
                    >
                      {/* Badge Posizione Coda */}
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold",
                          idx === 0
                            ? "bg-amber-500 text-black"
                            : "bg-[#25160d] text-amber-300 border border-amber-600/30"
                        )}
                      >
                        +{idx + 1}
                      </div>

                      {/* Mini Avatar */}
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-amber-600/30 bg-black">
                        {u.portraitUrl ? (
                          <Image
                            src={u.portraitUrl}
                            alt={u.name}
                            fill
                            className="object-cover"
                            sizes="36px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-600">
                            {u.type === "pc" ? <User className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                          </div>
                        )}
                      </div>

                      {/* Info Combattente */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-cinzel text-xs font-bold text-parchment-100">
                          {u.name}
                        </p>
                        <p className="truncate text-[10px] text-zinc-400 font-sans">
                          {u.characterClass || (u.type === "pc" ? "Eroe" : "Nemico")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
