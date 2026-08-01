"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Loader2, Search } from "lucide-react";
import { getCompendiumDataAction, type CompendiumElement } from "@/lib/actions/compendium-actions";
import { getEntity } from "@/app/campaigns/wiki-actions";
import { getWikiContentBody, preserveMarkdownBlankLines } from "@/lib/wiki/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGmScreenBoard } from "../gm-screen-board-context";

type WikiEntityPanelProps = {
  entityId?: string;
  initialQuery?: string;
};

export function WikiEntityPanel({ entityId, initialQuery = "" }: WikiEntityPanelProps) {
  const { campaignId } = useGmScreenBoard();
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("Wiki");
  const [body, setBody] = useState("");
  const [hits, setHits] = useState<CompendiumElement[]>([]);
  const [catalog, setCatalog] = useState<CompendiumElement[] | null>(null);

  const loadEntity = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const entity = await getEntity(id, campaignId);
        if (!entity) {
          setError("Voce wiki non trovata.");
          return;
        }
        setTitle(entity.name);
        const content = getWikiContentBody(entity.content);
        const attrs = entity.attributes;
        const attrLines: string[] = [];
        if (attrs && typeof attrs === "object") {
          const statblock = (attrs as { statblock?: unknown }).statblock;
          if (typeof statblock === "string" && statblock.trim()) {
            attrLines.push("## Meccanica", "", statblock.trim());
          }
        }
        setBody([`# ${entity.name}`, "", content, "", ...attrLines].filter(Boolean).join("\n"));
      } finally {
        setLoading(false);
      }
    },
    [campaignId]
  );

  const ensureCatalog = useCallback(async () => {
    if (catalog) return catalog;
    const res = await getCompendiumDataAction(campaignId);
    if (!res.success) {
      setError(res.error);
      return [];
    }
    setCatalog(res.data.elements);
    return res.data.elements;
  }, [campaignId, catalog]);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim().toLowerCase();
      if (trimmed.length < 2) {
        setError("Inserisci almeno 2 caratteri.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const elements = await ensureCatalog();
        const matched = elements
          .filter(
            (el) =>
              el.name.toLowerCase().includes(trimmed) ||
              el.searchText.toLowerCase().includes(trimmed) ||
              el.tags.some((t) => t.toLowerCase().includes(trimmed))
          )
          .slice(0, 20);
        setHits(matched);
        if (matched.length === 1) {
          await loadEntity(matched[0].id);
        } else if (matched.length === 0) {
          setError("Nessuna voce wiki trovata.");
          setBody("");
        } else {
          setBody("");
        }
      } finally {
        setLoading(false);
      }
    },
    [ensureCatalog, loadEntity]
  );

  useEffect(() => {
    if (entityId) void loadEntity(entityId);
    else if (initialQuery.trim().length >= 2) void runSearch(initialQuery);
  }, [entityId, initialQuery, loadEntity, runSearch]);

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
          placeholder="Cerca voce wiki…"
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

      {hits.length > 1 && !body ? (
        <div className="flex max-h-40 shrink-0 flex-col gap-1 overflow-auto">
          {hits.map((hit) => (
            <button
              key={hit.id}
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 text-left text-xs text-zinc-200 hover:border-amber-600/40"
              onClick={() => void loadEntity(hit.id)}
            >
              <span className="font-medium">{hit.name}</span>
              <span className="ml-2 text-zinc-500">{hit.type}</span>
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
          <div className="space-y-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-amber-200 [&_h2]:text-sm [&_h2]:text-amber-200">
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>
              {preserveMarkdownBlankLines(body)}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Cerca una voce wiki della campagna ({title}).</p>
        )}
      </div>
    </div>
  );
}
