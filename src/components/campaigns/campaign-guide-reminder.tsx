"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

export function CampaignGuideReminder({ href }: { href: string }) {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100%-2rem)] border-barber-gold/35 bg-guild-void text-barber-paper">
        <DialogTitle className="flex items-center gap-2 font-serif text-2xl text-barber-gold">
          <BookOpen aria-hidden className="h-5 w-5" />
          Inizia qui
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-barber-paper/85">
          Nella Guida del Giocatore trovi l’introduzione a Eldaria, la Wiki e il regolamento.
          Dopo la lettura, conferma in fondo alla guida.
        </DialogDescription>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Più tardi
          </Button>
          <Button asChild className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90">
            <Link href={href} onClick={() => setOpen(false)}>Apri «Inizia qui»</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
