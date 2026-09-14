import { barberDragonsAdapter } from "./barber-dragons.adapter";

/** Punto di accesso all'adapter applicativo di Barber & Dragons. */
export function getTenantAdapter() {
  return barberDragonsAdapter;
}

export type { TenantAdapter, CommandCenterAuthContext } from "./types";
