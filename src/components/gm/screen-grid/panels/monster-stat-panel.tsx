"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Loader2, Search } from "lucide-react";
import {
  fetchExpandedBestiaryChunkAction,
  searchBestiaryChunksAction,
  type BestiarySearchHit,
} from "@/lib/actions/wiki-bestiary-search-actions";
import { getEntity, getMonstersForInitiative } from "@/app/campaigns/wiki-actions";
import { getWikiContentBody, preserveMarkdownBlankLines } from "@/lib/wiki/content";
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

export function MonsterStatPanel({ entityId, name, bestiaryChunkId }: MonsterStatPanelProps) {
  const { campaignId } = useGmScreenBoard();
  const [query, setQuery] = useState(name ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(name ?? "Statblock");
  const [body, setBody] = useState("");
  const [wikiHits, setWikiHits] = useState<WikiMonsterHit[]>([]);
  const [manualHits, setManualHits] = useState<BestiarySearchHit[]>([]);
  const [activeEntityId, setActiveEntityId] = useState<string | undefined>(entityId);
  const [activeChunkId, setActiveChunkId] = useState<string | undefined>(bestiaryChunkId);

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
        setTitle(entity.name);
        const attrs = (entity.attributes ?? {}) as Record<string, unknown>;
        const combat = (attrs.combat_stats ?? {}) as Record<string, unknown>;
        const statblock =
          typeof attrs.statblock === "string" ? attrs.statblock.trim() : "";
        const contentBody = getWikiContentBody(entity.content);
        const lines: string[] = [`# ${entity.name}`];
        if (combat.hp || combat.ac || combat.cr) {
          lines.push(
            "",
            `**PV:** ${combat.hp ?? "—"} · **CA:** ${combat.ac ?? "—"} · **GS:** ${combat.cr ?? "—"}`
          );
        }
        if (typeof entity.xp_value === "number" && entity.xp_value > 0) {
          lines.push(`**PE:** ${entity.xp_value}`);
        }
        if (statblock) {
          lines.push("", "## Statblock", "", statblock);
        }
        if (contentBody) {
          lines.push("", "## Descrizione", "", contentBody);
        }
        setBody(lines.join("\n"));
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
        setTitle(label ?? "Statblock manuale");
        setBody(res.text);
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
    <div className="flex h-full min-h-0 flex-col gap-2">
      <form
        className="flex shrink-0 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(query);
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca mostro (wiki o manuali)…"
          className="h-8 border-amber-600/30 bg-zinc-900 text-sm text-zinc-100"
        />
        <Button
          type="submit"
          size="sm"
          className="h-8 shrink-0 bg-amber-600 text-zinc-950 hover:bg-amber-500"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        </Button>
      </form>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      {(wikiHits.length > 0 || manualHits.length > 0) && !activeEntityId && !body ? (
        <div className="shrink-0 space-y-2 overflow-auto max-h-40">
          {wikiHits.length > 0 ? (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-amber-400/80">Wiki campagna</p>
              <div className="flex flex-col gap-1">
                {wikiHits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    className="rounded border border-zinc-700 px-2 py-1 text-left text-xs text-zinc-200 hover:border-amber-600/40"
                    onClick={() => void loadWikiEntity(hit.id)}
                  >
                    {hit.name}
                    <span className="ml-2 text-zinc-500">PV {hit.hp}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {manualHits.length > 0 ? (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-amber-400/80">Manuali</p>
              <div className="flex flex-col gap-1">
                {manualHits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    className="rounded border border-zinc-700 px-2 py-1 text-left text-xs text-zinc-200 hover:border-amber-600/40"
                    onClick={() =>
                      void loadBestiaryChunk(hit.id, hit.section_heading ?? hit.manual_label)
                    }
                  >
                    {hit.section_heading ?? hit.manual_label}
                    <span className="ml-2 text-zinc-500">{hit.manual_label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {(wikiHits.length > 0 || manualHits.length > 0) && body ? (
        <div className="flex shrink-0 flex-wrap gap-1">
          {wikiHits.slice(0, 4).map((hit) => (
            <button
              key={hit.id}
              type="button"
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px]",
                activeEntityId === hit.id
                  ? "border-amber-500/50 bg-amber-600/20 text-amber-100"
                  : "border-zinc-700 text-zinc-400"
              )}
              onClick={() => void loadWikiEntity(hit.id)}
            >
              {hit.name.slice(0, 20)}
            </button>
          ))}
          {manualHits.slice(0, 4).map((hit) => (
            <button
              key={hit.id}
              type="button"
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px]",
                activeChunkId === hit.id
                  ? "border-amber-500/50 bg-amber-600/20 text-amber-100"
                  : "border-zinc-700 text-zinc-400"
              )}
              onClick={() => void loadBestiaryChunk(hit.id, hit.section_heading ?? undefined)}
            >
              {(hit.section_heading ?? hit.manual_label).slice(0, 20)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-200">
        {loading && !body ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Caricamento…
          </div>
        ) : body ? (
          <div className="space-y-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-amber-200 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-amber-200">
            {!body.startsWith("#") ? (
              <h2 className="text-base font-semibold text-amber-200">{title}</h2>
            ) : null}
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>
              {preserveMarkdownBlankLines(body)}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Cerca un mostro nella wiki campagna o nei manuali bestiario B&D.
          </p>
        )}
      </div>
    </div>
  );
}
