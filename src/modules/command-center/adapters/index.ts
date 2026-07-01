import { barberDragonsAdapter } from "./barber-dragons.adapter";

/** Punto di swap per gmflow (futuro: gmflowAdapter). */
export function getTenantAdapter() {
  return barberDragonsAdapter;
}

export type { TenantAdapter, CommandCenterAuthContext } from "./types";
