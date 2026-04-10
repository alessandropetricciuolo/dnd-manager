"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSlug from "rehype-slug";
import { Download, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getHeadingsFromMarkdown, type TocEntry } from "@/lib/primer-toc";
import { preserveMarkdownBlankLines } from "@/lib/wiki/content";
import { cn } from "@/lib/utils";

const BODY_CLASS = "primer-print-page";

export type PrimerTypographyProp = {
  fontSize?: "small" | "medium" | "large";
  fontFamily?: "serif" | "sans";
};

type PrimerViewProps = {
  campaignId: string;
  campaignName: string;
  markdown: string;
  typography?: PrimerTypographyProp | null;
};

function TocList({ entries, onNavigate }: { entries: TocEntry[]; onNavigate?: () => void }) {
  if (!entries.length) return null;

  return (
    <nav className="flex flex-col gap-1" aria-label="Indice">
      {entries.map(({ level, text, id }) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={onNavigate}
          className={cn(
            "rounded-md py-1.5 pr-2 text-sm text-barber-paper/80 hover:bg-barber-gold/10 hover:text-barber-gold transition-colors truncate",
            level === 1 && "font-semibold text-barber-gold/90",
            level === 2 && "pl-2",
            level === 3 && "pl-4",
            level >= 4 && "pl-6"
          )}
        >
          {text}
        </a>
      ))}
    </nav>
  );
}

export function PrimerView({ campaignId, campaignName, markdown, typography }: PrimerViewProps) {
  const tocEntries = useMemo(() => getHeadingsFromMarkdown(markdown), [markdown]);
  const [tocSheetOpen, setTocSheetOpen] = useState(false);
  const markdownWithSpacing = useMemo(() => preserveMarkdownBlankLines(markdown), [markdown]);

  const fontSizeClass =
    typography?.fontSize === "small"
      ? "prose-sm"
      : typography?.fontSize === "large"
        ? "prose-lg"
        : "";
  const fontFamilyClass =
    typography?.fontFamily === "sans" ? "font-sans" : "font-serif";

  useEffect(() => {
    document.body.classList.add(BODY_CLASS);
    return () => document.body.classList.remove(BODY_CLASS);
  }, []);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-barber-dark flex flex-col">
      {/* Toolbar: visibile a schermo, nascosto in stampa */}
      <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-barber-gold/20 bg-barber-dark/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/campaigns/${campaignId}`}
            className="text-sm font-medium text-barber-gold hover:text-barber-gold/80 shrink-0"
          >
            ← Torna alla campagna
          </Link>
          {/* Mobile: Indice in sheet */}
          {tocEntries.length > 0 && (
            <Sheet open={tocSheetOpen} onOpenChange={setTocSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10 md:hidden"
                >
                  <List className="h-4 w-4 mr-1.5" />
                  Indice
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] border-barber-gold/20 bg-barber-dark overflow-y-auto"
              >
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-barber-gold/80">
                  Indice
                </p>
                <TocList entries={tocEntries} onNavigate={() => setTocSheetOpen(false)} />
              </SheetContent>
            </Sheet>
          )}
        </div>
        <Button
          type="button"
          onClick={handlePrint}
          className="gap-2 shrink-0 bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
        >
          <Download className="h-4 w-4" />
          <span className="hidden xs:inline">Scarica PDF</span>
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar TOC: desktop only, sticky */}
        {tocEntries.length > 0 && (
          <aside
            className="no-print hidden w-56 shrink-0 border-r border-barber-gold/20 bg-barber-dark/50 md:block overflow-y-auto"
            aria-label="Indice"
          >
            <div className="sticky top-20 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-barber-gold/80">
                Indice
              </p>
              <TocList entries={tocEntries} />
            </div>
          </aside>
        )}

        {/* Area principale: Markdown con stile Dark Fantasy / manuale */}
        <main
          id="primer-print-area"
          className="flex-1 min-w-0 overflow-y-auto px-4 py-8 md:px-8 lg:px-12 print:overflow-visible"
        >
          <div className="mx-auto max-w-3xl">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-barber-gold md:text-4xl print:!text-gray-900">
              {campaignName}
            </h1>
            <p className="mt-1 text-sm text-barber-paper/70 print:!text-gray-600 mb-8">
              Guida del Giocatore
            </p>

            <div
              className={cn(
                "prose prose-invert max-w-none space-y-4",
                fontSizeClass,
                fontFamilyClass,
                typography?.fontFamily === "sans"
                  ? "prose-headings:font-sans"
                  : "prose-headings:font-serif",
                "prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-barber-gold prose-headings:break-words",
                "prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-2xl prose-h2:border-b prose-h2:border-barber-gold/30 prose-h2:pb-2",
                "prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-xl",
                "prose-h4:mt-6 prose-h4:mb-2 prose-h4:text-lg",
                "prose-p:text-barber-paper/90 prose-p:leading-relaxed prose-p:break-words",
                "prose-a:text-barber-gold prose-a:no-underline hover:prose-a:underline",
                "prose-strong:text-barber-paper",
                "prose-ul:text-barber-paper/90 prose-ol:text-barber-paper/90",
                "prose-blockquote:border-l-4 prose-blockquote:border-barber-gold/50 prose-blockquote:bg-barber-dark/70 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-barber-paper/90 prose-blockquote:shadow-inner",
                "print:prose-headings:!text-gray-900 print:prose-p:!text-gray-800 print:prose-strong:!text-gray-900 print:prose-a:!text-gray-800 print:prose-blockquote:!bg-gray-100 print:prose-blockquote:!border-gray-400 print:prose-blockquote:!text-gray-800"
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeSlug]}>
                {markdownWithSpacing}
              </ReactMarkdown>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
