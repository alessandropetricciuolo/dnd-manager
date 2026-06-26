"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteSceneDocumentAction,
  duplicateSceneDocumentAction,
} from "@/app/campaigns/scene-document-actions";
import { Button } from "@/components/ui/button";

type Props = {
  campaignId: string;
  sceneId: string;
  sceneName: string;
};

export function SceneEditorListActions({ campaignId, sceneId, sceneName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDuplicate() {
    startTransition(async () => {
      const res = await duplicateSceneDocumentAction(campaignId, sceneId);
      if (!res.success) {
        toast.error(res.error ?? "Duplicazione fallita.");
        return;
      }
      toast.success("Scena duplicata. Salva dall'editor per pubblicarla in Esplorazione e FoW.");
      router.push(`/campaigns/${campaignId}/gm-only/scene-editor/${res.data!.sceneDocumentId}`);
    });
  }

  function handleDelete() {
    const label = sceneName.trim() || "Senza nome";
    if (
      !window.confirm(
        `Eliminare la scena «${label}»?\nVerranno rimosse anche le mappe FoW collegate (se già salvate).`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteSceneDocumentAction(campaignId, sceneId);
      if (!res.success) {
        toast.error(res.error ?? "Eliminazione fallita.");
        return;
      }
      toast.success("Scena eliminata.");
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <Button size="sm" variant="outline" className="border-barber-gold/40" asChild>
        <Link href={`/campaigns/${campaignId}/gm-only/scene-editor/${sceneId}`}>
          <Pencil className="mr-1 h-4 w-4" />
          Modifica
        </Link>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-barber-gold/40"
        disabled={pending}
        onClick={handleDuplicate}
      >
        <Copy className="mr-1 h-4 w-4" />
        {pending ? "Copia..." : "Duplica"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-red-500/40 text-red-300 hover:bg-red-950/40"
        disabled={pending}
        onClick={handleDelete}
      >
        <Trash2 className="mr-1 h-4 w-4" />
        Elimina
      </Button>
    </div>
  );
}
