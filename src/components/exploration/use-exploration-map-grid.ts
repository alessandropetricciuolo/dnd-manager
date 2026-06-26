"use client";

import { useCallback, useMemo, useState } from "react";
import {
  resolveExplorationMapGridOverlay,
  type ExplorationMapGridInput,
} from "@/lib/exploration/exploration-map-grid";

type Options = {
  /** Se false, nasconde sempre la griglia (es. proiezione tavolo). */
  enabled?: boolean;
};

/**
 * Calcola overlay griglia per ExplorationMapStage; aggiorna dopo onImageSized.
 */
export function useExplorationMapGrid(map: ExplorationMapGridInput | null, options?: Options) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const onImageSized = useCallback((w: number, h: number) => {
    setNatural((prev) => (prev?.w === w && prev?.h === h ? prev : { w, h }));
  }, []);

  const overlay = useMemo(() => {
    if (!map) {
      return {
        showGrid: false,
        gridCellSourcePxX: null,
        gridOffsetXCells: 0,
        gridOffsetYCells: 0,
      };
    }
    return resolveExplorationMapGridOverlay(
      map,
      natural?.w ?? 0,
      natural?.h ?? 0,
      { enabled: options?.enabled }
    );
  }, [map, natural, options?.enabled]);

  return { ...overlay, onImageSized };
}
