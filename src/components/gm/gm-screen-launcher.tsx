"use client";

import { Button } from "@/components/ui/button";
import { Monitor } from "lucide-react";

type GmScreenLauncherProps = {
  campaignId: string;
  className?: string;
};

const WINDOW_OPTIONS = "width=1400,height=900,menubar=no,toolbar=no,location=no,status=no";

export function GmScreenLauncher({ campaignId, className }: GmScreenLauncherProps) {
  function openGmScreen() {
    const url = `/campaigns/${campaignId}/gm-screen`;
    window.open(url, "GMScreen", WINDOW_OPTIONS);
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={openGmScreen}
    >
      <Monitor className="mr-2 h-4 w-4" />
      Apri GM Screen
    </Button>
  );
}
