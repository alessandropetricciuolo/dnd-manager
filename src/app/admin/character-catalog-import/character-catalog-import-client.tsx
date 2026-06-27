"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Library } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { importCharacterCatalogJsonAction } from "./actions";
import { ADMIN_PAGE_SHELL } from "@/lib/layout/shell-classes";

type Props = {
  exampleJson: string;
};

export function CharacterCatalogImportClient({ exampleJson }: Props) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [lastLog, setLastLog] = useState<string | null>(null);
  const [jsonSyntaxHelp, setJsonSyntaxHelp] = useState<string | null>(null);

  function runImport() {
    startTransition(async () => {
      setLastLog(null);
      setJsonSyntaxHelp(null);
      const res = await importCharacterCatalogJsonAction(text);
      if (!res.success) {
        toast.error(res.error);
        if (res.jsonParseDetail) {
          setJsonSyntaxHelp(res.jsonParseDetail);
        }
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
    <div className={`${ADMIN_PAGE_SHELL} space-y-8`}>
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
          onChange={(e) => {
            setText(e.target.value);
            if (jsonSyntaxHelp) setJsonSyntaxHelp(null);
          }}
          placeholder='{"libraryKey": "barber_and_dragons", "entries": [ ... ]}'
          className="min-h-[220px] font-mono text-sm bg-barber-dark/90 border-barber-gold/30 text-barber-paper"
          spellCheck={false}
        />
        {jsonSyntaxHelp && (
          <div
            role="alert"
            className="space-y-3 rounded-lg border border-red-500/35 bg-red-950/30 p-4 text-sm text-barber-paper/95"
          >
            <p className="font-semibold text-red-200/95">Errore di sintassi JSON</p>
            <p className="text-barber-paper/80">
              Il parser non riesce a leggere il JSON. Sotto trovi il messaggio tecnico restituito dal
              motore (spesso indica la riga o il carattere in cui qualcosa non torna).
            </p>
            <pre className="overflow-x-auto rounded-md border border-red-500/20 bg-black/40 p-3 font-mono text-xs text-red-100/90">
              {jsonSyntaxHelp}
            </pre>
            <div className="space-y-2 text-barber-paper/75">
              <p className="font-medium text-barber-paper/90">Controlli frequenti</p>
              <ul className="list-inside list-disc space-y-1.5 text-xs sm:text-sm">
                <li>
                  Ogni stringa va tra <span className="font-mono text-barber-gold/90">doppi virgoletti</span>{" "}
                  <span className="font-mono">{`"testo"`}</span>, non apici singoli. Gli URL sono stringhe:{" "}
                  <span className="font-mono whitespace-nowrap">{`"url": "https://…"`}</span>, mai{" "}
                  <span className="font-mono text-red-200/80">{`"url": https://…`}</span>.
                </li>
                <li>
                  Nessuna virgola dopo l&apos;ultimo elemento di un oggetto o array (es. non mettere{" "}
                  <span className="font-mono">,</span> prima di <span className="font-mono">{"}"}</span> o{" "}
                  <span className="font-mono">{"]"}</span>).
                </li>
                <li>
                  Parentesi <span className="font-mono">{"{ } [ ]"}</span> devono essere bilanciate; ogni campo
                  oggetto è <span className="font-mono">{`"chiave": valore`}</span> separato da virgola.
                </li>
                <li>
                  Caratteri speciali dentro una stringa vanno escapati con <span className="font-mono">\</span>{" "}
                  (es. <span className="font-mono">{`\\"`}</span> per un virgoletto nel testo).
                </li>
                <li>
                  Per verificare prima di importare: editor con evidenziazione JSON, oppure incolla in un
                  validatore online e correggi dove segnala l&apos;errore.
                </li>
              </ul>
            </div>
          </div>
        )}
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
