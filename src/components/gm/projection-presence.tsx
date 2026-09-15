"use client";

import { useEffect, useState } from "react";

const HEARTBEAT_MS = 1_000;
const STALE_AFTER_MS = 3_500;

type ProjectionPresencePayload = {
  ids: string[];
  updatedAt: number;
  owner: string;
};

function storageKey(campaignId: string): string {
  return `gm-gallery-projection:${campaignId}`;
}

function readPresence(campaignId: string): ProjectionPresencePayload | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(storageKey(campaignId)) ?? "null",
    ) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const payload = parsed as Partial<ProjectionPresencePayload>;
    if (
      !Array.isArray(payload.ids) ||
      !payload.ids.every((id) => typeof id === "string")
    )
      return null;
    if (
      typeof payload.updatedAt !== "number" ||
      typeof payload.owner !== "string"
    )
      return null;
    return payload as ProjectionPresencePayload;
  } catch {
    return null;
  }
}

/** Keeps the GM window informed while this projection page is actually open. */
export function ProjectionPresence({
  campaignId,
  itemIds,
}: {
  campaignId: string;
  itemIds: string[];
}) {
  useEffect(() => {
    const owner = crypto.randomUUID();
    const publish = () => {
      localStorage.setItem(
        storageKey(campaignId),
        JSON.stringify({ ids: itemIds, updatedAt: Date.now(), owner }),
      );
    };
    const clear = () => {
      if (readPresence(campaignId)?.owner === owner)
        localStorage.removeItem(storageKey(campaignId));
    };

    publish();
    const interval = window.setInterval(publish, HEARTBEAT_MS);
    window.addEventListener("pagehide", clear);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", clear);
      clear();
    };
  }, [campaignId, itemIds]);

  return null;
}

/** Returns the image ids confirmed by a recent heartbeat from the projection window. */
export function useProjectedImageIds(campaignId: string): Set<string> {
  const [projectedIds, setProjectedIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const refresh = () => {
      const presence = readPresence(campaignId);
      const ids =
        presence && Date.now() - presence.updatedAt <= STALE_AFTER_MS
          ? presence.ids
          : [];
      setProjectedIds((current) => {
        if (current.size === ids.length && ids.every((id) => current.has(id)))
          return current;
        return new Set(ids);
      });
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey(campaignId)) refresh();
    };
    refresh();
    const interval = window.setInterval(refresh, HEARTBEAT_MS);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, [campaignId]);

  return projectedIds;
}
