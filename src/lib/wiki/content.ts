export function getWikiContentBody(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const body = (content as Record<string, unknown>).body;
    if (typeof body === "string") return body.trim();
  }
  return "";
}
