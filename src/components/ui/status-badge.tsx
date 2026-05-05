import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * StatusBadge — pillola di stato semantica condivisa.
 *
 * Tone:
 * - success: azione completata / presenza confermata / approvato
 * - warning: in attesa / da confermare
 * - danger: rifiutato / fallito / errore
 * - info:    informativo / programmato (brand gold)
 * - accent:  azione brand (rosso barber, usato di rado)
 * - muted:   stato neutro / disabilitato
 *
 * Le palette success/warning/danger usano colori UI convenzionali
 * (verde/ambra/rosso) perché sono pattern universalmente leggibili
 * per la semantica dello stato. Brand identity (gold/red barber) resta
 * riservata a info/accent.
 */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-none whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        danger: "border-red-500/35 bg-red-500/10 text-red-300",
        info: "border-barber-gold/35 bg-barber-gold/10 text-barber-gold",
        accent: "border-barber-red/45 bg-barber-red/15 text-barber-paper",
        muted: "border-barber-paper/15 bg-barber-paper/5 text-barber-paper/65",
      },
      size: {
        sm: "text-[10px] px-1.5 py-0.5",
        md: "text-xs px-2 py-0.5",
      },
    },
    defaultVariants: {
      tone: "info",
      size: "md",
    },
  }
);

export interface StatusBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof statusBadgeVariants> {
  icon?: React.ReactNode;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, tone, size, icon, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(statusBadgeVariants({ tone, size }), className)}
        {...props}
      >
        {icon ? <span className="shrink-0 [&>svg]:h-3 [&>svg]:w-3">{icon}</span> : null}
        {children}
      </span>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { statusBadgeVariants };
