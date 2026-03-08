"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EditEntityDialog } from "./edit-entity-dialog";
import type { WikiEntity } from "@/app/campaigns/wiki-actions";
import { Pencil } from "lucide-react";

type WikiEntityEditButtonProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  entity: WikiEntity;
  contentBody: string;
  eligiblePlayers?: { id: string; label: string }[];
  initialVisibility?: string;
  initialAllowedUserIds?: string[];
};

export function WikiEntityEditButton({
  campaignId,
  campaignType,
  entity,
  contentBody,
  eligiblePlayers = [],
  initialVisibility = "public",
  initialAllowedUserIds = [],
}: WikiEntityEditButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-barber-gold/50 text-barber-gold hover:bg-barber-gold/10"
        onClick={() => setOpen(true)}
      >
        <Pencil className="mr-2 h-4 w-4" />
        Modifica
      </Button>
      <EditEntityDialog
        campaignId={campaignId}
        campaignType={campaignType}
        entity={entity}
        contentBody={contentBody}
        open={open}
        onOpenChange={setOpen}
        eligiblePlayers={eligiblePlayers}
        initialVisibility={initialVisibility}
        initialAllowedUserIds={initialAllowedUserIds}
      />
    </>
  );
}
