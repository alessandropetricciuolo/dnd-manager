export function getLoginDestination(destination: string | null): string {
  if (!destination || !destination.startsWith("/") || destination.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(destination)) {
    return "/dashboard";
  }

  const url = new URL(destination, "https://barberanddragons.com");
  // URL normalization may expose a second leading slash (e.g. /a/..//host).
  return url.pathname.startsWith("//") ? "/dashboard" : destination;
}
