import { redirect } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { listImageBenchmarkRunsAction } from "./actions";
import { ImageBenchmarkClient } from "./image-benchmark-client";

export const dynamic = "force-dynamic";

export default async function AdminImageBenchmarkPage() {
  const listed = await listImageBenchmarkRunsAction();
  if (!listed.success) {
    redirect("/dashboard");
  }

  return (
    <div className="p-4 py-8 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-barber-paper">
            <ImageIcon className="h-6 w-6 text-barber-gold" />
            Benchmark modelli immagine
          </h1>
          <p className="text-sm text-barber-paper/70">
            Confronta modelli OpenRouter con gli stessi prompt. Ogni generazione usa la campagna{" "}
            <strong className="text-barber-gold">Le Cronache di Eldaria</strong>: paletti Architetto, memoria IA wiki/PG e stile visivo — come in produzione wiki.
            Solo admin. Generazione server-side via <code className="text-barber-gold">OPENROUTER_API_KEY</code>.
          </p>
        </header>
        <ImageBenchmarkClient runs={listed.runs} />
      </div>
    </div>
  );
}
