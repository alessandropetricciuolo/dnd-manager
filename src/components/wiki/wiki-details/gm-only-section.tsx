import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type GmOnlySectionProps = {
  isGmOrAdmin: boolean;
  children: React.ReactNode;
  className?: string;
};

/** Wraps GM-only content with a visible "GM ONLY" badge and colored border so the Master sees at a glance what is secret. */
export function GmOnlySection({ isGmOrAdmin, children, className }: GmOnlySectionProps) {
  if (!isGmOrAdmin) return <>{children}</>;
  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-amber-600/70 bg-amber-950/20 p-1",
        className
      )}
    >
      <Badge
        variant="outline"
        className="absolute -top-2.5 left-3 border-amber-500/80 bg-amber-950/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400"
      >
        GM ONLY
      </Badge>
      <div className="pt-2">{children}</div>
    </div>
  );
}
