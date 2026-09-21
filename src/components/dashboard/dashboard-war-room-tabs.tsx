"use client";

import { useState } from "react";
import { CalendarDays, Shield, Compass, ScrollText, Sparkles, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardWarRoomTabsProps {
  calendarSlot: React.ReactNode;
  myCampaignsSlot: React.ReactNode;
  allCampaignsSlot: React.ReactNode;
  sessionsHistorySlot: React.ReactNode;
  isGmOrAdmin: boolean;
  counts: {
    myCampaigns: number;
    allCampaigns: number;
  };
}

export type WarRoomTabKey = "calendar" | "my-campaigns" | "all-campaigns" | "sessions";

export function DashboardWarRoomTabs({
  calendarSlot,
  myCampaignsSlot,
  allCampaignsSlot,
  sessionsHistorySlot,
  isGmOrAdmin,
  counts,
}: DashboardWarRoomTabsProps) {
  const [activeTab, setActiveTab] = useState<WarRoomTabKey>("calendar");

  const tabs: {
    id: WarRoomTabKey;
    label: string;
    sublabel: string;
    icon: typeof CalendarDays;
    badge?: string | number;
  }[] = [
    {
      id: "calendar",
      label: "Calendario Tavoli",
      sublabel: "Sessioni & Convocazioni",
      icon: CalendarDays,
      badge: "In Evidenza",
    },
    {
      id: "my-campaigns",
      label: "Le Mie Saghe",
      sublabel: isGmOrAdmin ? "Campagne che dirigi" : "I tuoi tavoli attivi",
      icon: Shield,
      badge: counts.myCampaigns,
    },
    {
      id: "all-campaigns",
      label: "Bacheca di Gilda",
      sublabel: "Tutte le avventure aperte",
      icon: Compass,
      badge: counts.allCampaigns,
    },
    {
      id: "sessions",
      label: isGmOrAdmin ? "Registro Master" : "I Miei Biglietti",
      sublabel: isGmOrAdmin ? "Storico & presenze" : "Pass di gioco confermati",
      icon: ScrollText,
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Tabletop Segmented Controller / Brass Rail Switchboard */}
      <div className="card-guild-stone relative rounded-2xl border-2 border-brass-base/40 p-2 shadow-2xl backdrop-blur-md">
        <div className="corner-ornament-tl" />
        <div className="corner-ornament-tr" />
        <div className="corner-ornament-bl" />
        <div className="corner-ornament-br" />

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "group relative flex flex-col items-start rounded-xl p-3 text-left transition-all duration-300",
                  isActive
                    ? "border border-brass-light/70 bg-gradient-to-b from-brass-base/30 via-guild-oak/95 to-guild-void shadow-[0_4px_20px_rgba(200,157,73,0.25)]"
                    : "border border-transparent bg-guild-stone/40 hover:border-brass-base/30 hover:bg-guild-stone/70"
                )}
              >
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-brass-light px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider text-guild-void shadow-sm">
                    Attivo
                  </span>
                )}
                <div className="flex w-full items-center justify-between gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      isActive
                        ? "border-brass-light bg-guild-void text-brass-light shadow-inner"
                        : "border-brass-base/20 bg-guild-stone text-parchment-400 group-hover:border-brass-base/40 group-hover:text-brass-base"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {tab.badge !== undefined && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider transition-colors",
                        isActive
                          ? "border border-brass-light/40 bg-guild-void text-brass-light"
                          : "border border-brass-base/20 bg-guild-stone/80 text-parchment-400 group-hover:text-parchment-200"
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>

                <div className="mt-2.5">
                  <h3
                    className={cn(
                      "font-serif text-sm font-bold tracking-tight transition-colors",
                      isActive ? "text-gold-relief" : "text-parchment-200 group-hover:text-parchment-100"
                    )}
                  >
                    {tab.label}
                  </h3>
                  <p className="line-clamp-1 text-[11px] text-parchment-400">
                    {tab.sublabel}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="transition-opacity duration-300">
        {activeTab === "calendar" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {calendarSlot}
          </div>
        )}

        {activeTab === "my-campaigns" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between border-b border-brass-base/20 pb-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-gold-relief sm:text-2xl">
                  {isGmOrAdmin ? "Saghe sotto la tua Guida" : "Le Tue Saghe e Tavoli Attivi"}
                </h2>
                <p className="mt-1 text-xs text-parchment-300">
                  {isGmOrAdmin
                    ? "Campagne che hai creato e che conduci come Gran Maestro."
                    : "Campagne in cui hai già preso parte o conquistato la tua sedia al tavolo."}
                </p>
              </div>
            </div>
            {myCampaignsSlot}
          </div>
        )}

        {activeTab === "all-campaigns" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between border-b border-brass-base/20 pb-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-gold-relief sm:text-2xl">
                  Bacheca Ufficiale della Gilda
                </h2>
                <p className="mt-1 text-xs text-parchment-300">
                  Tutte le campagne registrate nel regno di Barber & Dragons. Esplora le trame e richiedi l&apos;ingresso.
                </p>
              </div>
            </div>
            {allCampaignsSlot}
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between border-b border-brass-base/20 pb-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-gold-relief sm:text-2xl">
                  {isGmOrAdmin ? "Cronache e Storico del Master" : "I Tuoi Biglietti & Sigilli di Sessione"}
                </h2>
                <p className="mt-1 text-xs text-parchment-300">
                  {isGmOrAdmin
                    ? "Riepilogo delle sessioni svolte, presenze registrate e note di tavolo."
                    : "Verifica lo stato delle tue prenotazioni, gli orari e le convocazioni."}
                </p>
              </div>
            </div>
            {sessionsHistorySlot}
          </div>
        )}
      </div>
    </div>
  );
}
