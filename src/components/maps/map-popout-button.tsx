"use client";

import { ExternalLink } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POPOUT_FEATURES =
  "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no";

type MapPopoutButtonProps = {
  imageUrl: string;
  title: string;
  /** Se fornito, apre questa URL (pagina con mappa + pin) invece della sola immagine. */
  viewUrl?: string;
  /** Variante compatta (icona) per card dense; altrimenti bottone testuale su desktop. */
  compact?: boolean;
  className?: string;
} & Pick<ButtonProps, "variant" | "size">;

export function MapPopoutButton({
  imageUrl,
  title,
  viewUrl,
  compact = false,
  className,
  variant = "outline",
  size = "sm",
}: MapPopoutButtonProps) {
  function handlePopout() {
    const url = viewUrl ?? imageUrl;
    window.open(url, "MapWindow", POPOUT_FEATURES);
  }

  if (compact) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(
          "inline-flex shrink-0 border-barber-gold/40 text-barber-gold hover:bg-barber-gold/15 hover:text-barber-gold",
          className
        )}
        onClick={handlePopout}
        title="Apri l’immagine in una finestra separata (es. secondo schermo)"
      >
        <ExternalLink className="h-4 w-4" />
        <span className="sr-only">Apri in nuova finestra</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "hidden shrink-0 gap-2 border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold md:inline-flex",
        className
      )}
      onClick={handlePopout}
      title="Apri la mappa in una finestra separata (es. secondo schermo)"
    >
      <ExternalLink className="h-4 w-4" />
      Apri in Nuova Finestra
    </Button>
  );
}
