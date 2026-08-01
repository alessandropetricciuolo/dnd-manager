"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { GmPanelType, GmWorkspaceMode } from "./types";

export type OpenMonsterStatOptions = {
  entityId?: string;
  name?: string;
  bestiaryChunkId?: string;
  title?: string;
};

export type GmScreenBoardActions = {
  campaignId: string;
  currentUserId: string;
  campaignType?: "oneshot" | "quest" | "long" | "torneo" | null;
  selectedSessionId?: string | null;
  mode: GmWorkspaceMode;
  addPanel: (type: GmPanelType, opts?: { title?: string; props?: Record<string, unknown> }) => void;
  removePanel: (panelId: string) => void;
  renamePanel: (panelId: string, title: string) => void;
  openMonsterStat: (opts: OpenMonsterStatOptions) => void;
  openWikiEntity: (entityId: string, title?: string) => void;
  openRulesLookup: (query?: string) => void;
  resetLayout: () => void;
  openMapsSheet: () => void;
  openFowSheet: () => void;
  openGallerySheet: () => void;
  openWhispersSheet: () => void;
  openAudioSheet: () => void;
};

const GmScreenBoardContext = createContext<GmScreenBoardActions | null>(null);

export function GmScreenBoardProvider({
  value,
  children,
}: {
  value: GmScreenBoardActions;
  children: ReactNode;
}) {
  return <GmScreenBoardContext.Provider value={value}>{children}</GmScreenBoardContext.Provider>;
}

export function useGmScreenBoard(): GmScreenBoardActions {
  const ctx = useContext(GmScreenBoardContext);
  if (!ctx) {
    throw new Error("useGmScreenBoard must be used within GmScreenBoardProvider");
  }
  return ctx;
}

export function useGmScreenBoardOptional(): GmScreenBoardActions | null {
  return useContext(GmScreenBoardContext);
}
