"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import type { DenseRulesDoc } from "@/lib/manuals/dense-rules-parser";
import { preserveMarkdownBlankLines } from "@/lib/wiki/content";
import { cn } from "@/lib/utils";

type FiveeRulesViewProps = {
  doc: DenseRulesDoc;
  className?: string;
};

export function FiveeRulesView({ doc, className }: FiveeRulesViewProps) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  if (!doc.sections.length) {
    return <p className="text-[11px] text-zinc-500">Nessun contenuto regola.</p>;
  }

  return (
    <div className={cn("fivee-ref space-y-3 text-[11px] leading-snug text-zinc-200", className)}>
      {doc.sections.map((section, idx) => {
        const isCollapsed = collapsed[idx] === true;
        return (
          <section key={`${section.title}-${idx}`}>
            <div className="flex items-baseline justify-between gap-2 border-b border-amber-700/45 pb-0.5">
              <h2 className="font-[family-name:var(--font-serif)] text-[1.05rem] font-bold uppercase leading-none tracking-wide text-amber-300">
                {section.title}
              </h2>
              <div className="flex shrink-0 items-center gap-1.5">
                {doc.sourceLabel ? (
                  <span className="text-[10px] text-rose-300/80">{doc.sourceLabel}</span>
                ) : null}
                <button
                  type="button"
                  className="text-[10px] text-zinc-500 hover:text-amber-200"
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [idx]: !isCollapsed }))
                  }
                  title={isCollapsed ? "Espandi" : "Comprimi"}
                >
                  [{isCollapsed ? "+" : "−"}]
                </button>
              </div>
            </div>
            {!isCollapsed ? (
              <div className="prose-invert mt-1.5 max-w-none space-y-1.5 [&_p]:my-1 [&_p]:text-[11px] [&_p]:leading-snug [&_li]:text-[11px] [&_table]:w-full [&_table]:text-[10px] [&_th]:border [&_th]:border-zinc-700 [&_th]:px-1 [&_th]:py-0.5 [&_th]:text-amber-200/90 [&_td]:border [&_td]:border-zinc-800 [&_td]:px-1 [&_td]:py-0.5">
                <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>
                  {preserveMarkdownBlankLines(section.bodyMarkdown)}
                </ReactMarkdown>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
