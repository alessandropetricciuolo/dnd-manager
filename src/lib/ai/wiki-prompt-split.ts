export function splitPromptByDash(userPrompt: string): { retrievalPrompt: string; narrativePrompt: string } {
  const raw = userPrompt.trim();
  if (!raw) return { retrievalPrompt: "", narrativePrompt: "" };

  // Split on the first spaced dash ("retrieval - narrative") so hyphenated words
  // like "Half-elf" stay in the retrieval segment.
  const spacedDash = /\s+-\s+/;
  const match = raw.match(spacedDash);
  if (match && typeof match.index === "number") {
    const left = raw.slice(0, match.index).trim();
    const right = raw.slice(match.index + match[0].length).trim();
    if (left && right) {
      return { retrievalPrompt: left, narrativePrompt: right };
    }
  }

  return { retrievalPrompt: raw, narrativePrompt: raw };
}
