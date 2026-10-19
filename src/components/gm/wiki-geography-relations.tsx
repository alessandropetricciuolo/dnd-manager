"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, CornerDownRight } from "lucide-react";
import { getGeographyCityGroups, getGeographyEntry, getGeographyNeighbors, geographyIdentityKey, type GeographyEntry, type GeographyIndex, type GeographyNeighbor, type GeographySelection, type WikiGeographyData } from "@/lib/wiki/geography";
import { DualSourceImage } from "@/components/dual-source-image";
import { cn } from "@/lib/utils";
import styles from "./wiki-geography.module.css";

type SharedProps = {
  data: WikiGeographyData;
  index: GeographyIndex;
  selected: GeographySelection | null;
  onRead: (selection: GeographySelection) => void;
  onStartFrom: (selection: GeographySelection) => void;
};

function RelationNode({ entry, selected, onRead }: { entry: GeographyEntry; selected: GeographySelection | null; onRead: SharedProps["onRead"] }) {
  return <button type="button" className={styles.relationNode} aria-pressed={Boolean(selected && selected.kind === entry.kind && selected.id === entry.id)} onClick={() => onRead(entry)} aria-label={`Leggi ${entry.name}`}>
    {entry.imageUrl || entry.telegramFallbackId ? <span className={styles.thumb}><DualSourceImage driveUrl={entry.imageUrl} telegramFallbackId={entry.telegramFallbackId} alt="" width={34} height={38} sizes="34px" loading="lazy" /></span> : null}
    <span className={styles.entryText}><span className={styles.entryName}>{entry.name}</span>{entry.adminOnly ? <span className={styles.entryLabel}>Solo Admin</span> : null}</span><ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
  </button>;
}

function NeighborBranch({ neighbor, ancestors, ...shared }: SharedProps & { neighbor: GeographyNeighbor; ancestors: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const key = geographyIdentityKey(shared.index, neighbor.entry);
  const repeated = ancestors.includes(key);
  const neighbors = useMemo(() => repeated ? [] : getGeographyNeighbors(shared.data, shared.index, neighbor.entry), [shared.data, shared.index, neighbor.entry, repeated]);
  // Bound indentation on a small screen; users can continue from any leaf.
  const continueFromHere = ancestors.length >= 4;
  return <li className={styles.networkBranch}>
    <div className={styles.networkEdges}>{neighbor.relations.map(relation => <span key={relation.id} className={styles.networkEdge} aria-label={`${relation.sourceName} → ${relation.label} → ${relation.targetName}`}>
      {relation.direction === "out" ? <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}{relation.label || "Senza etichetta"}
    </span>)}</div>
    <RelationNode entry={neighbor.entry} selected={shared.selected} onRead={shared.onRead} />
    {repeated ? <p className={styles.networkRepeated}>Già presente nel percorso</p> : neighbors.length ? continueFromHere ? <button type="button" className={styles.networkToggle} onClick={() => shared.onStartFrom(neighbor.entry)}><CornerDownRight className="h-3.5 w-3.5" aria-hidden="true" />Prosegui da questa voce</button> : <button type="button" className={styles.networkToggle} aria-expanded={expanded} aria-label={`${expanded ? "Chiudi" : "Espandi"} collegamenti di ${neighbor.entry.name}`} onClick={() => setExpanded(value => !value)}>
      {expanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}{expanded ? "Chiudi collegamenti" : `Collegamenti (${neighbors.length})`}
    </button> : null}
    {expanded && !repeated ? <NeighborList {...shared} neighbors={neighbors} ancestors={[...ancestors, key]} /> : null}
  </li>;
}

function NeighborList({ neighbors, ancestors, ...shared }: SharedProps & { neighbors: GeographyNeighbor[]; ancestors: string[] }) {
  const [limit, setLimit] = useState(6);
  return <><ul className={styles.networkBranches}>{neighbors.slice(0, limit).map(neighbor => <NeighborBranch key={geographyIdentityKey(shared.index, neighbor.entry)} {...shared} neighbor={neighbor} ancestors={ancestors} />)}</ul>{neighbors.length > limit ? <button type="button" className={styles.textButton} onClick={() => setLimit(value => value + 6)}>Mostra altri collegamenti ({neighbors.length - limit}) ↓</button> : null}</>;
}

export function WikiGeographyRelations({ root, ...shared }: SharedProps & { root: GeographySelection }) {
  const entry = getGeographyEntry(shared.index, root);
  const neighbors = useMemo(() => getGeographyNeighbors(shared.data, shared.index, root), [shared.data, shared.index, root]);
  const map = root.kind === "map" ? shared.index.maps.get(root.id) : undefined;
  const [open, setOpen] = useState(!map || !["world", "continent", "city"].includes(map.mapType));
  if (!entry) return null;
  return <section className={styles.network} aria-label={`Rete dei collegamenti di ${entry.name}`}>
    <button type="button" className={styles.networkHeading} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span>{open ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}Collegamenti di {entry.name}</span><span className={styles.meta}>{neighbors.length} voci</span>
    </button>
    {open ? <><p className={styles.networkLegend}>↓ dalla voce sopra · ↑ verso la voce sopra</p><div className={cn(styles.networkRoot, styles.networkRootNode)}><RelationNode entry={entry} selected={shared.selected} onRead={shared.onRead} /></div>{neighbors.length ? <NeighborList {...shared} neighbors={neighbors} ancestors={[geographyIdentityKey(shared.index, root)]} /> : <p className={styles.empty}>Nessun collegamento registrato.</p>}</> : null}
  </section>;
}

export function WikiGeographyCityGroups({ mapId, ...shared }: SharedProps & { mapId: string }) {
  const { groups } = useMemo(() => getGeographyCityGroups(shared.data, shared.index, mapId), [shared.data, shared.index, mapId]);
  return groups.length ? <section className={styles.cityGroups} aria-label="Luoghi e organizzazioni della città">
    <h3 className={styles.groupHeading}>Luoghi e organizzazioni<span>{groups.length}</span></h3>
    {groups.map(({ entry, members }) => <CityGroup key={geographyIdentityKey(shared.index, entry)} {...shared} entry={entry} members={members} mapId={mapId} />)}
  </section> : null;
}

function CityGroup({ entry, members, mapId, ...shared }: SharedProps & { entry: GeographyEntry; members: GeographyNeighbor[]; mapId: string }) {
  const [open, setOpen] = useState(false);
  return <div className={styles.cityGroup}>
    <div className={styles.cityGroupHeader}>
      <button type="button" className={styles.cityGroupToggle} aria-expanded={open} aria-label={`${open ? "Chiudi" : "Espandi"} gruppo ${entry.name}`} onClick={() => setOpen(value => !value)}>
        {open ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}<span>{members.length}</span>
      </button>
      <RelationNode entry={entry} selected={shared.selected} onRead={shared.onRead} />
    </div>
    {open ? <div className={styles.cityGroupMembers}><NeighborList {...shared} neighbors={members} ancestors={[geographyIdentityKey(shared.index, { kind: "map", id: mapId }), geographyIdentityKey(shared.index, entry)]} /><button type="button" className={styles.textButton} onClick={() => shared.onStartFrom(entry)}>Esplora tutti i legami di {entry.name} →</button></div> : null}
  </div>;
}
