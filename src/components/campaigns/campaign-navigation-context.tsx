"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type CampaignNavigationState = {
  campaignName: string;
  sectionLabel: string;
};

type CampaignNavigationContextValue = {
  navigation: CampaignNavigationState | null;
  setNavigation: (navigation: CampaignNavigationState | null) => void;
};

const CampaignNavigationContext = createContext<CampaignNavigationContextValue | null>(null);

export function CampaignNavigationProvider({ children }: { children: React.ReactNode }) {
  const [navigation, setNavigation] = useState<CampaignNavigationState | null>(null);
  const value = useMemo(() => ({ navigation, setNavigation }), [navigation]);
  return (
    <CampaignNavigationContext.Provider value={value}>
      {children}
    </CampaignNavigationContext.Provider>
  );
}

export function useCampaignNavigation() {
  const context = useContext(CampaignNavigationContext);
  if (!context) throw new Error("useCampaignNavigation must be used inside CampaignNavigationProvider");
  return context;
}
