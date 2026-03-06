"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

export type CompressedImageUploadProps = {
  name: string;
  label: string;
  required?: boolean;
  /** URL per anteprima iniziale (es. immagine esistente in modifica). */
  previewUrl?: string | null;
  /** ClassName per il wrapper. */
  className?: string;
  /** Disabilitato (es. durante submit). */
  disabled?: boolean;
  /** accept per l'input (default: immagini). */
  accept?: string;
  /** Testo sotto l'input. */
  hint?: string;
};

export function CompressedImageUpload({
  name,
  label,
  required = false,
  previewUrl: initialPreviewUrl,
  className,
  disabled = false,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  hint,
}: CompressedImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** Anteprima locale dopo compressione (blob URL). */
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const displayPreview = localPreview ?? initialPreviewUrl ?? null;

  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        setLocalPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Seleziona un file immagine (JPG, PNG, WebP, GIF).");
        e.target.value = "";
        return;
      }

      setIsCompressing(true);
      try {
        const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
        const dt = new DataTransfer();
        dt.items.add(
          new File([compressed], compressed.name.replace(/\.[^.]+$/i, ".webp"), {
            type: "image/webp",
          })
        );
        if (inputRef.current) {
          inputRef.current.files = dt.files;
        }
        setLocalPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(compressed);
        });
      } catch (err) {
        console.error("[CompressedImageUpload]", err);
        toast.error("Compressione fallita. Prova con un'immagine più piccola.");
        e.target.value = "";
        setLocalPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      } finally {
        setIsCompressing(false);
      }
    },
    []
  );

  const triggerInput = () => {
    if (disabled || isCompressing) return;
    inputRef.current?.click();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-400"> *</span>}
      </Label>
      <input
        ref={inputRef}
        id={name}
        type="file"
        name={name}
        accept={accept}
        required={required}
        disabled={disabled}
        className="sr-only"
        aria-hidden
        onChange={handleImageChange}
      />
      <Button
        type="button"
        variant="outline"
        onClick={triggerInput}
        disabled={disabled || isCompressing}
        className="w-full justify-center gap-2 border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold"
      >
        <Upload className="h-4 w-4" />
        {isCompressing ? "Compressione in corso..." : "Scegli immagine (verrà compressa)"}
      </Button>
      {displayPreview && (
        <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-lg border border-barber-gold/30 bg-barber-dark">
          <Image
            src={displayPreview}
            alt="Anteprima"
            fill
            className="object-contain"
            unoptimized={displayPreview.startsWith("blob:")}
          />
        </div>
      )}
      {hint && <p className="text-xs text-barber-paper/60">{hint}</p>}
    </div>
  );
}
