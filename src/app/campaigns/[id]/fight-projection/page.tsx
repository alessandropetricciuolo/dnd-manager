"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Maximize2, Minimize2, Shield, Sparkles, Swords, Timer, User, Volume2 } from "lucide-react";
import { useFightProjectionSync } from "@/lib/fight-mode/broadcast";
import { COMBAT_CONDITIONS } from "@/lib/combat-conditions";
import { playDeepBellSound } from "@/lib/fight-mode/bell";
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

  // Monitora lo stato effettivo di schermo intero
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
        // Se le policy del browser richiedono interazione utente, si attiverà al primo click
      }
    };
    void enterFullscreen();
  }, []);

  // Rintocco di campana molto grave quando il countdown arriva a 0
  const prevSecondsRef = useRef<number | null>(null);
  useEffect(() => {
    if (!state) return;
    const current = state.turnElapsedSeconds;
    const prev = prevSecondsRef.current;
    prevSecondsRef.current = current;

    // Esegui il rintocco quando il timer scende a zero da un valore precedente positivo
    if (prev !== null && prev > 0 && current === 0) {
      playDeepBellSound();
    }
  }, [state?.turnElapsedSeconds]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {});
    } else {
      void document.exitFullscreen().catch(() => {});
    }
  };

  const handleRootClick = (e: React.MouseEvent) => {
    // Se non è ancora a tutto schermo e il click non è su un bottone, attiva il fullscreen
    if (!document.fullscreenElement && !(e.target as HTMLElement).closest("button")) {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const active = state?.activeCombatant;
  const upcoming = state?.upcomingTurns ?? [];

  return (
    <div
      onClick={handleRootClick}
      className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-[#090604] font-serif text-parchment-100 selection:bg-amber-800/40"
    >
      {/* Background Atmosphere Texture & Glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 40% 40%, rgba(217, 119, 6, 0.18) 0%, transparent 65%), radial-gradient(circle at 85% 75%, rgba(180, 83, 9, 0.12) 0%, transparent 55%)",
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

        <div className="flex items-center gap-3">
          {state ? (
            <div className="flex items-center gap-2 rounded-full border border-amber-600/40 bg-[#1a100a] px-4 py-1 font-cinzel text-xs font-bold text-amber-300 shadow-inner">
              <span>ROUND</span>
              <span className="font-mono text-sm text-white">{state.roundNumber}</span>
            </div>
          ) : null}

          {/* Test Suono Campana */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playDeepBellSound();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-600/30 bg-[#160d07] text-amber-300 transition-colors hover:border-amber-500 hover:bg-amber-950/80"
            title="Test Rintocco Campana Grave"
          >
            <Volume2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
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
      <main className="relative z-10 flex flex-1 min-h-0 flex-col lg:flex-row p-4 sm:p-6 xl:p-8 gap-6 overflow-hidden">
        {!state || !active ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-amber-600/30 bg-amber-950/30 text-amber-400/60 mb-4 animate-pulse">
              <Swords className="h-10 w-10" />
            </div>
            <h2 className="font-cinzel text-3xl font-bold text-amber-200/90">
              In attesa dell&apos;Iniziativa...
            </h2>
            <p className="mt-2 max-w-md text-base text-zinc-400">
              Il Dungeon Master sta preparando il combattimento sulla plancia tattica. Preparate i dadi!
            </p>
          </div>
        ) : (
          <>
            {/* 1. Combattente di Turno Spotlight (Colonna Sinistra / Principale, ~70% dello schermo) */}
            <div className="relative flex flex-1 min-h-0 min-w-0 items-center justify-center">
              <div className="relative flex h-full w-full flex-col justify-center rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-[#1a110a]/95 via-[#140d07]/95 to-[#100804]/98 p-6 sm:p-8 xl:p-10 shadow-[0_0_60px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/30 backdrop-blur-md overflow-hidden">
                {/* Badge Turno Attivo */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl border-x border-b border-emerald-500/70 bg-emerald-950 px-8 py-1.5 font-cinzel text-xs xl:text-sm font-black tracking-widest text-emerald-300 shadow-[0_4px_20px_rgba(16,185,129,0.35)]">
                  IN TURNO ORA
                </div>

                <div className="flex w-full flex-col md:flex-row items-center justify-center gap-6 sm:gap-8 xl:gap-12 2xl:gap-16 pt-4">
                  {/* Avatar / Ritratto Monumentale Grande */}
                  <div className="relative flex h-64 w-64 sm:h-80 sm:w-80 md:h-88 md:w-88 xl:h-[380px] xl:w-[380px] 2xl:h-[440px] 2xl:w-[440px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-amber-500/60 bg-[#160d08] shadow-[0_0_40px_rgba(0,0,0,0.9)]">
                    {active.portraitUrl ? (
                      <Image
                        src={active.portraitUrl}
                        alt={active.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 320px, 440px"
                        priority
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-amber-500/40">
                        {active.type === "pc" ? (
                          <User className="h-36 w-36" />
                        ) : (
                          <Shield className="h-36 w-36" />
                        )}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-amber-400/40" />
                  </div>

                  {/* Dettagli Combattente di Turno (Nome Gigante, Countdown Enorme, Condizioni) */}
                  <div className="flex flex-1 flex-col items-center md:items-start justify-center gap-5 xl:gap-6 text-center md:text-left min-w-0 w-full">
                    {/* Nome & Classe Giganti */}
                    <div className="w-full">
                      <h2 className="font-cinzel text-4xl sm:text-5xl md:text-6xl xl:text-7xl 2xl:text-8xl font-black tracking-wide text-amber-100 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] leading-tight truncate">
                        {active.name}
                      </h2>
                      <p className="font-sans text-base sm:text-lg xl:text-2xl font-bold text-amber-400/90 mt-1 sm:mt-2 tracking-wide uppercase">
                        {active.characterClass || (active.type === "pc" ? "Eroe Giocatore" : "Avversario")}
                      </p>
                    </div>

                    {/* Timer Turno Digitale Maxi Countdown */}
                    <div
                      className={cn(
                        "flex items-center gap-5 xl:gap-8 rounded-2xl border-2 px-6 py-4 sm:px-8 sm:py-5 xl:px-10 xl:py-6 shadow-2xl transition-all w-full max-w-xl",
                        state.turnElapsedSeconds === 0
                          ? "border-red-600 bg-red-950/80 text-red-300 shadow-[0_0_40px_rgba(239,68,68,0.4)] animate-pulse"
                          : state.turnElapsedSeconds <= 30
                          ? "border-amber-500 bg-amber-950/70 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.25)]"
                          : "border-amber-600/50 bg-[#0c0603]/95 text-amber-100 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]"
                      )}
                    >
                      <Timer
                        className={cn(
                          "h-12 w-12 sm:h-14 sm:w-14 xl:h-18 xl:w-18 shrink-0",
                          state.turnElapsedSeconds === 0
                            ? "text-red-400 animate-bounce"
                            : state.turnElapsedSeconds <= 30 && state.isTurnTimerRunning
                            ? "text-amber-400 animate-pulse"
                            : state.isTurnTimerRunning
                            ? "text-amber-400"
                            : "text-zinc-500"
                        )}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-cinzel text-xs sm:text-sm xl:text-base uppercase tracking-widest text-zinc-400 font-bold">
                          {state.turnElapsedSeconds === 0 ? "Tempo Scaduto" : "Countdown Turno"}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-5xl sm:text-6xl md:text-7xl xl:text-8xl 2xl:text-9xl font-black tabular-nums tracking-widest leading-none mt-1",
                            state.turnElapsedSeconds === 0
                              ? "text-red-400 font-black animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                              : "text-amber-100 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                          )}
                        >
                          {formatSeconds(state.turnElapsedSeconds)}
                        </span>
                      </div>
                    </div>

                    {/* Condizioni / Stati Attivi Grandi */}
                    {active.conditions && active.conditions.length > 0 ? (
                      <div className="flex flex-col gap-2 w-full">
                        <span className="font-cinzel text-xs xl:text-sm font-bold uppercase tracking-wider text-zinc-400">
                          Condizioni Attive
                        </span>
                        <div className="flex flex-wrap gap-2.5">
                          {active.conditions.map((cId) => {
                            const condObj = COMBAT_CONDITIONS.find((c) => c.id === cId);
                            const icon = CONDITION_ICONS[cId] ?? "•";
                            const label = condObj?.label ?? cId;
                            return (
                              <div
                                key={cId}
                                className="flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-950/60 px-3.5 py-1.5 text-sm xl:text-base text-amber-200 shadow-md font-bold"
                              >
                                <span className="text-lg xl:text-xl">{icon}</span>
                                <span>{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* Note combattente se presenti */}
                    {active.noteText ? (
                      <div className="rounded-xl border border-brass-base/30 bg-black/60 px-4 py-2.5 text-sm xl:text-base text-parchment-200 italic w-full">
                        {active.noteText}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. COLONNA VERTICALE: Prossimi Turni in Arrivo (Colonna Destra, ~30% larghezza) */}
            <aside className="w-full lg:w-80 xl:w-96 2xl:w-[420px] shrink-0 flex flex-col rounded-2xl border border-amber-600/35 bg-[#120a06]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md overflow-hidden min-h-0">
              <div className="flex items-center justify-between border-b border-amber-600/25 pb-3 mb-3 shrink-0">
                <div className="flex items-center gap-2 font-cinzel text-sm sm:text-base font-bold uppercase tracking-wider text-amber-300">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Prossimi Turni</span>
                </div>
                <span className="rounded bg-black/50 border border-amber-600/20 px-2 py-0.5 font-mono text-[10px] sm:text-xs text-zinc-400">
                  In coda
                </span>
              </div>

              {upcoming.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-sm text-zinc-500 italic">
                  Nessun altro combattente in coda per questo round.
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
                  {upcoming.map((u, idx) => {
                    const isNext = idx === 0;
                    return (
                      <div
                        key={`${u.id}-${idx}`}
                        className={cn(
                          "relative flex items-center gap-3.5 rounded-xl border p-3 transition-all",
                          isNext
                            ? "border-amber-400 bg-gradient-to-r from-amber-950/80 via-amber-900/40 to-[#1b1008] shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/60"
                            : "border-amber-800/30 bg-[#160e08]/90 hover:border-amber-700/50"
                        )}
                      >
                        {/* Badge Numero Turno / Ordine */}
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs sm:text-sm font-black shadow-md",
                            isNext
                              ? "bg-amber-400 text-black shadow-amber-400/30"
                              : "bg-[#25160d] text-amber-300/90 border border-amber-600/30"
                          )}
                        >
                          +{idx + 1}
                        </div>

                        {/* Avatar / Ritratto */}
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-amber-600/40 bg-black shadow-md">
                          {u.portraitUrl ? (
                            <Image
                              src={u.portraitUrl}
                              alt={u.name}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-600">
                              {u.type === "pc" ? <User className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
                            </div>
                          )}
                        </div>

                        {/* Informazioni Combattente */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="truncate font-cinzel text-sm sm:text-base font-bold text-amber-100">
                              {u.name}
                            </p>
                            {isNext ? (
                              <span className="shrink-0 rounded bg-emerald-950 border border-emerald-500/50 px-1.5 py-0.5 font-cinzel text-[9px] font-black text-emerald-300">
                                PROSSIMO
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-zinc-400 font-sans mt-0.5">
                            {u.characterClass || (u.type === "pc" ? "Eroe Giocatore" : "Avversario")}
                          </p>

                          {/* Condizioni miniature se presenti */}
                          {u.conditions && u.conditions.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {u.conditions.map((cId) => (
                                <span
                                  key={cId}
                                  className="text-xs"
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
