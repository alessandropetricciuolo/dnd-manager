"use client";

import { useState, useCallback, KeyboardEvent } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type TagsInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function TagsInput({
  value,
  onChange,
  placeholder = "Digita un tag e premi Invio o virgola",
  disabled,
  id = "tags-input",
  className,
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = useCallback(
    (tag: string) => {
      const t = tag.trim().toLowerCase();
      if (!t || value.includes(t)) return;
      onChange([...value, t]);
      setInputValue("");
    },
    [value, onChange]
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  function handleBlur() {
    if (inputValue.trim()) addTag(inputValue);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-barber-paper/90">
        Tag
      </Label>
      <div className="flex flex-wrap gap-2 rounded-md border border-barber-gold/30 bg-barber-dark/80 p-2 min-h-[42px]">
        {value.map((tag, i) => (
          <Badge
            key={`${tag}-${i}`}
            variant="secondary"
            className="bg-barber-gold/20 text-barber-gold border border-barber-gold/40 hover:bg-barber-gold/30 gap-1 pr-1"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="rounded-full p-0.5 hover:bg-barber-gold/40"
                aria-label={`Rimuovi ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        <Input
          id={id}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={disabled}
          className="flex-1 min-w-[140px] border-0 bg-transparent shadow-none focus-visible:ring-0 text-barber-paper placeholder:text-barber-paper/50"
        />
      </div>
      <input type="hidden" name="tags" value={JSON.stringify(value)} readOnly />
    </div>
  );
}
