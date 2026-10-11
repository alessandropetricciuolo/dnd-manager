"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export default function FightProjectionPage() {
  const routeParams = useParams<{ id: string }>();
  const campaignId = (routeParams?.id as string) || "";
  const state = useFightProjectionSync(campaignId);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Monitora lo stato di schermo intero
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Tentativo di apertura automatica a tutto schermo all'avvio
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Se le policy del browser richiedono interazione utente nella nuova finestra,
        // verrà attivato al primo click sulla finestra
      }
    };
    void enterFullscreen();
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {});
    } else {
      void document.exitFullscreen().catch(() => {});
    }
  };

  const handleRootClick = (e: React.MouseEvent) => {
    // Se non è ancora a schermo intero e il click non è su un bottone interattivo, attiva il fullscreen
    if (!document.fullscreenElement && !(e.target as HTMLElement).closest("button")) {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const active = state?.activeCombatant;
  const upcoming = state?.upcomingTurns ?? [];

  return (
    <div
      onClick={handleRootClick}
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#090604] font-serif text-parchment-100 selection:bg-amber-800/40"
    >
      {/* Background Atmosphere Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(217, 119, 6, 0.15) 0%, transparent 70%), radial-gradient(circle at 80% 80%, rgba(180, 83, 9, 0.08) 0%, transparent 50%)",
        }}
      />

      {/* Header Cinematografico */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-amber-600/30 bg-[#120a06]/95 px-6 py-3 backdrop-blur-md">
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
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 font-cinzel text-xs font-bold transition-all shadow-md",
              isFullscreen
                ? "border-amber-600/30 bg-[#160d07] text-amber-300 hover:border-amber-500 hover:bg-amber-950/80"
                : "border-amber-500/70 bg-amber-950/80 text-amber-200 animate-pulse hover:bg-amber-900"
            )}
            title={isFullscreen ? "Esci da Schermo Intero" : "Attiva Schermo Intero"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4" />
                <span className="hidden sm:inline">Esci da Schermo Intero</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                <span>Schermo Intero</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 flex flex-1 min-h-0 flex-col lg:flex-row p-4 sm:p-6 gap-4 sm:gap-6 overflow-hidden">
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
            {/* 1. Combattente di Turno Spotlight (Colonna Sinistra / Principale) */}
            <div className="relative flex flex-1 min-h-0 min-w-0 items-center justify-center">
              <div className="relative flex h-full w-full max-h-[720px] flex-col items-center justify-center rounded-2xl border-2 border-amber-500/60 bg-gradient-to-b from-[#1a110a]/95 to-[#120a06]/95 p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/30 backdrop-blur-md">
                {/* Badge Turno Attivo */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-emerald-500/70 bg-emerald-950 px-6 py-1 font-cinzel text-xs font-black tracking-widest text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  IN TURNO ORA
                </div>

                <div className="flex w-full flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
                  {/* Avatar / Ritratto Grande */}
                  <div className="relative flex h-48 w-48 sm:h-64 sm:w-64 md:h-72 md:w-72 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-[#160d08] shadow-2xl">
                    {active.portraitUrl ? (
                      <Image
                        src={active.portraitUrl}
                        alt={active.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 192px, 288px"
                        priority
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-amber-500/40">
                        {active.type === "pc" ? (
                          <User className="h-28 w-28" />
                        ) : (
                          <Shield className="h-28 w-28" />
                        )}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-amber-500/40" />
                  </div>

                  {/* Dettagli Combattente di Turno */}
                  <div className="flex flex-1 flex-col items-center sm:items-start justify-center gap-4 text-center sm:text-left min-w-0">
                    <div>
                      <h2 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-black tracking-wide text-amber-100 drop-shadow-md leading-tight">
                        {active.name}
                      </h2>
                      <p className="font-sans text-sm sm:text-base font-medium text-amber-400/90 mt-1">
                        {active.characterClass || (active.type === "pc" ? "Eroe Giocatore" : "Avversario")}
                      </p>
                    </div>

                    {/* Timer Turno Digitale Countdown */}
                    <div
                      className={cn(
                        "flex items-center gap-4 rounded-xl border px-6 py-3 shadow-inner transition-colors",
                        state.turnElapsedSeconds === 0
                          ? "border-red-600 bg-red-950/70 text-red-300"
                          : state.turnElapsedSeconds <= 30
                          ? "border-amber-500 bg-amber-950/60 text-amber-200"
                          : "border-amber-600/40 bg-[#0e0804] text-amber-200"
                      )}
                    >
                      <Timer
                        className={cn(
                          "h-8 w-8",
                          state.turnElapsedSeconds === 0
                            ? "text-red-400 animate-bounce"
                            : state.turnElapsedSeconds <= 30 && state.isTurnTimerRunning
                            ? "text-amber-400 animate-pulse"
                            : state.isTurnTimerRunning
                            ? "text-amber-400"
                            : "text-zinc-500"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-sans text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
                          {state.turnElapsedSeconds === 0 ? "Tempo Scaduto" : "Countdown Turno"}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-3xl sm:text-4xl font-black tabular-nums tracking-wider",
                            state.turnElapsedSeconds === 0 ? "text-red-400 font-black animate-pulse" : "text-amber-200"
                          )}
                        >
                          {formatSeconds(state.turnElapsedSeconds)}
                        </span>
                      </div>
                    </div>

                    {/* Condizioni / Stati Attivi (con icone e descrizioni) */}
                    {active.conditions && active.conditions.length > 0 ? (
                      <div className="flex flex-col gap-2 w-full">
                        <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-zinc-400">
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
                                className="flex items-center gap-2 rounded-lg border border-amber-600/40 bg-amber-950/50 px-3 py-1.5 text-xs sm:text-sm text-amber-200 shadow-sm"
                              >
                                <span className="text-base">{icon}</span>
                                <span className="font-semibold">{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* Note combattente se presenti */}
                    {active.noteText ? (
                      <div className="rounded-lg border border-brass-base/20 bg-black/40 px-3 py-2 text-xs text-parchment-300 italic w-full">
                        {active.noteText}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. COLONNA VERTICALE: Prossimi Turni in Arrivo (Colonna Destra) */}
            <aside className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col rounded-2xl border border-amber-600/35 bg-[#120a06]/90 p-4 shadow-xl backdrop-blur-md overflow-hidden min-h-0">
              <div className="flex items-center justify-between border-b border-amber-600/25 pb-3 mb-3 shrink-0">
                <div className="flex items-center gap-2 font-cinzel text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Prossimi Turni</span>
                </div>
                <span className="rounded bg-black/50 border border-amber-600/20 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                  In coda
                </span>
              </div>

              {upcoming.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-xs text-zinc-500 italic">
                  Nessun altro combattente in coda per questo round.
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                  {upcoming.map((u, idx) => {
                    const isNext = idx === 0;
                    return (
                      <div
                        key={`${u.id}-${idx}`}
                        className={cn(
                          "relative flex items-center gap-3 rounded-xl border p-2.5 transition-all",
                          isNext
                            ? "border-amber-400/90 bg-gradient-to-r from-amber-950/70 via-amber-900/30 to-[#1b1008] shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50"
                            : "border-amber-800/30 bg-[#160e08]/90 hover:border-amber-700/50"
                        )}
                      >
                        {/* Badge Numero Turno / Ordine */}
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-black shadow-sm",
                            isNext
                              ? "bg-amber-400 text-black shadow-amber-400/30"
                              : "bg-[#25160d] text-amber-300/90 border border-amber-600/30"
                          )}
                        >
                          +{idx + 1}
                        </div>

                        {/* Avatar / Ritratto */}
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 border-amber-600/40 bg-black shadow-md">
                          {u.portraitUrl ? (
                            <Image
                              src={u.portraitUrl}
                              alt={u.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-600">
                              {u.type === "pc" ? <User className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                            </div>
                          )}
                        </div>

                        {/* Informazioni Combattente */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-cinzel text-xs sm:text-sm font-bold text-amber-100">
                              {u.name}
                            </p>
                            {isNext ? (
                              <span className="shrink-0 rounded bg-emerald-950 border border-emerald-500/50 px-1.5 py-0.5 font-cinzel text-[8px] font-black text-emerald-300">
                                PROSSIMO
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-[11px] text-zinc-400 font-sans mt-0.5">
                            {u.characterClass || (u.type === "pc" ? "Eroe Giocatore" : "Avversario")}
                          </p>

                          {/* Condizioni miniature se presenti */}
                          {u.conditions && u.conditions.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {u.conditions.map((cId) => (
                                <span
                                  key={cId}
                                  className="text-[11px]"
                                  title={COMBAT_CONDITIONS.find((c) => c.id === cId)?.label ?? cId}
                                >
                                  {CONDITION_ICONS[cId] ?? "•"}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </aside>
          </>
        )}
      </main>
    </div>
  );
}
