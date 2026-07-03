"use client";

import { useCallback, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateNameSuggestionsAction } from "@/lib/actions/name-generator-actions";
import { generateLocalNameSuggestions } from "@/lib/name-generator/local-names";
import {
  NAME_GENERATOR_KIND_LABELS,
  type NameGeneratorKind,
} from "@/lib/name-generator/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  kind: NameGeneratorKind;
  campaignId?: string;
  label?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  /** Contesto opzionale per suggerimenti IA (es. descrizione bozza). */
  hint?: string;
};

export function NameGeneratorField({
  id,
  name,
  value,
  onChange,
  kind,
  campaignId,
  label = "Nome",
  placeholder,
  required,
  disabled,
  className,
  inputClassName,
  hint,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  const refreshSuggestions = useCallback(async () => {
    if (disabled) return;
    setLoading(true);
    setSelectedSuggestion(null);

    const instant = generateLocalNameSuggestions(kind, 4);
    setSuggestions(instant);

    try {
      const result = await generateNameSuggestionsAction({
        kind,
        count: 6,
        campaignId,
        hint,
      });
      if (result.success && result.names.length > 0) {
        setSuggestions(result.names);
      }
    } catch {
      toast.error("Suggerimenti IA non disponibili; mostro nomi locali.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, disabled, hint, kind]);

  const selectSuggestion = (nameSuggestion: string) => {
    onChange(nameSuggestion);
    setSelectedSuggestion(nameSuggestion);
  };

  const kindLabel = NAME_GENERATOR_KIND_LABELS[kind];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 border-barber-gold/30 px-2 text-xs text-barber-gold hover:bg-barber-gold/10"
          disabled={disabled || loading}
          onClick={() => void refreshSuggestions()}
        >
          {loading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : suggestions.length > 0 ? (
            <RefreshCw className="mr-1 h-3 w-3" />
          ) : (
            <Sparkles className="mr-1 h-3 w-3" />
          )}
          {suggestions.length > 0 ? "Altri nomi" : "Genera nomi"}
        </Button>
      </div>

      <Input
        id={id}
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setSelectedSuggestion(null);
        }}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={inputClassName}
      />

      {suggestions.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-barber-paper/50">
            Suggerimenti {kindLabel} — clic per usare
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => {
              const active =
                selectedSuggestion === suggestion ||
                (value.trim() !== "" && value.trim() === suggestion);
              return (
                <button
                  key={suggestion}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectSuggestion(suggestion)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    active
                      ? "border-barber-gold bg-barber-gold/20 text-barber-gold"
                      : "border-barber-gold/25 bg-barber-dark/80 text-barber-paper/80 hover:border-barber-gold/50 hover:bg-barber-gold/10"
                  )}
                >
                  {suggestion}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
