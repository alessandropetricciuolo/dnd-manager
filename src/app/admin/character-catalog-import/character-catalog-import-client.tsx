"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Library } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { importCharacterCatalogJsonAction } from "./actions";

type Props = {
  exampleJson: string;
};

export function CharacterCatalogImportClient({ exampleJson }: Props) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [lastLog, setLastLog] = useState<string | null>(null);

  function runImport() {
    startTransition(async () => {
      setLastLog(null);
      const res = await importCharacterCatalogJsonAction(text);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const { result } = res;
      const lines: string[] = [
        `Elaborati: ${result.total}`,
        `Importati con successo: ${result.ok}`,
      ];
      if (result.successSlugs.length) {
        lines.push(`Slug OK: ${result.successSlugs.join(", ")}`);
      }
      if (result.errors.length) {
        lines.push("Errori:");
        lines.push(...result.errors.map((e) => `  • ${e}`));
      }
      const summary = lines.join("\n");
      setLastLog(summary);
      if (result.ok > 0) {
        toast.success(
          result.ok === result.total
            ? "Catalogo aggiornato."
            : `Completato con avvisi: ${result.ok}/${result.total} importati.`
        );
      } else {
        toast.error("Nessun PG importato. Controlla il log sotto.");
      }
    });
  }

  function copyExample() {
    void navigator.clipboard.writeText(exampleJson.trim());
    toast.info("Esempio copiato negli appunti.");
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4 py-10 md:p-8">
      <header className="space-y-2">
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-barber-paper sm:text-2xl">
          <Library className="h-7 w-7 shrink-0 text-barber-gold" />
          Import catalogo personaggi
        </h1>
        <p className="max-w-2xl text-sm text-barber-paper/70">
          Incolla un JSON nel formato sotto (stesso formato di{" "}
          <span className="font-mono text-barber-gold/90">npm run catalog:import</span>). Puoi usare{" "}
          <span className="font-mono text-barber-gold/85">image.url</span> e{" "}
          <span className="font-mono text-barber-gold/85">sheet.url</span> in https (anche link Drive{" "}
          <span className="font-mono text-barber-paper/55">drive.google.com/file/d/…/view</span>),{" "}
          <span className="font-mono text-barber-gold/85">base64</span>, oppure mettere un URL https anche nel campo{" "}
          <span className="font-mono">file</span>. I percorsi file solo disco sono solo per lo script CLI.
        </p>
        <p className="text-xs text-amber-200/80">
          Limite payload server action: 4 MB (vedi <span className="font-mono">next.config.js</span>). Per JSON molto grandi usa lo script CLI.
        </p>
      </header>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-barber-paper">JSON da importare</Label>
          <Button type="button" variant="outline" size="sm" onClick={copyExample} className="border-barber-gold/40 text-barber-gold">
            Copia esempio
          </Button>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='{"libraryKey": "barber_and_dragons", "entries": [ ... ]}'
          className="min-h-[220px] font-mono text-sm bg-barber-dark/90 border-barber-gold/30 text-barber-paper"
          spellCheck={false}
        />
        <Button
          type="button"
          onClick={runImport}
          disabled={pending || !text.trim()}
          className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Import in corso…
            </>
          ) : (
            "Esegui import"
          )}
        </Button>
      </section>

      {lastLog && (
        <section className="space-y-2 rounded-xl border border-barber-gold/25 bg-black/25 p-4">
          <h2 className="text-sm font-semibold text-barber-gold">Ultimo risultato</h2>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-barber-paper/85">{lastLog}</pre>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-barber-gold">JSON di esempio</h2>
        <pre className="max-h-[min(480px,55vh)] overflow-auto rounded-lg border border-barber-gold/25 bg-black/30 p-4 font-mono text-xs text-barber-paper/90">
          {exampleJson.trim()}
        </pre>
      </section>
    </div>
  );
}
