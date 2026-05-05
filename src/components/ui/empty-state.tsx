import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * EmptyState — placeholder visivo coerente quando una sezione non ha contenuti.
 *
 * Sostituisce i pattern ad-hoc con `rounded-xl border bg-barber-dark/* px-6 py-10 text-center`
 * sparsi nel progetto. Bordo dashed per segnalare carattere "vuoto/in attesa",
 * tipografia serif sul titolo per coerenza brand.
 */

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Più compatto per piccoli pannelli (es. card, sezioni in tab). */
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-barber-gold/30 bg-barber-dark/50 text-center",
        compact ? "px-4 py-6" : "px-6 py-10",
        className
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            "mb-3 text-barber-gold/70",
            compact ? "h-7 w-7" : "h-10 w-10"
          )}
          aria-hidden
        />
      ) : null}
      <h3
        className={cn(
          "font-serif font-semibold text-barber-paper",
          compact ? "text-base" : "text-lg"
        )}
      >
        {title}
      </h3>
      {description ? (
        <p
          className={cn(
            "mt-1 text-barber-paper/65",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
