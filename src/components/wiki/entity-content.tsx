import ReactMarkdown from "react-markdown";
import { preserveMarkdownBlankLines } from "@/lib/wiki/content";

type EntityContentProps = {
  content: string;
};

export function EntityContent({ content }: EntityContentProps) {
  if (!content.trim()) {
    return (
      <p className="text-barber-paper/60 italic">Nessun contenuto.</p>
    );
  }

  const markdown = preserveMarkdownBlankLines(content);

  return (
    <div className="prose prose-invert max-w-none min-w-0 overflow-hidden break-words prose-headings:text-barber-gold prose-headings:break-words prose-a:text-barber-gold prose-strong:text-barber-paper prose-p:text-barber-paper/90 prose-p:break-words">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
