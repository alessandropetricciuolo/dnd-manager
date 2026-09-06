export function buildCampaignAssistantRoute(campaignId: string, threadId: string): string {
  const params = new URLSearchParams({
    view: "assistant",
    campaignId,
    threadId,
  });
  return `/command-center?${params.toString()}`;
}

export function appendCampaignCoverDirection(description: string, prompt?: string): string {
  const direction = prompt?.trim();
  if (!direction || /^genera(?:mi)?\s+(?:l['’]?immagine|la copertina)/i.test(direction)) return description.trim();
  return [description.trim(), `Direzione del GM per la copertina: ${direction}`].filter(Boolean).join("\n");
}
