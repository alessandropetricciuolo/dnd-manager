/** Nebbia semi-trasparente in modalità explore GM. */
export const FOG_FILL_GM = "rgba(8, 6, 4, 0.82)";

/** Nebbia opaca in proiezione tavolo (nessuna mappa visibile sotto). */
export const FOG_FILL_PROJECTION = "rgba(0, 0, 0, 1)";

export function fogFillForMode(readOnly: boolean): string {
  return readOnly ? FOG_FILL_PROJECTION : FOG_FILL_GM;
}
