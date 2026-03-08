"use client";

import { useState } from "react";
import { InitiativeTracker } from "./initiative-tracker";
import { GmNotesGrid } from "./gm-notes-grid";
import { Button } from "@/components/ui/button";
import { ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

type GmScreenLayoutProps = {
  campaignId: string;
};

export function GmScreenLayout({ campaignId }: GmScreenLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      {/* Toggle button: sempre visibile quando la sidebar è chiusa, o come tab sulla sinistra quando è aperta */}
      <div
        className={cn(
          "flex shrink-0 flex-col items-center border-amber-600/20 bg-zinc-900/80 transition-all duration-300",
          sidebarOpen ? "w-10 border-r" : "w-12 border-r"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "mt-3 text-amber-400 hover:bg-amber-600/20 hover:text-amber-200",
            sidebarOpen ? "rotate-0" : ""
          )}
          onClick={() => setSidebarOpen((o) => !o)}
          title={sidebarOpen ? "Chiudi Initiative Tracker" : "Apri Initiative Tracker"}
        >
          <ListOrdered className="h-5 w-5" />
        </Button>
        {!sidebarOpen && (
          <span className="mt-2 w-full origin-left rotate-90 whitespace-nowrap text-[10px] font-medium text-amber-400/80">
            Tracker
          </span>
        )}
      </div>

      {/* Sidebar con Initiative Tracker: metà finestra quando aperta */}
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-r border-amber-600/20 bg-zinc-950 transition-[width] duration-300 ease-in-out overflow-hidden",
          sidebarOpen ? "w-1/2" : "w-0"
        )}
      >
        {sidebarOpen && (
          <div className="h-full min-w-0 flex-1">
            <InitiativeTracker campaignId={campaignId} />
          </div>
        )}
      </aside>

      {/* Area principale: Note GM */}
      <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
        <GmNotesGrid campaignId={campaignId} />
      </main>
    </div>
  );
}
