"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
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
          ? "border-barber-gold/50 text-barber-gold hover:bg-barber-gold/10"
          : "border-barber-gold/30 text-barber-paper/70 hover:bg-barber-gold/10"
      }
      disabled={loading}
      onClick={handleToggle}
      title={isPublic ? "Visibile a tutti i giocatori (sessioni in calendario e prenotabili). Clicca per rendere privata." : "Privata: i player non vedono le sessioni né possono prenotarsi. Clicca per rendere pubblica."}
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
