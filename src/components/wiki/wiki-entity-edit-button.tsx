"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EditEntityDialog } from "./edit-entity-dialog";
import type { WikiEntity } from "@/app/campaigns/wiki-actions";
import { Pencil } from "lucide-react";

type WikiEntityEditButtonProps = {
  campaignId: string;
  entity: WikiEntity;
  contentBody: string;
  eligiblePlayers?: { id: string; label: string }[];
  initialVisibility?: string;
  initialAllowedUserIds?: string[];
};

export function WikiEntityEditButton({
  campaignId,
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
