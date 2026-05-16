/** Tipi evento/campagna supportati in piattaforma. */
export const CAMPAIGN_TYPE_OPTIONS = [
  { value: "oneshot", label: "One Shot" },
  { value: "quest", label: "Quest" },
  { value: "long", label: "Campagna Lunga" },
  { value: "torneo", label: "Torneo" },
] as const;

export type CampaignType = (typeof CAMPAIGN_TYPE_OPTIONS)[number]["value"];

export const CAMPAIGN_TYPE_VALUES: CampaignType[] = CAMPAIGN_TYPE_OPTIONS.map((o) => o.value);

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  oneshot: "Oneshot",
  quest: "Quest",
  long: "Campagna lunga",
  torneo: "Torneo",
};

export function isCampaignType(value: string | null | undefined): value is CampaignType {
  return !!value && (CAMPAIGN_TYPE_VALUES as readonly string[]).includes(value);
}

export function isLongCampaignType(type: string | null | undefined): boolean {
  return type === "long";
}

export function isTorneoCampaignType(type: string | null | undefined): boolean {
  return type === "torneo";
}

/** Sessioni chiudibili con flusso semplice (tutti presenti), come oneshot/quest. */
export function usesSimpleSessionClose(type: string | null | undefined): boolean {
  return type === "oneshot" || type === "quest" || type === "torneo";
}
