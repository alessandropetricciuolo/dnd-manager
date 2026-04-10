import ReactMarkdown from "react-markdown";
import { useMemo } from "react";
import remarkBreaks from "remark-breaks";
import { preserveMarkdownBlankLines } from "@/lib/wiki/content";

type EntityContentProps = {
  content: string;
};

export function EntityContent({ content }: EntityContentProps) {
  const markdown = useMemo(() => preserveMarkdownBlankLines(content), [content]);

  if (!content.trim()) {
    return (
      <p className="text-barber-paper/60 italic">Nessun contenuto.</p>
    );
  }

  return (
    <div className="max-w-none min-w-0 space-y-4 overflow-hidden break-words text-barber-paper/90 [&_a]:text-barber-gold [&_a]:underline-offset-2 hover:[&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-barber-gold/40 [&_blockquote]:pl-4 [&_h1]:break-words [&_h1]:text-barber-gold [&_h2]:break-words [&_h2]:text-barber-gold [&_h3]:break-words [&_h3]:text-barber-gold [&_li]:marker:text-barber-gold/80 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:text-barber-paper [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{markdown}</ReactMarkdown>
    </div>
  );
}
