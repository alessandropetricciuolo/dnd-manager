"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Globe, Lock } from "lucide-react";
import { setCampaignPublic } from "@/app/campaigns/actions";

type CampaignVisibilityToggleProps = {
  campaignId: string;
  isPublic: boolean;
};

export function CampaignVisibilityToggle({ campaignId, isPublic: initialPublic }: CampaignVisibilityToggleProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(initialPublic);

  async function handleToggle() {
    setLoading(true);
    const res = await setCampaignPublic(campaignId, !isPublic);
    setLoading(false);
    if (res.success) {
      toast.success(res.message);
      setIsPublic(!isPublic);
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
        isPublic
          ? "border-emerald-600/60 text-emerald-300 hover:bg-emerald-500/10"
          : "border-slate-600 text-slate-400 hover:bg-slate-500/10"
      }
      disabled={loading}
      onClick={handleToggle}
      title={isPublic ? "Visibile a tutti i giocatori. Clicca per rendere privata." : "Solo iscritti. Clicca per rendere pubblica."}
    >
      {isPublic ? (
        <>
          <Globe className="h-4 w-4 mr-1.5" />
          Pubblica
        </>
      ) : (
        <>
          <Lock className="h-4 w-4 mr-1.5" />
          Privata
        </>
      )}
    </Button>
  );
}
