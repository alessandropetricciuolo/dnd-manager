import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SectionHeader — intestazione di sezione standardizzata.
 *
 * Obiettivo: uniformare titoli e descrizioni delle sezioni dashboard/profilo/wiki/admin.
 * Usa font-serif per il titolo (firma tipografica brand "fantasy-pulito") e
 * un'eyebrow opzionale (etichetta uppercase tracked) per dare gerarchia
 * senza appesantire la pagina.
 */

type SectionHeaderProps = {
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
  action?: React.ReactNode;
  /** Livello tipografico: 1 = pagina (più grande), 2 = sezione, 3 = sottosezione. */
  level?: 1 | 2 | 3;
  /** Allineamento centrato (es. landing/hall of fame). Default: start. */
  align?: "start" | "center";
  /** Icona opzionale a sinistra del titolo. */
  icon?: React.ReactNode;
  className?: string;
};

export function SectionHeader({
  title,
  description,
  eyebrow,
  action,
  level = 2,
  align = "start",
  icon,
  className,
}: SectionHeaderProps) {
  const Tag = level === 1 ? "h1" : level === 3 ? "h3" : "h2";
  const isCenter = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        isCenter
          ? "items-center text-center"
          : "sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className={cn("min-w-0", isCenter && "max-w-2xl")}>
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-barber-gold/70">
            {eyebrow}
          </p>
        ) : null}
        <Tag
          className={cn(
            "font-serif text-barber-paper",
            level === 1 && "text-2xl font-bold leading-tight sm:text-3xl",
            level === 2 && "text-xl font-semibold leading-tight sm:text-2xl",
            level === 3 && "text-base font-semibold sm:text-lg",
            eyebrow && "mt-1",
            icon && "flex items-center gap-2"
          )}
        >
          {icon ? <span className="shrink-0 text-barber-gold">{icon}</span> : null}
          <span className="min-w-0 break-words">{title}</span>
        </Tag>
        {description ? (
          <p
            className={cn(
              "mt-1.5 text-sm text-barber-paper/70",
              isCenter && "mx-auto"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className={cn("shrink-0", isCenter ? "" : "sm:ml-4")}>{action}</div>
      ) : null}
    </div>
  );
}
