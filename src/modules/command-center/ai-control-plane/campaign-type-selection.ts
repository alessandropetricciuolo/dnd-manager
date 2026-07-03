import {
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_TYPE_VALUES,
  type CampaignType,
  isCampaignType,
} from "@/lib/campaign-type";

export function hasExplicitCampaignType(message: string): boolean {
  const t = message.toLowerCase();
  return (
    /\b(long|lunga|campagna\s+lunga|saga)\b/.test(t) ||
    /\bquest\b/.test(t) ||
    /\btorneo\b/.test(t) ||
    /\boneshot\b/.test(t) ||
    /\bone\s*shot\b/.test(t)
  );
}

export function parseCampaignTypeFromUserMessage(message: string): CampaignType | null {
  const t = message.trim().toLowerCase();
  if (/^[1-4]$/.test(t)) {
    const byIndex: Record<string, CampaignType> = {
      "1": "oneshot",
      "2": "quest",
      "3": "long",
      "4": "torneo",
    };
    return byIndex[t] ?? null;
  }

  if (/\b(long|lunga|campagna\s+lunga|saga)\b/.test(t)) return "long";
  if (/\bquest\b/.test(t)) return "quest";
  if (/\btorneo\b/.test(t)) return "torneo";
  if (/\boneshot\b/.test(t) || /\bone\s*shot\b/.test(t) || /\bavventura\s+unica\b/.test(t)) {
    return "oneshot";
  }

  for (const value of CAMPAIGN_TYPE_VALUES) {
    if (t === value || t.includes(value)) return value;
  }

  const labelMatch = Object.entries(CAMPAIGN_TYPE_LABELS).find(([, label]) =>
    t.includes(label.toLowerCase())
  );
  if (labelMatch && isCampaignType(labelMatch[0])) return labelMatch[0];

  return null;
}

export function formatCampaignTypeQuestion(): string {
  return `Prima di tutto: **che tipo di evento** vuoi creare?

1. **Oneshot** — avventura singola
2. **Quest** — missione breve
3. **Campagna lunga** — saga con più sessioni
4. **Torneo** — competizione a eliminazione

Scrivi il numero o il nome del tipo (es. \`oneshot\`, \`quest\`, \`campagna lunga\`, \`torneo\`).`;
}

export function formatCampaignTypeAck(type: CampaignType): string {
  return `Perfetto, preparo la **descrizione** per una **${CAMPAIGN_TYPE_LABELS[type]}**. Ti aiuto a scriverla nell'anteprima: potrai modificarla in chat finché non sei soddisfatto, poi **conferma** per approvarla.`;
}
