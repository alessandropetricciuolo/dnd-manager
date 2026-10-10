"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MissionProjectionShell({ children }: { children: React.ReactNode }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await (rootRef.current ?? document.documentElement).requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignora errori di gesture/permessi browser
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen bg-[#0a0705] p-3 text-parchment-100 sm:p-5 md:p-8"
    >
      <div className="absolute right-4 top-4 z-50">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void toggleFullscreen()}
          className="border-brass-base/40 bg-guild-stone/90 text-parchment-200 backdrop-blur hover:bg-brass-base/20 hover:text-brass-light font-serif text-xs shadow-md"
          title={isFullscreen ? "Esci da schermo intero" : "Attiva schermo intero"}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="mr-1.5 h-3.5 w-3.5 text-brass-base" />
              Esci
            </>
          ) : (
            <>
              <Maximize2 className="mr-1.5 h-3.5 w-3.5 text-brass-base" />
              Schermo intero
            </>
          )}
        </Button>
      </div>
      <div className="mx-auto max-w-[1920px]">{children}</div>
    </div>
  );
}
