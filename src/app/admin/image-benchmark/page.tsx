import { redirect } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { SITE_IMAGE_MODEL } from "@/lib/ai/openrouter-image-preview";
import { listImageBenchmarkRunsAction } from "./actions";
import { ImageBenchmarkClient } from "./image-benchmark-client";
import { ADMIN_PAGE_SHELL } from "@/lib/layout/shell-classes";

export const dynamic = "force-dynamic";

export default async function AdminImageBenchmarkPage() {
  const listed = await listImageBenchmarkRunsAction();
  if (!listed.success) {
    redirect("/dashboard");
  }

  return (
    <div className={ADMIN_PAGE_SHELL}>
      <div className="w-full space-y-6">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-barber-paper">
            <ImageIcon className="h-6 w-6 text-barber-gold" />
            Benchmark modelli immagine
          </h1>
          <p className="text-sm text-barber-paper/70">
            Confronta prompt con il modello di produzione{" "}
            <code className="text-barber-gold">{SITE_IMAGE_MODEL}</code>. Ogni generazione usa la campagna{" "}
            <strong className="text-barber-gold">Le Cronache di Eldaria</strong>: paletti Architetto, memoria IA wiki/PG e stile visivo — come in produzione wiki.
            Solo admin. Generazione server-side via <code className="text-barber-gold">OPENROUTER_API_KEY</code>.
          </p>
        </header>
        <ImageBenchmarkClient runs={listed.runs} />
      </div>
    </div>
  );
}
