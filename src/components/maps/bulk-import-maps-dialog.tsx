"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { bulkImportMaps } from "@/app/campaigns/bulk-map-actions";
import { listMapsForParentPickerAction, type MapParentOption } from "@/app/campaigns/map-actions";
import { MAP_IMPORT_TYPES, parseMapImport, validateMapImportHierarchy } from "@/lib/maps/bulk-import";

const example = JSON.stringify([
  { key: "mondo", name: "Nuovo mondo", map_type: "world", image_url: "https://example.com/mondo.jpg", visibility: "secret" },
  { key: "continente", name: "Continente del nord", map_type: "continent", parent_key: "mondo", image_url: "https://example.com/continente.jpg", description: "Terre del nord" },
], null, 2);

export function BulkImportMapsDialog({ campaignId, campaignType }: { campaignId: string; campaignType?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [existing, setExisting] = useState<MapParentOption[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const preview = useMemo(() => {
    if (!source.trim()) return { rows: [], error: "" };
    try {
      if (source.length > 1_000_000) throw new Error("File troppo grande: massimo 1 MB.");
      const rows = parseMapImport(JSON.parse(source));
      if (existing) validateMapImportHierarchy(rows, existing, campaignType === "long");
      return { rows, error: "" };
    } catch (error) { return { rows: [], error: error instanceof SyntaxError ? "JSON non valido: controlla virgole e parentesi." : (error as Error).message }; }
  }, [source, existing, campaignType]);
  async function changeOpen(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (next) {
      setExisting(null); setMessage("");
      try {
        const result = await listMapsForParentPickerAction(campaignId);
        if (result.success) setExisting(result.data); else setMessage(result.message);
      } catch { setMessage("Impossibile caricare le mappe. Chiudi e riapri per riprovare."); }
    }
  }
  function changeSource(value: string) { setSource(value); setDone(false); setMessage(""); }
  async function submit() {
    if (busy || done || !existing || !preview.rows.length || preview.error) return;
    setBusy(true); setMessage("");
    try {
      const result = await bulkImportMaps(campaignId, preview.rows);
      setMessage(result.message);
      if (result.success) { setDone(true); router.refresh(); }
    } catch { setMessage("Risposta non ricevuta. Controlla l’Atlante prima di riprovare, per evitare duplicati."); setDone(true); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button variant="outline" className="border-barber-gold/40 text-barber-gold"><FileUp className="mr-2 h-4 w-4" />Importa mappe</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto border-barber-gold/30 bg-barber-dark text-barber-paper sm:max-w-3xl">
      <DialogHeader><DialogTitle>Importa mappe nell’Atlante</DialogTitle><DialogDescription>Carica o incolla un elenco JSON, fino a 100 mappe con immagini tramite URL HTTPS. Le mappe sono segrete salvo diversa indicazione.</DialogDescription></DialogHeader>
      <details className="text-sm"><summary className="cursor-pointer text-barber-gold">Formato ed esempio</summary>
        <p className="my-2">Campi obbligatori: key (univoca nel file), name, map_type, image_url. Tipi: world, continent, city, dungeon, district, building. Facoltativi: description, visibility (secret o public), parent_key per una mappa del file oppure parent_map_id per una già presente.</p>
        <p className="my-2">Nelle campagne lunghe: un solo Mondo → Continenti → Città. Nelle altre campagne ometti i genitori. Sostituisci gli URL di esempio con link alle tue immagini. Ogni import crea nuove mappe.</p>
        <pre className="overflow-x-auto rounded border border-barber-gold/20 p-3 text-xs">{example}</pre>
        {!!existing?.length && <div className="mt-3 max-h-36 overflow-auto"><p>Mappe esistenti — ID da usare in parent_map_id:</p>{existing.map(m => <p key={m.id} className="my-1 break-all text-xs">{m.name} ({m.map_type}): <code>{m.id}</code></p>)}</div>}
      </details>
      <label className="text-sm" htmlFor="maps-import-file">File JSON</label>
      <input id="maps-import-file" type="file" accept=".json,application/json" disabled={busy || done} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        if (file.size > 1_000_000) { setMessage("File troppo grande: massimo 1 MB."); return; }
        try { changeSource(await file.text()); } catch { setMessage("Impossibile leggere il file."); }
      }} />
      <label className="text-sm" htmlFor="maps-import-json">Elenco mappe</label>
      <Textarea id="maps-import-json" className="min-h-48 font-mono text-xs" placeholder="Incolla qui il JSON…" value={source} disabled={busy || done} onChange={e => changeSource(e.target.value)} />
      {preview.error && <p role="alert" className="text-sm text-red-400">{preview.error}</p>}
      {!!preview.rows.length && <div className="max-h-48 overflow-auto rounded border border-barber-gold/20"><table className="w-full text-left text-sm"><caption className="p-2 text-left">Anteprima · {preview.rows.length} mappe</caption><thead><tr><th className="p-2">Nome</th><th className="p-2">Tipo</th><th className="p-2">Visibilità</th></tr></thead><tbody>{preview.rows.map(r => <tr key={r.key} className="border-t border-barber-gold/10"><td className="break-words p-2">{r.name}</td><td className="p-2">{MAP_IMPORT_TYPES[r.map_type]}</td><td className="p-2">{r.visibility === "secret" ? "Segreta" : "Pubblica"}</td></tr>)}</tbody></table></div>}
      {message && <p role="status" className="text-sm">{message}</p>}
      <div className="flex flex-wrap justify-end gap-2">{done && <Button variant="outline" onClick={() => { changeSource(""); void changeOpen(true); }}>Nuovo import</Button>}<Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Chiudi</Button><Button disabled={busy || done || !existing || !preview.rows.length || !!preview.error} onClick={submit}>{busy ? "Importazione…" : done ? "Importazione conclusa" : `Importa ${preview.rows.length || ""} mappe`}</Button></div>
    </DialogContent>
  </Dialog>;
}
