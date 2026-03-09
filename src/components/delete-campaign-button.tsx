"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteCampaign } from "@/app/campaigns/actions";

type DeleteCampaignButtonProps = {
  campaignId: string;
  campaignName: string;
};

export function DeleteCampaignButton({ campaignId, campaignName }: DeleteCampaignButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Eliminare la campagna "${campaignName}"? Tutte le sessioni, iscrizioni, wiki e mappe verranno rimossi.`)) {
      return;
    }
    setLoading(true);
    const res = await deleteCampaign(campaignId);
    setLoading(false);
    if (res.success) {
      toast.success(res.message);
      router.push("/dashboard");
    } else {
      toast.error(res.message);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
      disabled={loading}
      onClick={handleDelete}
      title="Elimina campagna"
    >
      <Trash2 className="h-4 w-4 mr-1.5" />
      {loading ? "Eliminazione..." : "Elimina campagna"}
    </Button>
  );
}
