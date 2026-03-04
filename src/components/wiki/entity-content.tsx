import ReactMarkdown from "react-markdown";

type EntityContentProps = {
  content: string;
};

export function EntityContent({ content }: EntityContentProps) {
  if (!content.trim()) {
    return (
      <p className="text-barber-paper/60 italic">Nessun contenuto.</p>
    );
  }

  return (
    <div className="prose prose-invert max-w-none prose-headings:text-barber-gold prose-a:text-barber-gold prose-strong:text-barber-paper prose-p:text-barber-paper/90">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
