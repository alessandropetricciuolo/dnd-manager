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
};

export function JoinLongCampaignButton({ campaignId, className }: JoinLongCampaignButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (loading) return;
    setLoading(true);
    const res = await joinLongCampaign(campaignId);
    setLoading(false);
    if (res.success) {
      toast.success(res.message);
      router.refresh();
      return;
    }
    toast.error(res.message);
  }

  return (
    <Button type="button" onClick={handleJoin} disabled={loading} className={className}>
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
