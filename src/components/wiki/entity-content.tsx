import ReactMarkdown from "react-markdown";

type EntityContentProps = {
  content: string;
};

export function EntityContent({ content }: EntityContentProps) {
  if (!content.trim()) {
    return (
      <p className="text-slate-400 italic">Nessun contenuto.</p>
    );
  }

  return (
    <div className="prose prose-invert prose-slate max-w-none prose-headings:text-emerald-200 prose-a:text-emerald-400 prose-strong:text-slate-100">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
