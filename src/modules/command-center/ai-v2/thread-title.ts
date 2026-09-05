export const AI_ASSISTANT_THREAD_TITLE_MAX_LENGTH = 120;

export function deriveAssistantThreadTitle(message: string): string {
  const oneLine = message.replace(/\s+/g, " ").trim();
  if (oneLine.length <= AI_ASSISTANT_THREAD_TITLE_MAX_LENGTH) return oneLine || "Nuova conversazione";
  return `${oneLine.slice(0, AI_ASSISTANT_THREAD_TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}
