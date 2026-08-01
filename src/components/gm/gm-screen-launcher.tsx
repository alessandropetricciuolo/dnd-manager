"use client";

import { Button } from "@/components/ui/button";
import { LayoutGrid, Monitor } from "lucide-react";

type GmScreenLauncherProps = {
  campaignId: string;
  className?: string;
  /** classic = layout attuale; v2 = griglia modulare stile 5e.tools */
  variant?: "classic" | "v2";
  label?: string;
};

const CLASSIC_WINDOW_OPTIONS = "width=1400,height=900,menubar=no,toolbar=no,location=no,status=no";

function screenFittedWindowOptions(): string {
  const screen = window.screen as Screen & { availLeft?: number; availTop?: number };
  const availLeft = typeof screen.availLeft === "number" ? screen.availLeft : 0;
  const availTop = typeof screen.availTop === "number" ? screen.availTop : 0;
  const width = Math.max(800, screen.availWidth || window.innerWidth);
  const height = Math.max(600, screen.availHeight || window.innerHeight);
  return `left=${availLeft},top=${availTop},width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`;
}

export function GmScreenLauncher({
  campaignId,
  className,
  variant = "classic",
  label,
}: GmScreenLauncherProps) {
  const isV2 = variant === "v2";
  const url = isV2
    ? `/campaigns/${campaignId}/gm-screen-v2`
    : `/campaigns/${campaignId}/gm-screen`;
  const windowName = isV2 ? "GMScreenV2" : "GMScreen";
  const buttonLabel = label ?? (isV2 ? "GM Screen 2.0" : "Apri GM Screen");
  const Icon = isV2 ? LayoutGrid : Monitor;

  function openGmScreen() {
    const opts = isV2 ? screenFittedWindowOptions() : CLASSIC_WINDOW_OPTIONS;
    const opened = window.open(url, windowName, opts);
    // Se la finestra era già aperta, riprova a ridimensionarla allo schermo (v2).
    if (opened && isV2) {
      try {
        const screen = window.screen as Screen & { availLeft?: number; availTop?: number };
        opened.moveTo(screen.availLeft ?? 0, screen.availTop ?? 0);
        opened.resizeTo(
          Math.max(800, screen.availWidth || window.innerWidth),
          Math.max(600, screen.availHeight || window.innerHeight)
        );
      } catch {
        // Browser può bloccare move/resize cross-origin o policy.
      }
    }
  }

  return (
    <Button type="button" variant="outline" className={className} onClick={openGmScreen}>
      <Icon className="mr-2 h-4 w-4" />
      {buttonLabel}
    </Button>
  );
}
