"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus } from "lucide-react";
import { setLongCampaignRegistrationsOpen } from "@/app/campaigns/actions";

type LongRegistrationsToggleProps = {
  campaignId: string;
  registrationsOpen: boolean;
};

export function LongRegistrationsToggle({
  campaignId,
  registrationsOpen: initialOpen,
}: LongRegistrationsToggleProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(initialOpen);

  async function handleToggle() {
    setLoading(true);
    const res = await setLongCampaignRegistrationsOpen(campaignId, !open);
    setLoading(false);
    if (res.success) {
      toast.success(res.message);
      setOpen(!open);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={
        open
          ? "border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
          : "border-amber-500/50 text-amber-200 hover:bg-amber-500/10"
      }
      disabled={loading}
      onClick={handleToggle}
      title={
        open
          ? "I giocatori possono iscriversi da soli. Clicca per chiudere le iscrizioni (senza rendere privata la campagna)."
          : "Iscrizioni chiuse ai nuovi giocatori. Clicca per riaprirle."
      }
    >
      {open ? (
        <>
          <UserPlus className="mr-1.5 h-4 w-4" />
          Iscrizioni aperte
        </>
      ) : (
        <>
          <UserMinus className="mr-1.5 h-4 w-4" />
          Iscrizioni chiuse
        </>
      )}
    </Button>
  );
}
