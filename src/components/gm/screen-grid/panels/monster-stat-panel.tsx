"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import {
  fetchExpandedBestiaryChunkAction,
  searchBestiaryChunksAction,
  type BestiarySearchHit,
} from "@/lib/actions/wiki-bestiary-search-actions";
import { getEntity, getMonstersForInitiative } from "@/app/campaigns/wiki-actions";
import { getWikiContentBody } from "@/lib/wiki/content";
import { parseDenseStatblock, type DenseStatblock } from "@/lib/manuals/dense-statblock-parser";
import { FiveeStatblockView } from "@/components/gm/screen-grid/renderers/fivee-statblock-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGmScreenBoard } from "../gm-screen-board-context";

type MonsterStatPanelProps = {
  entityId?: string;
  name?: string;
  bestiaryChunkId?: string;
};

type WikiMonsterHit = { id: string; name: string; hp: number };

function wikiEntityToMarkdown(entity: {
  name: string;
  content: unknown;
  attributes?: Record<string, unknown> | null;
  xp_value?: number | null;
}): string {
  const attrs = (entity.attributes ?? {}) as Record<string, unknown>;
  const combat = (attrs.combat_stats ?? {}) as Record<string, unknown>;
  const statblock = typeof attrs.statblock === "string" ? attrs.statblock.trim() : "";
  const contentBody = getWikiContentBody(entity.content);
  if (statblock) {
    const hasHeading = /^#{1,3}\s+/m.test(statblock);
    return hasHeading ? statblock : `# ${entity.name}\n\n${statblock}`;
  }
  const lines: string[] = [`# ${entity.name}`];
  if (combat.ac) lines.push(`**Classe Armatura** ${combat.ac}`);
  if (combat.hp) lines.push(`**Punti Ferita** ${combat.hp}`);
  if (combat.cr) {
    const xp =
      typeof entity.xp_value === "number" && entity.xp_value > 0
        ? ` (${entity.xp_value} PE)`
        : "";
    lines.push(`**Sfida** ${combat.cr}${xp}`);
  }
  if (contentBody) lines.push("", contentBody);
  return lines.join("\n");
}

export function MonsterStatPanel({ entityId, name, bestiaryChunkId }: MonsterStatPanelProps) {
  const { campaignId } = useGmScreenBoard();
  const [query, setQuery] = useState(name ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawMarkdown, setRawMarkdown] = useState("");
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [wikiHits, setWikiHits] = useState<WikiMonsterHit[]>([]);
  const [manualHits, setManualHits] = useState<BestiarySearchHit[]>([]);
  const [activeEntityId, setActiveEntityId] = useState<string | undefined>(entityId);
  const [activeChunkId, setActiveChunkId] = useState<string | undefined>(bestiaryChunkId);

  const parsed: DenseStatblock | null = useMemo(() => {
    if (!rawMarkdown.trim()) return null;
    return parseDenseStatblock(rawMarkdown, {
      sourceLabel,
      fallbackName: name ?? null,
    });
  }, [rawMarkdown, sourceLabel, name]);

  const loadWikiEntity = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const entity = await getEntity(id, campaignId);
        if (!entity) {
          setError("Mostro wiki non trovato.");
          return;
        }
        setActiveEntityId(id);
        setActiveChunkId(undefined);
        setSourceLabel("Wiki campagna");
        setRawMarkdown(
          wikiEntityToMarkdown({
            name: entity.name,
            content: entity.content,
            attributes: entity.attributes as Record<string, unknown> | null,
            xp_value: entity.xp_value,
          })
        );
      } finally {
        setLoading(false);
      }
    },
    [campaignId]
  );

  const loadBestiaryChunk = useCallback(
    async (chunkId: string, label?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchExpandedBestiaryChunkAction(campaignId, chunkId);
        if (!res.success) {
          setError(res.message);
          return;
        }
        setActiveChunkId(chunkId);
        setActiveEntityId(undefined);
        setSourceLabel(res.sourceLabel ?? label ?? null);
        setRawMarkdown(res.text);
      } finally {
        setLoading(false);
      }
    },
    [campaignId]
  );

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setError("Inserisci almeno 2 caratteri.");
        return;
      }
      setLoading(true);
      setError(null);
      setRawMarkdown("");
      setActiveEntityId(undefined);
      setActiveChunkId(undefined);
      try {
        const [wikiRes, bestiaryRes] = await Promise.all([
          getMonstersForInitiative(campaignId),
          searchBestiaryChunksAction(campaignId, trimmed),
        ]);
        const qLower = trimmed.toLowerCase();
        const wiki =
          wikiRes.success && wikiRes.data
            ? wikiRes.data
                .filter((m) => m.name.toLowerCase().includes(qLower))
                .slice(0, 12)
                .map((m) => ({ id: m.id, name: m.name, hp: m.hp }))
            : [];
        setWikiHits(wiki);
        setManualHits(bestiaryRes.success ? bestiaryRes.hits : []);
        if (!wiki.length && !(bestiaryRes.success && bestiaryRes.hits.length)) {
          setError(bestiaryRes.success ? "Nessun risultato." : bestiaryRes.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [campaignId]
  );

  useEffect(() => {
    if (entityId) {
      void loadWikiEntity(entityId);
      return;
    }
    if (bestiaryChunkId) {
      void loadBestiaryChunk(bestiaryChunkId, name);
      return;
    }
    if (name && name.trim().length >= 2) {
      void runSearch(name);
    }
  }, [entityId, bestiaryChunkId, name, loadWikiEntity, loadBestiaryChunk, runSearch]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <form
        className="flex shrink-0 gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(query);
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca mostro…"
          className="h-6 border-amber-600/30 bg-zinc-900 px-2 text-[10px] text-zinc-100"
        />
        <Button
          type="submit"
          size="sm"
          className="h-6 shrink-0 bg-amber-600 px-2 text-zinc-950 hover:bg-amber-500"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
        </Button>
      </form>

      {error ? <p className="text-[10px] text-red-300">{error}</p> : null}

      {(wikiHits.length > 0 || manualHits.length > 0) && !parsed ? (
        <div className="max-h-28 shrink-0 space-y-1 overflow-auto">
          {wikiHits.map((hit) => (
            <button
              key={hit.id}
              type="button"
              className="block w-full truncate rounded border border-zinc-700 px-1.5 py-0.5 text-left text-[10px] text-zinc-200 hover:border-amber-600/40"
              onClick={() => void loadWikiEntity(hit.id)}
            >
              {hit.name}
              <span className="ml-1 text-zinc-500">wiki · PV {hit.hp}</span>
            </button>
          ))}
          {manualHits.map((hit) => (
            <button
              key={hit.id}
              type="button"
              className="block w-full truncate rounded border border-zinc-700 px-1.5 py-0.5 text-left text-[10px] text-zinc-200 hover:border-amber-600/40"
              onClick={() =>
                void loadBestiaryChunk(hit.id, hit.section_heading ?? hit.manual_label)
              }
            >
              {hit.section_heading ?? hit.manual_label}
              <span className="ml-1 text-zinc-500">{hit.manual_label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {parsed ? (
        <div className="flex shrink-0 flex-wrap gap-0.5">
          {wikiHits.slice(0, 3).map((hit) => (
            <button
              key={hit.id}
              type="button"
              className={cn(
                "rounded border px-1 py-px text-[9px]",
                activeEntityId === hit.id
                  ? "border-amber-500/50 bg-amber-600/20 text-amber-100"
                  : "border-zinc-700 text-zinc-500"
              )}
              onClick={() => void loadWikiEntity(hit.id)}
            >
              {hit.name.slice(0, 16)}
            </button>
          ))}
          {manualHits.slice(0, 3).map((hit) => (
            <button
              key={hit.id}
              type="button"
              className={cn(
                "rounded border px-1 py-px text-[9px]",
                activeChunkId === hit.id
                  ? "border-amber-500/50 bg-amber-600/20 text-amber-100"
                  : "border-zinc-700 text-zinc-500"
              )}
              onClick={() => void loadBestiaryChunk(hit.id, hit.section_heading ?? undefined)}
            >
              {(hit.section_heading ?? hit.manual_label).slice(0, 16)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto rounded border border-zinc-800/80 bg-zinc-950/60 px-1.5 py-1">
        {loading && !parsed ? (
          <div className="flex items-center gap-1 text-[10px] text-zinc-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Caricamento…
          </div>
        ) : parsed ? (
          <FiveeStatblockView data={parsed} />
        ) : (
          <p className="text-[10px] text-zinc-500">Cerca un mostro (wiki o manuali bestiario).</p>
        )}
      </div>
    </div>
  );
}
