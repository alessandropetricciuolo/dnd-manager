"use client";

import { Label } from "@/components/ui/label";
import {
  useAiImageProvider,
  type ImageProviderId,
} from "@/lib/hooks/use-ai-image-provider";

type AiImageProviderSelectProps = {
  /** Id HTML dell'input (per il `<Label htmlFor>`). */
  id?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Se passato, il componente diventa "controlled" dal parent (utile quando il
   * parent vuole inviare il valore a una server action). Se omesso usa lo stato
   * interno di {@link useAiImageProvider}.
   */
  value?: ImageProviderId;
  onChange?: (next: ImageProviderId) => void;
};

/**
 * Piccolo `<select>` coerente con lo stile degli altri select del progetto,
 * che mostra HF / Gemini e disabilita i provider non configurati lato server.
 */
export function AiImageProviderSelect(props: AiImageProviderSelectProps) {
  const { id = "ai-image-provider", label = "Provider immagine", disabled, className } = props;
  const { provider, setProvider, providers, loading } = useAiImageProvider();

  const effectiveValue = props.value ?? provider;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as ImageProviderId;
    if (props.onChange) props.onChange(next);
    else setProvider(next);
  }

  const noneConfigured = !loading && providers.every((p) => !p.available);

  return (
    <div className={className}>
      <Label htmlFor={id} className="text-xs text-barber-paper/80">
        {label}
      </Label>
      <select
        id={id}
        value={effectiveValue}
        onChange={handleChange}
        disabled={disabled || loading}
        className="mt-1 flex h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-1.5 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && <option value={effectiveValue}>Caricamento…</option>}
        {!loading &&
          providers.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.available}>
              {p.label}
              {p.available ? "" : " — non configurato"}
            </option>
          ))}
      </select>
      {noneConfigured && (
        <p className="mt-1 text-xs text-amber-300/90">
          Nessun provider immagine configurato sul server. Imposta{" "}
          <code className="rounded bg-black/40 px-1">HUGGINGFACE_API_KEY</code> o{" "}
          <code className="rounded bg-black/40 px-1">GEMINI_API_KEY</code>.
        </p>
      )}
    </div>
  );
}
