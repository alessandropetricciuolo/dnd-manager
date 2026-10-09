/** Keep next/image limited to origins explicitly configured in next.config.js. */
export function isImageSourceOptimizable(src: string | null | undefined): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return !src.startsWith("//") && !/\.svgz?(?:[?#]|$)/i.test(src);

  try {
    const url = new URL(src);
    if (url.protocol !== "https:" || /\.svgz?$/i.test(url.pathname)) return false;
    const host = url.hostname.toLowerCase();

    return (
      (host.endsWith(".supabase.co") && url.pathname.startsWith("/storage/v1/object/public/")) ||
      host === "drive.google.com" ||
      host.endsWith(".googleusercontent.com") ||
      host === "placehold.co"
    );
  } catch {
    return false;
  }
}
