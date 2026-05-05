"use client";

import { useRef, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
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
  eligibleParties?: { id: string; label: string; memberIds: string[] }[];
  initialVisibility?: string;
  initialAllowedUserIds?: string[];
  initialAllowedPartyIds?: string[];
  /** Da lista wiki con `?edit=1`: apre il dialog al caricamento e ripulisce l'URL alla chiusura. */
  autoOpenEditDialog?: boolean;
};

export function WikiEntityEditButton({
  campaignId,
  campaignType,
  entity,
  contentBody,
  eligiblePlayers = [],
  eligibleParties = [],
  initialVisibility = "public",
  initialAllowedUserIds = [],
  initialAllowedPartyIds = [],
  autoOpenEditDialog = false,
}: WikiEntityEditButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpenEditDialog);
  const stripEditQueryOnCloseRef = useRef(autoOpenEditDialog);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && stripEditQueryOnCloseRef.current) {
      stripEditQueryOnCloseRef.current = false;
      router.replace(`/campaigns/${campaignId}/wiki/${entity.id}`, { scroll: false });
    }
  }

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
        onOpenChange={handleOpenChange}
        eligiblePlayers={eligiblePlayers}
        eligibleParties={eligibleParties}
        initialVisibility={initialVisibility}
        initialAllowedUserIds={initialAllowedUserIds}
        initialAllowedPartyIds={initialAllowedPartyIds}
      />
    </>
  );
}
