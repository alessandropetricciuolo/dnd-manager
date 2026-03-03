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
};

export function WikiEntityEditButton({
  campaignId,
  entity,
  contentBody,
}: WikiEntityEditButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-emerald-600/60 text-emerald-200 hover:bg-emerald-500/10"
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
      />
    </>
  );
}
