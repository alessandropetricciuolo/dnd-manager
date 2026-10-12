"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const GmScreenViewActive = createContext(true);

export function useGmScreenViewActive() {
  return useContext(GmScreenViewActive);
}

/** Mount on first visit, retain drafts, suspend background combat work. */
export function GmScreenView({ active, children }: { active: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(active);
  useEffect(() => {
    if (active) setVisited(true);
  }, [active]);
  return (
    <GmScreenViewActive.Provider value={active}>
      <div className={active ? "h-full w-full" : "hidden"}>
        {active || visited ? children : null}
      </div>
    </GmScreenViewActive.Provider>
  );
}
