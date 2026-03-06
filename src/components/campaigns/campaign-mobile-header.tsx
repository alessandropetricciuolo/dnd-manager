"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNavMenu } from "@/components/dashboard/mobile-nav-menu";

type CampaignMobileHeaderProps = {
  isAdmin: boolean;
  isGmOrAdmin: boolean;
  campaignName: string;
};

export function CampaignMobileHeader({
  isAdmin,
  isGmOrAdmin,
  campaignName,
}: CampaignMobileHeaderProps) {
  return (
    <div className="flex items-center gap-2 border-b border-barber-gold/20 bg-barber-dark/95 px-3 py-2 lg:hidden">
      <MobileNavMenu isAdmin={isAdmin} isGmOrAdmin={isGmOrAdmin} iconOnly />
      <Link href="/dashboard" className="inline-flex text-barber-paper/80 hover:text-barber-paper">
        <Button variant="ghost" size="sm" className="h-8 text-barber-paper/80">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Indietro
        </Button>
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-white">
        {campaignName}
      </h1>
    </div>
  );
}
