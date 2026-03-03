import Image from "next/image";
import { EntityContent } from "../entity-content";
import { Package } from "lucide-react";

const PLACEHOLDER = "https://placehold.co/300x300/1e293b/10b981/png?text=Oggetto";

type ItemViewProps = {
  name: string;
  body: string;
  imageUrl: string | null;
};

export function ItemView({ name, body, imageUrl }: ItemViewProps) {
  return (
    <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
      <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-xl border border-emerald-700/40 bg-slate-900 md:h-64 md:w-64">
        <Image
          src={imageUrl ?? PLACEHOLDER}
          alt={name}
          fill
          className="object-cover"
          sizes="256px"
          unoptimized={!!imageUrl}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-emerald-200">
          <Package className="h-5 w-5" />
          Descrizione
        </h2>
        {body ? (
          <EntityContent content={body} />
        ) : (
          <p className="text-slate-400 italic">Nessuna descrizione.</p>
        )}
      </div>
    </div>
  );
}
