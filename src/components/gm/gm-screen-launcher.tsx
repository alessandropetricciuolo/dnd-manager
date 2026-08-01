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

const WINDOW_OPTIONS = "width=1400,height=900,menubar=no,toolbar=no,location=no,status=no";

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
    window.open(url, windowName, WINDOW_OPTIONS);
  }

  return (
    <Button type="button" variant="outline" className={className} onClick={openGmScreen}>
      <Icon className="mr-2 h-4 w-4" />
      {buttonLabel}
    </Button>
  );
}
