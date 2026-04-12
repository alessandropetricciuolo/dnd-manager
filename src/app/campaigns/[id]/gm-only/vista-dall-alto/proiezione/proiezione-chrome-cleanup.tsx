"use client";

import { useEffect } from "react";

/** Aggiunge una classe su <html> per nascondere cookie iubenda e co. durante la proiezione. */
export function ProiezioneChromeCleanup() {
  useEffect(() => {
    document.documentElement.classList.add("vista-proiezione-fullscreen");
    return () => {
      document.documentElement.classList.remove("vista-proiezione-fullscreen");
    };
  }, []);
  return null;
}
