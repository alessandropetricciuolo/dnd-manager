"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook client-side: interroga `/api/ai/image-providers` per sapere quali provider
 * di generazione immagini sono configurati lato server, e mantiene la scelta
 * dell'utente in `localStorage` (persistente tra sessioni/pagine).
 *
 * La chiave di storage è intenzionalmente neutra (`bd.aiImageProvider`) per non
 * cozzare con altre preferenze future.
 */

export type ImageProviderId = "huggingface" | "siliconflow";

export type ImageProviderDescriptor = {
  id: ImageProviderId;
  label: string;
  available: boolean;
  model: string;
};

type ProvidersResponse = {
  default: ImageProviderId;
  providers: ImageProviderDescriptor[];
};

const STORAGE_KEY = "bd.aiImageProvider";
const VALID_IDS: readonly ImageProviderId[] = ["huggingface", "siliconflow"];

function isValidProvider(v: unknown): v is ImageProviderId {
  return typeof v === "string" && (VALID_IDS as readonly string[]).includes(v);
}

function readStoredProvider(): ImageProviderId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isValidProvider(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeStoredProvider(p: ImageProviderId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, p);
  } catch {
    /** Storage non disponibile (Safari privato, quota): ignoriamo. */
  }
}

export type UseAiImageProviderResult = {
  /** Provider attualmente scelto (preferenza utente, con fallback al default server). */
  provider: ImageProviderId;
  /** Cambia il provider e lo persiste in `localStorage`. */
  setProvider: (next: ImageProviderId) => void;
  /** Elenco provider disponibili (con availability basata sulle chiavi server). */
  providers: ImageProviderDescriptor[];
  /** Default server-side (da `AI_IMAGE_PROVIDER`). */
  serverDefault: ImageProviderId;
  loading: boolean;
  error: string | null;
};

export function useAiImageProvider(): UseAiImageProviderResult {
  const [provider, setProviderState] = useState<ImageProviderId>("huggingface");
  const [providers, setProviders] = useState<ImageProviderDescriptor[]>([]);
  const [serverDefault, setServerDefault] = useState<ImageProviderId>("huggingface");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/ai/image-providers", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ProvidersResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setProviders(data.providers ?? []);
        const srvDefault = isValidProvider(data.default) ? data.default : "huggingface";
        setServerDefault(srvDefault);

        const stored = readStoredProvider();
        const availability = new Map(
          (data.providers ?? []).map((p) => [p.id, p.available] as const)
        );

        /** Preferenza utente, solo se ancora disponibile. */
        if (stored && availability.get(stored) === true) {
          setProviderState(stored);
          return;
        }
        /** Altrimenti default server, se disponibile. */
        if (availability.get(srvDefault) === true) {
          setProviderState(srvDefault);
          return;
        }
        /** Ultimo fallback: primo provider disponibile, altrimenti default server. */
        const firstAvailable = (data.providers ?? []).find((p) => p.available);
        setProviderState(firstAvailable?.id ?? srvDefault);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setProvider = useCallback((next: ImageProviderId) => {
    setProviderState(next);
    writeStoredProvider(next);
  }, []);

  return { provider, setProvider, providers, serverDefault, loading, error };
}
