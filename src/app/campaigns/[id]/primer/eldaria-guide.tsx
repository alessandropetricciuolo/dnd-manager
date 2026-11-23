"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { ArrowLeft, ArrowUpRight, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ELDARIA_CAMPAIGN_ID, type getEldariaGuideSections } from "@/lib/eldaria-welcome";
import { cn } from "@/lib/utils";
import { getHeadingsFromMarkdown } from "@/lib/primer-toc";
import { preserveMarkdownBlankLines } from "@/lib/wiki/content";
import { confirmEldariaGuideRead } from "./eldaria-actions";

const campaignHref = `/campaigns/${ELDARIA_CAMPAIGN_ID}`;
const tabs = [
  { id: "benvenuto", label: "Benvenuto" },
  { id: "wiki", label: "Wiki" },
  { id: "regolamento", label: "Regolamento" },
  { id: "personaggio", label: "Personaggio" },
];

type Article = { id: string; name: string; markdown: string };

type Props = {
  campaignName: string;
  coverUrl: string | null;
  sections: ReturnType<typeof getEldariaGuideSections>;
  articles: Article[];
  canConfirm: boolean;
  confirmed: boolean;
};

function GuideMarkdown({ children }: { children: string }) {
  return (
    <div className={cn(
      "space-y-4 break-words leading-relaxed text-barber-paper/90 print:text-black",
      "[&_h1]:font-serif [&_h1]:text-3xl [&_h1]:text-barber-gold print:[&_h1]:text-black",
      "[&_h2]:scroll-mt-6 [&_h2]:border-b [&_h2]:border-barber-gold/20 [&_h2]:pb-2 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-barber-gold print:[&_h2]:text-black",
      "[&_h3]:scroll-mt-6 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-barber-gold print:[&_h3]:text-black",
      "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-barber-gold [&_a]:underline print:[&_a]:text-black"
    )}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeSlug]}>
        {preserveMarkdownBlankLines(children)}
      </ReactMarkdown>
    </div>
  );
}

export function EldariaGuide({ campaignName, coverUrl, sections, articles, canConfirm, confirmed }: Props) {
  const [selectedArticle, setSelectedArticle] = useState(articles[0]?.id);
  const [hasConfirmed, setHasConfirmed] = useState(confirmed);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const article = articles.find(({ id }) => id === selectedArticle);
  const ruleHeadings = getHeadingsFromMarkdown(sections.rules);

  useEffect(() => {
    document.body.classList.add("primer-print-page");
    return () => document.body.classList.remove("primer-print-page");
  }, []);

  async function handleConfirmation() {
    setPending(true);
    setFailed(false);
    try {
      const result = await confirmEldariaGuideRead();
      setHasConfirmed(result.success);
      setFailed(!result.success);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-dvh bg-guild-void text-barber-paper print:bg-white print:text-black">
      <header className="relative isolate overflow-hidden border-b border-barber-gold/25 print:hidden">
        {coverUrl && (
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 bg-cover bg-center opacity-35"
            style={{ backgroundImage: `url(${JSON.stringify(coverUrl)})` }}
          />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-guild-void via-guild-void/85 to-guild-void/35" />
        <div className="mx-auto max-w-6xl px-4 pb-9 pt-5 sm:px-8 sm:pb-12">
          <Link href={campaignHref} className="inline-flex items-center gap-2 text-sm text-barber-gold hover:underline">
            <ArrowLeft aria-hidden className="size-4" />
            {campaignName}
          </Link>
          <h1 className="mt-7 font-serif text-4xl font-semibold text-barber-gold sm:text-5xl">Inizia qui</h1>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-8">
        <Tabs defaultValue="benvenuto">
          <TabsList aria-label="Guida del Giocatore" className="grid h-auto w-full grid-cols-2 gap-1 rounded-none border-b border-barber-gold/25 bg-transparent px-0 py-2 sm:grid-cols-4 print:hidden">
            {tabs.map(({ id, label }) => (
              <TabsTrigger key={id} value={id} className="min-h-11 border border-transparent text-barber-paper/85 data-[state=active]:border-barber-gold/30 data-[state=active]:bg-barber-gold/10 data-[state=active]:text-barber-gold">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="benvenuto" className="mx-auto max-w-3xl py-7 sm:py-10">
            <h2 className="mb-5 font-serif text-3xl text-barber-gold">Benvenuto in Eldaria</h2>
            {sections.welcome ? (
              <GuideMarkdown>{sections.welcome}</GuideMarkdown>
            ) : (
              <div className="space-y-5 text-base leading-relaxed text-barber-paper/90">
                <p>I tavoli delle Cronache di Eldaria giocano nello stesso mondo. Ogni gruppo ha i propri personaggi e le proprie avventure. Le scelte di un tavolo possono cambiare ciò che gli altri troveranno sulla loro strada. Quando entra un nuovo gruppo, la storia prosegue da dove è arrivata.</p>
                <p>A Portico il Grande Portale Arcano è uno dei nodi del commercio. Per attraversarlo serve un cristallo che si consuma al passaggio. L’Egida dell’Ordine regola il lavoro delle gilde di avventurieri e l’accesso agli incarichi. Barber &amp; Dragons è già in attività a Portico. Scoprirai al tavolo come la sua storia incrocia quella del tuo personaggio.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="wiki" className="py-7 sm:py-10">
            <div className="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-8">
              <nav aria-label="Voci Wiki per iniziare" className="flex flex-col gap-1 md:border-r md:border-barber-gold/20 md:pr-5">
                {articles.map((entry) => (
                  <Button key={entry.id} variant="ghost" type="button" aria-pressed={entry.id === selectedArticle}
                    onClick={() => setSelectedArticle(entry.id)}
                    className="h-auto min-h-11 justify-start whitespace-normal text-left text-barber-paper aria-pressed:bg-barber-gold/10 aria-pressed:text-barber-gold">
                    {entry.name}
                  </Button>
                ))}
                <Link href={`${campaignHref}?tab=wiki`} className="mt-3 inline-flex items-center gap-2 px-3 text-sm text-barber-gold hover:underline">
                  Apri la Wiki della campagna <ArrowUpRight aria-hidden className="size-4" />
                </Link>
              </nav>
              {article ? (
                <section aria-label={article.name} className="min-w-0">
                  {!/^#\s/m.test(article.markdown) && (
                    <h2 className="mb-4 font-serif text-3xl text-barber-gold">{article.name}</h2>
                  )}
                  <GuideMarkdown>{article.markdown}</GuideMarkdown>
                </section>
              ) : (
                <p className="text-sm text-barber-paper/75">Nessuna voce introduttiva disponibile.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="regolamento" className="mx-auto max-w-3xl py-7 sm:py-10">
            <article id="primer-print-area">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-3xl text-barber-gold print:text-black">Regolamento</h2>
                <Button type="button" variant="outline" onClick={() => window.print()} className="gap-2 print:hidden">
                  <Download aria-hidden className="size-4" /> Scarica PDF
                </Button>
              </div>
              {ruleHeadings.length > 0 && (
                <nav aria-label="Indice del regolamento" className="mb-6 flex flex-wrap gap-x-4 gap-y-2 border-b border-barber-gold/20 pb-4 print:hidden">
                  {ruleHeadings.map(({ id, text }) => (
                    <a key={id} href={`#${id}`} className="text-sm text-barber-gold hover:underline">{text}</a>
                  ))}
                </nav>
              )}
              <GuideMarkdown>{sections.rules}</GuideMarkdown>
            </article>
          </TabsContent>

          <TabsContent value="personaggio" className="mx-auto max-w-3xl py-7 sm:py-10">
            <h2 className="mb-5 font-serif text-3xl text-barber-gold">Prepara il tuo personaggio</h2>
            <div className="space-y-5 text-base leading-relaxed text-barber-paper/90">
              <p>Che vita faceva il tuo personaggio prima di diventare un avventuriero? Che cosa gli ha fatto cambiare strada e che cosa cerca adesso? Se c’è una persona o un luogo a cui tiene ancora, racconta perché.</p>
              <p>Consegna il background di persona ad Alessandro. Lo rivedrete insieme e lui caricherà la versione concordata quando creerà la scheda del tuo personaggio sul sito.</p>
            </div>
          </TabsContent>
        </Tabs>

        {canConfirm && (
          <footer className="flex flex-col items-start gap-3 border-t border-barber-gold/25 pt-5 sm:items-end print:hidden">
            {hasConfirmed ? (
              <p className="flex items-center gap-2 text-sm text-barber-gold" role="status">
                <Check aria-hidden className="size-4" />
                Lettura confermata
              </p>
            ) : (
              <Button type="button" disabled={pending} onClick={handleConfirmation} className="min-h-11 bg-barber-gold text-barber-dark hover:bg-barber-gold/90">
                {pending ? "Salvataggio…" : "Ho letto la guida"}
              </Button>
            )}
            {failed && <p role="alert" className="text-sm text-red-200">Non è stato possibile salvare la conferma. Riprova.</p>}
          </footer>
        )}
      </div>
    </main>
  );
}
