"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinLongCampaign } from "@/app/campaigns/actions";

type JoinLongCampaignButtonProps = {
  campaignId: string;
  className?: string;
  /** Se false, le iscrizioni autonome sono chiuse dal GM (default: true se omesso). */
  registrationsOpen?: boolean;
};

export function JoinLongCampaignButton({
  campaignId,
  className,
  registrationsOpen = true,
}: JoinLongCampaignButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (loading || !registrationsOpen) return;
    setLoading(true);
    const res = await joinLongCampaign(campaignId);
    setLoading(false);
    if (res.success) {
      if (res.justJoined) {
        router.push(`/campaigns/${campaignId}/iscrizione-confermata`);
        return;
      }
      toast.success(res.message);
      router.refresh();
      return;
    }
    toast.error(res.message);
  }

  return (
    <Button
      type="button"
      onClick={handleJoin}
      disabled={loading || !registrationsOpen}
      className={className}
      title={
        !registrationsOpen
          ? "Le iscrizioni sono chiuse. Contatta il GM."
          : undefined
      }
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Iscrizione...
        </>
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" />
          Iscriviti alla campagna
        </>
      )}
    </Button>
  );
}
