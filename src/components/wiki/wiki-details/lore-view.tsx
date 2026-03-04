"use client";

import { useState } from "react";
import { EntityContent } from "../entity-content";
import { ChevronDown, ChevronUp } from "lucide-react";

type LoreAttributes = { is_chapter?: boolean; summary?: string };

type LoreViewProps = {
  name: string;
  body: string;
  attributes: LoreAttributes | null;
  sortOrder: number | null;
};

export function LoreView({ name, body, attributes, sortOrder }: LoreViewProps) {
  const summary = attributes?.summary?.trim();
  const isChapter = attributes?.is_chapter ?? (sortOrder != null && sortOrder > 0);
  const [summaryOpen, setSummaryOpen] = useState(false);

  return (
    <div className="mx-auto max-w-[65ch] font-serif">
      {isChapter && sortOrder != null && sortOrder > 0 && (
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-barber-gold">
          Capitolo {sortOrder}
        </p>
      )}
      <h1 className="mb-8 text-3xl font-bold leading-tight text-barber-paper md:text-4xl">
        {name}
      </h1>

      {summary && (
        <div className="mb-8 rounded-lg border border-barber-gold/40 bg-barber-dark/80">
          <button
            type="button"
            onClick={() => setSummaryOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-barber-gold"
          >
            Riassunto
            {summaryOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
          </button>
          {summaryOpen && (
            <div className="border-t border-barber-gold/30 px-4 py-3 text-barber-paper/80">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{summary}</p>
            </div>
          )}
        </div>
      )}

      <div className="prose prose-invert max-w-none text-barber-paper/90 prose-headings:text-barber-gold prose-p:leading-relaxed prose-p:first-letter:float-left prose-p:first-letter:mr-2 prose-p:first-letter:text-4xl prose-p:first-letter:font-serif">
        {body ? (
          <EntityContent content={body} />
        ) : (
          <p className="text-barber-paper/60 italic">Nessun testo.</p>
        )}
      </div>
    </div>
  );
}
