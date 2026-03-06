"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Upload, Link2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CompressedImageUpload } from "@/components/ui/compressed-image-upload";
import { normalizeImageUrl, isValidImageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

export type ImageSourceMode = "file" | "url";

export type ImageSourceFieldProps = {
  /** Nome dell'input file (es. "image" o "file"). */
  fileInputName: string;
  /** Nome del campo FormData per l'URL (es. "image_url"). Usato quando modalità URL. */
  urlFieldName?: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  /** Anteprima iniziale (modifica). */
  previewUrl?: string | null;
  className?: string;
  /** Per PG avatar: aspect ratio diverso. */
  previewClassName?: string;
};

export function ImageSourceField({
  fileInputName,
  urlFieldName = "image_url",
  label,
  required = false,
  disabled = false,
  hint,
  previewUrl: initialPreviewUrl,
  className,
  previewClassName,
}: ImageSourceFieldProps) {
  const [mode, setMode] = useState<ImageSourceMode>("file");
  const [urlValue, setUrlValue] = useState("");
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const displayPreview = resolvedUrl ?? initialPreviewUrl ?? null;

  useEffect(() => {
    if (mode === "url" && urlValue.trim()) {
      const normalized = normalizeImageUrl(urlValue);
      if (isValidImageUrl(normalized)) {
        setResolvedUrl(normalized);
        setUrlError(null);
      } else {
        setResolvedUrl(null);
        setUrlError(isValidImageUrl(urlValue.trim()) ? null : "Inserisci un URL valido (es. https://...)");
      }
    } else {
      setResolvedUrl(null);
      setUrlError(null);
    }
  }, [mode, urlValue]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlValue(e.target.value);
  };

  const handleUrlBlur = () => {
    if (urlValue.trim()) {
      const normalized = normalizeImageUrl(urlValue);
      setUrlValue(normalized);
      if (isValidImageUrl(normalized)) setResolvedUrl(normalized);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {label}
        {required && <span className="text-red-400"> *</span>}
      </Label>
      <Tabs
        value={mode}
        onValueChange={(v) => {
          setMode(v as ImageSourceMode);
          if (v === "file") {
            setUrlValue("");
            setResolvedUrl(null);
            setUrlError(null);
          }
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 border border-barber-gold/40 bg-barber-dark/90 p-1">
          <TabsTrigger
            value="file"
            className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold"
          >
            <Upload className="mr-2 h-4 w-4" />
            Carica file
          </TabsTrigger>
          <TabsTrigger
            value="url"
            className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold"
          >
            <Link2 className="mr-2 h-4 w-4" />
            Incolla URL
          </TabsTrigger>
        </TabsList>
        <TabsContent value="file" className="mt-2">
          {mode === "file" && (
            <CompressedImageUpload
              name={fileInputName}
              label=""
              required={required}
              disabled={disabled}
              hint={hint}
              previewUrl={initialPreviewUrl}
              className="[&_label]:sr-only [&_label]:mb-0"
            />
          )}
        </TabsContent>
        <TabsContent value="url" className="mt-2 space-y-2">
          <input type="hidden" name={urlFieldName} value={resolvedUrl ?? ""} readOnly />
          <Input
            ref={urlInputRef}
            type="url"
            placeholder="https://... o link Google Drive"
            value={urlValue}
            onChange={handleUrlChange}
            onBlur={handleUrlBlur}
            disabled={disabled}
            className="bg-barber-dark border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
            aria-invalid={!!urlError}
          />
          {urlError && <p className="text-xs text-red-400">{urlError}</p>}
          {hint && mode === "url" && (
            <p className="text-xs text-barber-paper/60">
              I link Google Drive vengono convertiti in formato visualizzabile.
            </p>
          )}
          {displayPreview && mode === "url" && (
            <div
              className={cn(
                "relative mt-2 w-full overflow-hidden rounded-lg border border-barber-gold/30 bg-barber-dark aspect-video",
                previewClassName
              )}
            >
              <Image
                src={displayPreview}
                alt="Anteprima"
                fill
                className="object-contain"
                unoptimized
                onError={() => setResolvedUrl(null)}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
