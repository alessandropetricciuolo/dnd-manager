"use client";

import { useId, useMemo, useState } from "react";
import { Eye, EyeOff, Grid3X3, Layers3, MonitorPlay, RotateCcw, Save, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addWorkspaceOverlay, createLocalWorkspaceScene, discardWorkspaceRevision, editWorkspace, materializeWorkspaceFow, publishWorkspace, removeWorkspaceOverlay, rollbackWorkspacePublication, setWorkspaceLifecycle, toggleWorkspaceRegion, updatePublishedFow, type TacticalWorkspaceState, type WorkspaceOverlayKind } from "@/lib/scene-runtime/workspace";
import type { TacticalScene } from "@/lib/scene-runtime/types";
import { createTacticalSceneAction, publishTacticalSceneAction, rollbackTacticalScenePublicationAction, saveTacticalSceneRevisionAction, updateTacticalFowRuntimeAction } from "@/app/campaigns/tactical-scene-actions";

type Props = { campaignId: string; campaignName: string; initialScene?: TacticalScene; report: { severity: string; code: string; message: string }[]; persistedSceneId?: string; persistedRevisionId?: string };

const pointString = (points: { x: number; y: number }[]) => points.map((point) => `${point.x * 100}% ${point.y * 100}%`).join(",");

export function Stage({ scene, projection }: { scene: TacticalScene; projection: boolean }) {
  const maskId = useId().replace(/:/g, "");
  const floor = scene.floors[0];
  if (!floor) return <div className="flex h-full items-center justify-center text-sm text-barber-paper/60">Nessun piano disponibile.</div>;
  const image = floor.asset.storageKey.startsWith("http") || floor.asset.storageKey.startsWith("/") ? floor.asset.storageKey : null;
  const overlays = projection ? (scene.overlay.published ?? []) : scene.overlay.draft;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-barber-gold/25 bg-[#171313] shadow-2xl" aria-label={projection ? "Proiezione locale pubblicata" : "Anteprima scena in bozza"}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,#493729,#201917_62%,#110f0f)]" style={image ? { backgroundImage: `linear-gradient(#120e0e55,#120e0e55),url(${image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
      {floor.grid?.visible ? <div className="absolute inset-0 bg-[linear-gradient(to_right,#d9b36b33_1px,transparent_1px),linear-gradient(to_bottom,#d9b36b33_1px,transparent_1px)]" style={{ backgroundSize: `${Math.max(12, floor.grid.cellSize / floor.width * 100)}% ${Math.max(12, floor.grid.cellSize / floor.height * 100)}%` }} /> : null}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Nebbia di guerra"><defs><mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1" height="1"><rect width="1" height="1" fill="white" />{scene.fow.regions.filter((region) => region.revealed).map((region) => <polygon key={region.id} points={region.polygon.map((point) => `${point.x},${point.y}`).join(" ")} fill="black" />)}</mask></defs><rect width="1" height="1" fill="#050505" fillOpacity=".86" mask={`url(#${maskId})`} /></svg>
      {overlays.map((item) => item.type === "area" ? <div key={item.id} className="absolute border border-amber-300/70" style={{ inset: 0, clipPath: `polygon(${pointString(item.polygon)})`, background: item.color, opacity: item.opacity }} /> : item.type === "text" ? <span key={item.id} className="absolute font-semibold drop-shadow-md" style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, color: item.color ?? "#f5d486", fontSize: `${Math.max(10, (item.size ?? 18) / 2)}px` }}>{item.text}</span> : item.type === "marker" ? <span key={item.id} className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-amber-200 bg-amber-600/80 text-xs font-bold text-black" style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%` }}>{item.label ?? "!"}</span> : item.type === "circle" || item.type === "measure" ? <span key={item.id} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-300/90" style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.radius * 200}%`, aspectRatio: "1" }} /> : item.type === "timer" ? <span key={item.id} className="absolute flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-xs text-amber-100" style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%` }}><Timer className="h-3 w-3" />{item.label ?? "Timer"}: {item.seconds}s</span> : null)}
      <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-200">{projection ? "Proiezione locale" : "Bozza locale"}</span>
    </div>
  );
}

export function SceneWorkspaceClient({ campaignId, campaignName, initialScene, report, persistedSceneId, persistedRevisionId }: Props) {
  const [state, setState] = useState<TacticalWorkspaceState>(() => initialScene ? { draft: initialScene, published: null, history: [], discardedRevisionNos: [] } : createLocalWorkspaceScene(campaignId));
  const [projection, setProjection] = useState(false);
  const [status, setStatus] = useState("Modifiche locali temporanee");
  const [overlayLabel, setOverlayLabel] = useState("");
  const [savedSceneId, setSavedSceneId] = useState(persistedSceneId);
  const [savedRevisionId, setSavedRevisionId] = useState(persistedRevisionId);
  const [savedRevisionNo, setSavedRevisionNo] = useState(initialScene?.revisionNo);
  const [savedPublicationId, setSavedPublicationId] = useState<string>();
  const [gridVisible, setGridVisible] = useState(Boolean(state.draft.floors[0]?.grid?.visible));
  const floor = state.draft.floors[0];
  const regions = useMemo(() => state.draft.fow.regions.filter((region) => region.floorId === floor?.id), [state.draft.fow.regions, floor?.id]);

  const updateGrid = () => {
    if (!floor) return;
    const next = { ...state.draft, floors: state.draft.floors.map((candidate) => candidate.id === floor.id ? { ...candidate, grid: candidate.grid ? { ...candidate.grid, visible: !gridVisible } : undefined } : candidate) };
    try { setState(editWorkspace(state, next)); setGridVisible(!gridVisible); } catch { setStatus("Modifica non valida"); }
  };
  const run = (fn: () => TacticalWorkspaceState, message: string) => { try { setState(fn()); setStatus(message); } catch (error) { setStatus(error instanceof Error ? error.message : "Modifica non valida"); } };
  const persistDraft = async () => {
    const raw = JSON.stringify(state.draft);
    const result = savedSceneId && savedRevisionId && savedRevisionNo !== undefined
      ? await saveTacticalSceneRevisionAction(savedSceneId, savedRevisionNo, raw)
      : await createTacticalSceneAction(campaignId, raw);
    if (!result.success) { setStatus(result.error); return false; }
    setSavedSceneId("sceneId" in result.data ? result.data.sceneId : savedSceneId);
    setSavedRevisionId(result.data.revisionId);
    setSavedRevisionNo(result.data.revisionNo);
    setState((current) => "document" in result.data ? { ...current, draft: result.data.document } : current);
    setStatus("Bozza salvata su R6.4");
    return true;
  };
  const publish = async () => {
    try {
      if (!savedSceneId || !savedRevisionId || savedRevisionNo === undefined || state.draft.revisionNo !== savedRevisionNo) { setStatus("Salva prima la bozza R6.4: la pubblicazione richiede la revisione persistita esatta."); return; }
      const result = await publishTacticalSceneAction(savedSceneId, savedRevisionId, savedRevisionNo);
      if (!result.success) { setStatus(result.error); return; }
      const next = publishWorkspace(state);
      const published = result.data.document;
      setState({ ...next, draft: published, published });
      setSavedPublicationId(result.data.publicationId);
      setStatus("Pubblicata su R6.4 e pronta per la proiezione");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Pubblicazione non riuscita"); }
  };
  const toggleRegion = async (regionId: string, revealed: boolean) => {
    if (!state.published || !savedSceneId || !savedPublicationId) { run(() => toggleWorkspaceRegion(state, regionId, revealed), revealed ? "Regione rivelata nella bozza" : "Regione nascosta nella bozza"); return; }
    const next = updatePublishedFow(state, regionId, revealed);
    const result = await updateTacticalFowRuntimeAction(savedSceneId, savedPublicationId, savedRevisionNo ?? state.published.revisionNo, JSON.stringify(next.published));
    if (result.success) { setState(next); setStatus(revealed ? "Regione rivelata nella proiezione" : "Regione nascosta nella proiezione"); } else setStatus(result.error);
  };
  const rollbackPublished = async () => {
    if (savedSceneId) { const result = await rollbackTacticalScenePublicationAction(savedSceneId); if (!result.success) { setStatus(result.error); return; } }
    setSavedPublicationId(undefined);
    setProjection(false); run(() => rollbackWorkspacePublication(state), "Pubblicazione ritirata");
  };

  const overlayKinds: { type: WorkspaceOverlayKind; label: string }[] = [{ type: "text", label: "Testo" }, { type: "marker", label: "Marker" }, { type: "area", label: "Area" }, { type: "circle", label: "Cerchio" }, { type: "measure", label: "Misura" }, { type: "timer", label: "Timer" }];
  return <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-4 p-3 text-barber-paper sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-barber-gold">Workspace tattico · R6.3</p><h1 className="mt-1 font-serif text-2xl text-barber-paper">{state.draft.name}</h1><p className="mt-1 text-sm text-barber-paper/55">{campaignName} · solo GM/Admin · revisione locale {state.draft.revisionNo}</p></div>
      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-100">{status}</span>
    </div>
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
      <section className="flex min-h-[60vh] flex-col rounded-2xl border border-barber-gold/20 bg-black/20 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm text-barber-paper/75"><Layers3 className="h-4 w-4 text-barber-gold" />{floor?.label ?? "Piano principale"}</div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={updateGrid}><Grid3X3 className="mr-1.5 h-3.5 w-3.5" />{gridVisible ? "Nascondi griglia" : "Mostra griglia"}</Button><Button size="sm" variant={projection ? "default" : "outline"} onClick={() => setProjection(!projection)} disabled={!state.published}><MonitorPlay className="mr-1.5 h-3.5 w-3.5" />{projection ? "Torna alla bozza" : "Proietta"}</Button></div></div>
        <div className="flex flex-1 items-center justify-center"><Stage scene={projection && state.published ? state.published : state.draft} projection={projection} /></div>
        <p className="mt-3 text-xs text-barber-paper/45">{projection ? "Questa superficie mostra esclusivamente l’istantanea pubblicata. Il draft GM non viene esposto." : "Bozza locale non persistente: nessuna modifica viene scritta nel database."}</p>
      </section>
      <aside className="space-y-3">
        <section className="rounded-2xl border border-barber-gold/20 bg-black/20 p-4"><h2 className="font-serif text-lg">Controllo scena</h2><div className="mt-3 grid grid-cols-2 gap-2"><Button size="sm" variant="outline" onClick={() => run(() => setWorkspaceLifecycle(state, "ready"), "Scena pronta localmente")} disabled={state.draft.lifecycle !== "draft"}>Pronta</Button><Button size="sm" variant="outline" onClick={() => void persistDraft()}><Save className="mr-1.5 h-3.5 w-3.5" />Salva bozza</Button><Button size="sm" onClick={() => void publish()} disabled={state.draft.lifecycle !== "ready" && state.draft.lifecycle !== "live"}><Save className="mr-1.5 h-3.5 w-3.5" />Pubblica</Button><Button size="sm" variant="outline" onClick={() => { setProjection(false); run(() => discardWorkspaceRevision(state), "Ultima revisione locale scartata"); }}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Scarta</Button><Button size="sm" variant="outline" onClick={() => void rollbackPublished()} disabled={!state.published}>Rollback</Button></div><p className="mt-3 text-[11px] leading-relaxed text-barber-paper/60">La bozza e la pubblicazione sono revisioni separate. Salva prima di pubblicare; il runtime FoW viene aggiornato senza mutare la revisione.</p></section>
        <section className="rounded-2xl border border-barber-gold/20 bg-black/20 p-4"><h2 className="font-serif text-lg">FoW</h2><p className="mt-1 text-xs text-barber-paper/50">Origine: {state.draft.fow.regions.some((r) => r.origin === "imported") ? "Foundry importato" : state.draft.fow.regions.some((r) => r.origin === "derived") ? "Derivato" : "Manuale"}</p><div className="mt-3 space-y-2">{regions.length ? regions.map((region) => <div key={region.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-2 py-1.5 text-xs"><span>Regione {region.id.slice(0, 8)}</span><Button size="sm" variant="ghost" onClick={() => void toggleRegion(region.id, !region.revealed)} aria-label={region.revealed ? "Nascondi regione" : "Rivela regione"}>{region.revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div>) : <p className="text-xs text-barber-paper/45">Nessuna regione disponibile. Puoi importarla nel percorso legacy e rivederla qui in sola lettura.</p>}</div><Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => run(() => materializeWorkspaceFow(state), "FoW materializzata localmente")} disabled={Boolean(state.published)}>Applica reveal locali</Button></section>
        <section className="rounded-2xl border border-barber-gold/20 bg-black/20 p-4"><h2 className="font-serif text-lg">Overlay</h2><p className="mt-1 text-xs leading-relaxed text-barber-paper/50">Aggiungi elementi alla bozza; la pubblicazione ne cattura un’istantanea indipendente.</p><input value={overlayLabel} onChange={(event) => setOverlayLabel(event.target.value)} placeholder="Etichetta opzionale" className="mt-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-barber-paper outline-none focus:border-barber-gold/60" aria-label="Etichetta overlay" /><div className="mt-2 grid grid-cols-2 gap-1.5">{overlayKinds.map(({ type, label }) => <Button key={type} size="sm" variant="outline" onClick={() => run(() => addWorkspaceOverlay(state, type, overlayLabel), `${label} aggiunto alla bozza`)}>{label}</Button>)}</div><div className="mt-3 space-y-1">{state.draft.overlay.draft.map((item) => <div key={item.id} className="flex items-center justify-between rounded border border-white/10 px-2 py-1 text-xs"><span>{item.type}{"text" in item ? ` · ${item.text}` : "label" in item ? ` · ${item.label ?? ""}` : ""}</span><Button size="sm" variant="ghost" className="h-6 px-2 text-barber-paper/60" onClick={() => run(() => removeWorkspaceOverlay(state, item.id), "Overlay rimosso dalla bozza")}>Rimuovi</Button></div>)}</div><p className="mt-3 text-[11px] text-barber-paper/45">Le condizioni e le pedine digitali restano fuori da R6.3.</p></section>
        {report.length ? <section className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4"><h2 className="font-serif text-lg">Report legacy</h2><div className="mt-2 max-h-48 space-y-2 overflow-auto text-xs text-amber-100/70">{report.map((entry, index) => <p key={`${entry.code}-${index}`}><strong className="text-amber-200">{entry.severity}</strong> · {entry.message}</p>)}</div></section> : null}
      </aside>
    </div>
  </main>;
}
