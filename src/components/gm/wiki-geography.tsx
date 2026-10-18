"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, BookOpen, ChevronRight, Globe, ImageIcon, Loader2, LockKeyhole, MapPin, MonitorPlay, RefreshCw, Search, UserRound } from "lucide-react";
import { getWikiGeographyData, getWikiGeographyDetail, type WikiGeographyDetail } from "@/app/campaigns/wiki-geography-actions";
import { buildGeographyIndex, geographyKey, getGeographyContext, getGeographyEntry, getGeographyLinks, getGeographyPath, getUnplacedGeography, type GeographyEntry, type GeographyIndex, type GeographyMap, type GeographySelection, type WikiGeographyData } from "@/lib/wiki/geography";
import { getWikiImages } from "@/lib/wiki/images";
import { DualSourceImage } from "@/components/dual-source-image";
import { WikiGeographyRelations } from "./wiki-geography-relations";
import { EntityContent } from "@/components/wiki/entity-content";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { openProjectionWindow } from "@/lib/browser/projection-window";
import { cn } from "@/lib/utils";
import styles from "./wiki-geography.module.css";

function initialPlace(data: WikiGeographyData, index: GeographyIndex): string | null {
  const cities = data.maps.filter(map => map.mapType === "city");
  // Start in the city with the most explicitly located entries, without naming a campaign.
  return cities.sort((a, b) => getGeographyContext(data, index, b.id).local.length - getGeographyContext(data, index, a.id).local.length)[0]?.id ?? data.maps.find(map => map.mapType === "world")?.id ?? data.maps[0]?.id ?? null;
}

function EntryButton({ entry, selected, onSelect }: { entry: GeographyEntry; selected: GeographySelection | null; onSelect: (selection: GeographySelection) => void }) {
  const Icon = entry.kind === "map" ? MapPin : entry.type === "npc" ? UserRound : BookOpen;
  return <button type="button" className={styles.entry} aria-pressed={Boolean(selected && geographyKey(selected) === geographyKey(entry))} onClick={() => onSelect({ kind: entry.kind, id: entry.id })}>
    <span className={styles.thumb}>{entry.imageUrl || entry.telegramFallbackId ? <DualSourceImage driveUrl={entry.imageUrl} telegramFallbackId={entry.telegramFallbackId} alt="" sizes="34px" width={34} height={38} loading="lazy" /> : <Icon className="h-4 w-4" aria-hidden="true" />}</span>
    <span className={styles.entryText}><span className={styles.entryName}>{entry.name}{entry.adminOnly ? <LockKeyhole className="ml-1 inline h-3 w-3" aria-label="Solo Admin" /> : null}</span><span className={styles.entryLabel}>{entry.labels.join(" · ") || (entry.kind === "map" ? "Luogo dell’Atlante" : "Voce Wiki")}</span></span>
    <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
  </button>;
}

function EntryGroup({ title, entries, selected, onSelect }: { title: string; entries: GeographyEntry[]; selected: GeographySelection | null; onSelect: (selection: GeographySelection) => void }) {
  const [limit, setLimit] = useState(6);
  return <section className={styles.group}>
    <h3 className={styles.groupHeading}>{title}<span>{entries.length}</span></h3>
    {entries.length ? <div className={styles.entries}>{entries.slice(0, limit).map(entry => <EntryButton key={geographyKey(entry)} entry={entry} selected={selected} onSelect={onSelect} />)}</div> : <p className={styles.empty}>Nessun collegamento registrato.</p>}
    {entries.length > limit ? <button type="button" className={styles.textButton} onClick={() => setLimit(value => value + 12)}>Mostra altre voci ({entries.length - limit}) ↓</button> : limit > 6 ? <button type="button" className={styles.textButton} onClick={() => setLimit(6)}>Riduci ↑</button> : null}
  </section>;
}

function Hierarchy({ data, index, placeId, onNavigate }: { data: WikiGeographyData; index: GeographyIndex; placeId: string | null; onNavigate: (id: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ d: string; active: boolean }[]>([]);
  const path = placeId ? getGeographyPath(index, placeId) : [];
  const worlds = data.maps.filter(map => map.mapType === "world");
  const continent = path.find(map => map.mapType === "continent");
  const continents = data.maps.filter(map => map.mapType === "continent");
  const branches = continent ? data.maps.filter(map => map.parentId === continent.id) : [];
  const branchId = path.find(map => map.parentId === continent?.id)?.id;
  const signature = `${placeId}:${data.maps.map(map => `${map.id}:${map.parentId}`).join(",")}`;

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    let frame = 0;
    function measure() {
      if (!container) return;
      const bounds = container.getBoundingClientRect();
      const nodes = new Map(Array.from(container.querySelectorAll<HTMLElement>("[data-geo-node]")).map(node => [node.dataset.geoNode!, node]));
      const next: { d: string; active: boolean }[] = [];
      nodes.forEach((node, id) => {
        const parent = node.dataset.geoParent ? nodes.get(node.dataset.geoParent) : null;
        if (!parent) return;
        const a = parent.getBoundingClientRect(), b = node.getBoundingClientRect();
        const x1 = a.left - bounds.left + a.width / 2, y1 = a.bottom - bounds.top;
        const x2 = b.left - bounds.left + b.width / 2, y2 = b.top - bounds.top;
        const mid = y1 + (y2 - y1) / 2;
        next.push({ d: `M${x1},${y1} V${mid} H${x2} V${y2}`, active: node.getAttribute("aria-pressed") === "true" });
      });
      setLines(next);
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    schedule();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [signature]);

  function node(map: GeographyMap, active: boolean, subtitle?: string, world = false) {
    return <button type="button" key={map.id} data-geo-node={map.id} data-geo-parent={map.parentId ?? undefined} aria-pressed={active} className={cn(styles.node, world && styles.world)} onClick={() => onNavigate(map.id)}>
      {world ? <Globe className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}<span>{map.name}{subtitle ? <small>{subtitle}</small> : null}</span>{active && !world ? <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
    </button>;
  }

  return <nav ref={root} className={styles.tree} aria-label="Gerarchia geografica">
    <svg className={styles.lines} aria-hidden="true">{lines.map((line, i) => <path key={i} d={line.d} fill="none" stroke={line.active ? "var(--geo-accent)" : "var(--geo-line)"} strokeWidth={line.active ? 1.5 : 1} />)}</svg>
    {worlds.length ? <div className={cn(styles.treeLevel, styles.worlds)}>{worlds.map(map => node(map, placeId === map.id, undefined, true))}</div> : null}
    {continents.length ? <div className={styles.treeLevel}><span className={styles.levelLabel}>Continenti</span><div className={styles.branches}>{continents.map(map => node(map, continent?.id === map.id, `${data.maps.filter(child => child.parentId === map.id).length} luoghi nell’Atlante`))}</div></div> : null}
    {continent ? <div className={cn(styles.treeLevel, styles.cities)}><span className={styles.levelLabel}>Luoghi di {continent.name}</span>{branches.length ? <div className={styles.cityNodes}>{branches.map(map => node(map, branchId === map.id))}</div> : <p className={styles.empty}>Nessun luogo figlio registrato nell’Atlante.</p>}</div> : null}
  </nav>;
}

function Dossier({ campaignId, data, index, selected, revision, onSelect }: { campaignId: string; data: WikiGeographyData; index: GeographyIndex; selected: GeographySelection; revision: number; onSelect: (selection: GeographySelection) => void }) {
  const entry = getGeographyEntry(index, selected);
  const key = geographyKey(selected);
  const [detail, setDetail] = useState<{ key: string; data?: WikiGeographyDetail; primaryIsMap?: boolean; error?: string } | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [projectionError, setProjectionError] = useState<string | null>(null);
  const pairedWikiId = selected.kind === "map" ? index.mapToWiki.get(selected.id) : undefined;
  const links = getGeographyLinks(data, index, selected);

  useEffect(() => {
    let cancelled = false;
    const primary = pairedWikiId ? { kind: "wiki" as const, id: pairedWikiId } : selected;
    setDetail(null);
    setImageIndex(0);
    setImageOpen(false);
    setProjectionError(null);
    async function load() {
      try {
        const [result, mapResult] = await Promise.all([
          getWikiGeographyDetail(campaignId, primary),
          pairedWikiId ? getWikiGeographyDetail(campaignId, selected) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (!result.success) { setDetail({ key, error: result.error }); return; }
        const mapDetail = mapResult?.success ? mapResult.data : null;
        setDetail({ key, primaryIsMap: Boolean(mapDetail?.imageUrl && !result.data.imageUrl && !result.data.telegramFallbackId), data: { ...result.data, body: result.data.body || mapDetail?.body || "", imageUrl: result.data.imageUrl || mapDetail?.imageUrl || null } });
      } catch { if (!cancelled) setDetail({ key, error: "Impossibile caricare la voce. Aggiorna la vista e riprova." }); }
    }
    void load();
    return () => { cancelled = true; };
  }, [campaignId, key, pairedWikiId, revision, selected]);

  if (!entry) return <p className={styles.empty}>Questa voce non è più disponibile. Seleziona un’altra voce.</p>;
  const current = detail?.key === key ? detail : null;
  const wikiId = selected.kind === "wiki" ? selected.id : pairedWikiId;
  const mapViewUrl = `/campaigns/${campaignId}/maps/${selected.id}/view`;
  const wikiViewUrl = (imageId: string) => `/campaigns/${campaignId}/gm-only/regia-immagini/proiezione?items=${encodeURIComponent(imageId)}`;
  const images = [
    ...(current?.data?.imageUrl || current?.data?.telegramFallbackId ? [{ id: wikiId ?? selected.id, url: current.data.imageUrl, fallback: current.data.telegramFallbackId, title: entry.name, viewUrl: wikiId && !current.primaryIsMap ? wikiViewUrl(wikiId) : mapViewUrl }] : []),
    ...getWikiImages(current?.data?.attributes).map(image => ({ id: `${wikiId}:${image.id}`, url: image.url, fallback: image.telegram_fallback_id ?? null, title: image.title || entry.name, viewUrl: wikiViewUrl(`${wikiId}:${image.id}`) })),
  ];
  const image = images[Math.min(imageIndex, images.length - 1)];
  const gmNotes = current?.data?.attributes.gm_notes;
  const originalUrl = wikiId ? `/campaigns/${campaignId}/wiki/${wikiId}` : `/campaigns/${campaignId}/maps/${selected.id}/view`;
  const excerpt = current?.data?.body.split("\n").filter(line => !/^#{1,6}\s/.test(line.trim())).join("\n").slice(0, 650) ?? "";

  async function project() {
    if (!image) return;
    try {
      await openProjectionWindow(image.viewUrl, "PlayerScreenWindow");
    } catch { setProjectionError("Impossibile aprire la proiezione. Consenti le finestre aggiuntive nel browser e riprova."); }
  }

  return <>
    <p className={styles.eyebrow}>Voce selezionata</p>
    <div className={styles.identity}>{entry.imageUrl || entry.telegramFallbackId ? <div className={styles.portrait}><DualSourceImage driveUrl={entry.imageUrl} telegramFallbackId={entry.telegramFallbackId} alt="" sizes="55px" width={55} height={64} /></div> : null}<div><h3>{entry.name}</h3><span className={styles.meta}>{selected.kind === "map" ? "Atlante" : "Wiki"}{entry.adminOnly ? " · Solo Admin" : ""}</span></div></div>
    <Link href={originalUrl} target="_blank" rel="noopener noreferrer" className={styles.textButton}>Apri la voce originale ↗</Link>
    {!current ? <p className={styles.empty} role="status"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Caricamento del dossier…</p> : current.error ? <p className={styles.empty} role="alert">{current.error}</p> : <>
      {images.length ? <><div className={styles.gallery}><button type="button" onClick={() => setImageOpen(true)}><ImageIcon className="mr-1 inline h-4 w-4" aria-hidden="true" />Apri immagine</button><button type="button" onClick={() => void project()}><MonitorPlay className="mr-1 inline h-4 w-4" aria-hidden="true" />Proietta</button></div>{images.length > 1 ? <div className={styles.gallery} aria-label="Scegli immagine">{images.map((item, position) => <button key={item.id} type="button" aria-pressed={position === imageIndex} aria-label={`Immagine ${position + 1}: ${item.title}`} onClick={() => setImageIndex(position)}>{position + 1}</button>)}</div> : null}</> : null}
      {projectionError ? <p role="alert" className={styles.empty}>{projectionError}</p> : null}
      <div className={styles.reader}>{current.data?.description ? <EntityContent content={current.data.description} /> : null}{current.data?.body ? current.data.body.length > 800 ? <><EntityContent content={`${excerpt}…`} /><details className={styles.references}><summary>Leggi la voce completa</summary><EntityContent content={current.data.body} /></details></> : <EntityContent content={current.data.body} /> : <p className={styles.empty}>La scheda non ha ancora un testo descrittivo.</p>}</div>
      {typeof gmNotes === "string" && gmNotes.trim() ? <details className={styles.references}><summary>Note riservate GM</summary><div className={styles.reader}><EntityContent content={gmNotes} /></div></details> : null}
    </>}
    <h4 className={styles.sectionHeading}>Relazioni della voce · {links.length}</h4>
    <div className={styles.relations}>{links.slice(0, 4).map(link => <div key={link.relationshipId} className={styles.relation}><button type="button" className={styles.textButton} onClick={() => onSelect(link.source)}>{link.source.name}</button><span className={styles.relationLabel}><ArrowDown className="h-3 w-3 shrink-0" aria-hidden="true" />{link.label || "Relazione senza etichetta"}</span><button type="button" className={styles.textButton} onClick={() => onSelect(link.target)}>{link.target.name} <ArrowRight className="inline h-3 w-3" aria-hidden="true" /></button></div>)}{links.length > 4 ? <details><summary className={styles.meta}>Altri {links.length - 4} collegamenti</summary>{links.slice(4).map(link => <div key={link.relationshipId} className={styles.relation}><button type="button" className={styles.textButton} onClick={() => onSelect(link.source)}>{link.source.name}</button><p className={styles.meta}>↓ {link.label}</p><button type="button" className={styles.textButton} onClick={() => onSelect(link.target)}>{link.target.name}</button></div>)}</details> : links.length === 0 ? <p className={styles.empty}>Nessuna relazione registrata.</p> : null}</div>
    <Dialog open={imageOpen} onOpenChange={setImageOpen}><DialogContent className="max-w-5xl border-barber-gold/30 bg-barber-dark"><DialogTitle>{image?.title ?? entry.name}</DialogTitle><DialogDescription>Immagine della voce selezionata.</DialogDescription>{image ? <DualSourceImage driveUrl={image.url} telegramFallbackId={image.fallback} alt={image.title} preserveOriginal className="max-h-[65dvh] w-full object-contain" /> : null}</DialogContent></Dialog>
  </>;
}

export function WikiGeography({ campaignId, initialData, initialError }: { campaignId: string; initialData: WikiGeographyData | null; initialError: string | null }) {
  const [data, setData] = useState<WikiGeographyData>(initialData ?? { campaignName: "Campagna", maps: [], entities: [], relationships: [] });
  const index = useMemo(() => buildGeographyIndex(data), [data]);
  const [placeId, setPlaceId] = useState<string | null>(() => initialPlace(data, index));
  const [selected, setSelected] = useState<GeographySelection | null>(() => placeId ? { kind: "map", id: placeId } : data.entities[0] ? { kind: "wiki", id: data.entities[0].id } : null);
  const [networkRoot, setNetworkRoot] = useState<GeographySelection | null>(selected);
  const [error, setError] = useState(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState<{ placeId: string | null; selected: GeographySelection | null; networkRoot: GeographySelection | null }[]>([]);
  const [unplacedQuery, setUnplacedQuery] = useState("");
  const inspector = useRef<HTMLElement>(null);
  const path = placeId ? getGeographyPath(index, placeId) : [];
  const context = useMemo(() => placeId ? getGeographyContext(data, index, placeId) : { children: [], local: [], references: [] }, [data, index, placeId]);
  const unplaced = useMemo(() => getUnplacedGeography(data, index), [data, index]);
  const otherMaps = data.maps.filter(map => {
    if (map.mapType === "world") return false;
    const first = getGeographyPath(index, map.id)[0];
    return !map.parentId || !index.maps.has(map.parentId) || Boolean(first?.parentId && index.maps.has(first.parentId));
  });

  function navigate(selection: GeographySelection, focus = true) {
    if (selected && networkRoot && geographyKey(selected) === geographyKey(selection) && geographyKey(networkRoot) === geographyKey(selection) && (selection.kind !== "map" || selection.id === placeId)) return;
    setHistory(previous => [...previous.slice(-49), { placeId, selected, networkRoot }]);
    setSelected({ kind: selection.kind, id: selection.id });
    setNetworkRoot({ kind: selection.kind, id: selection.id });
    if (selection.kind === "map") setPlaceId(selection.id);
    if (focus && window.matchMedia("(max-width: 800px)").matches) requestAnimationFrame(() => inspector.current?.scrollIntoView({ behavior: "auto", block: "start" }));
  }
  function readRelated(selection: GeographySelection) {
    if (selected && geographyKey(selected) === geographyKey(selection)) return;
    setHistory(previous => [...previous.slice(-49), { placeId, selected, networkRoot }]);
    setSelected({ kind: selection.kind, id: selection.id });
    // Reading a neighbor keeps the visible chain and its original place intact.
    if (window.matchMedia("(max-width: 800px)").matches) requestAnimationFrame(() => inspector.current?.scrollIntoView({ behavior: "auto", block: "start" }));
  }
  function back() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setPlaceId(previous.placeId); setSelected(previous.selected); setNetworkRoot(previous.networkRoot); setHistory(value => value.slice(0, -1));
  }
  async function refresh() {
    setRefreshing(true); setError(null);
    try {
      const result = await getWikiGeographyData(campaignId);
      if (!result.success) { setError(result.error); return; }
      const nextIndex = buildGeographyIndex(result.data);
      const nextPlace = placeId && nextIndex.maps.has(placeId) ? placeId : initialPlace(result.data, nextIndex);
      setData(result.data); setPlaceId(nextPlace);
      if (!selected || !getGeographyEntry(nextIndex, selected)) setSelected(nextPlace ? { kind: "map", id: nextPlace } : result.data.entities[0] ? { kind: "wiki", id: result.data.entities[0].id } : null);
      if (!networkRoot || !getGeographyEntry(nextIndex, networkRoot)) setNetworkRoot(nextPlace ? { kind: "map", id: nextPlace } : result.data.entities[0] ? { kind: "wiki", id: result.data.entities[0].id } : null);
      setHistory([]); setRevision(value => value + 1);
    } catch { setError("Impossibile aggiornare la vista. I dati precedenti restano disponibili."); }
    finally { setRefreshing(false); }
  }

  return <section className={styles.shell} aria-label="Wiki geografica">
    <header className={styles.heading}><div><p className={styles.eyebrow}>{data.campaignName} · Strumenti GM</p><h1 className={styles.title}>Esplora il mondo</h1></div><div className={styles.toolbar}><Link className={styles.button} href={`/campaigns/${campaignId}?tab=gm`}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Strumenti GM</Link><button type="button" className={styles.button} disabled={refreshing} onClick={() => void refresh()}><RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden="true" />{refreshing ? "Aggiornamento…" : "Aggiorna"}</button></div></header>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <Hierarchy data={data} index={index} placeId={placeId} onNavigate={id => navigate({ kind: "map", id }, false)} />
    <div className={styles.workspace}><main className={styles.content}>
      <div className={styles.contextHeading}><div><nav className={styles.breadcrumb} aria-label="Percorso del luogo">{path.map((map, i) => <span key={map.id}>{i ? <ChevronRight className="mr-1 inline h-3 w-3" aria-hidden="true" /> : null}<button type="button" onClick={() => navigate({ kind: "map", id: map.id }, false)}>{map.name}</button></span>)}</nav><h2>{placeId ? index.maps.get(placeId)?.name : "Voci della campagna"}</h2></div>{history.length ? <button type="button" className={styles.textButton} onClick={back}>← Torna alla voce precedente</button> : null}</div>
      {networkRoot ? <WikiGeographyRelations key={`${geographyKey(networkRoot)}:${revision}`} root={networkRoot} data={data} index={index} selected={selected} onRead={readRelated} onStartFrom={selection => navigate(selection, false)} /> : null}
      <div className={styles.groups}><EntryGroup key={`${placeId}:children`} title="Luoghi nell’Atlante" entries={context.children} selected={selected} onSelect={selection => navigate(selection, false)} /><EntryGroup key={`${placeId}:local`} title="Voci nel luogo" entries={context.local} selected={selected} onSelect={navigate} /></div>
      <details key={`${placeId}:references`} className={styles.references}><summary>Citazioni e altri legami ({context.references.length})</summary><p className={styles.empty}>Questi collegamenti non stabiliscono una presenza nel luogo.</p><EntryGroup key={`${placeId}:reference-list`} title="Voci collegate" entries={context.references} selected={selected} onSelect={navigate} /></details>
    </main><aside ref={inspector} className={styles.inspector} aria-label="Dossier della voce" aria-live="polite">{selected ? <Dossier campaignId={campaignId} data={data} index={index} selected={selected} revision={revision} onSelect={readRelated} /> : <p className={styles.empty}>Seleziona una voce per leggere il dossier.</p>}</aside></div>
    <details className={styles.other}><summary>Altri luoghi e voci senza collocazione geografica ({otherMaps.length + unplaced.length})</summary><div className={styles.otherSections}><EntryGroup title="Luoghi senza padre accessibile" entries={otherMaps.map(map => getGeographyEntry(index, { kind: "map", id: map.id })!)} selected={selected} onSelect={selection => navigate(selection, false)} /><div><label className={styles.search}><Search className="h-4 w-4 shrink-0" aria-hidden="true" /><input type="search" aria-label="Cerca fra le voci senza collocazione" placeholder="Cerca fra queste voci…" value={unplacedQuery} onChange={event => setUnplacedQuery(event.target.value)} /></label><EntryGroup key={unplacedQuery} title="Voci senza collocazione esplicita" entries={unplaced.filter(entry => entry.name.toLocaleLowerCase("it").includes(unplacedQuery.toLocaleLowerCase("it")))} selected={selected} onSelect={navigate} /></div></div></details>
    <footer className={styles.footer}><span>Consultazione · nessun collegamento viene modificato</span><span>{data.maps.length} mappe · {data.entities.length} voci · {data.relationships.length} relazioni accessibili</span></footer>
  </section>;
}
