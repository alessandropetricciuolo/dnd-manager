import { isIP } from "node:net";

const ALLOWED_STORAGE_DOWNLOAD_BUCKETS = new Set(["exploration_maps", "gm_files"]);

export function isGmOrAdminRole(role: string | null | undefined): boolean {
  return role === "gm" || role === "admin";
}

export function normalizeStorageDownloadTarget(
  bucket: string | null | undefined,
  filePath: string | null | undefined
):
  | { ok: true; bucket: string; filePath: string }
  | { ok: false; status: number; message: string } {
  const normalizedBucket = bucket?.trim() ?? "";
  const normalizedPath = filePath?.trim() ?? "";

  if (!normalizedBucket || !normalizedPath) {
    return { ok: false, status: 400, message: "Bucket e percorso storage sono obbligatori." };
  }
  if (!ALLOWED_STORAGE_DOWNLOAD_BUCKETS.has(normalizedBucket)) {
    return { ok: false, status: 403, message: "Bucket storage non autorizzato." };
  }
  if (
    normalizedPath.startsWith("/") ||
    normalizedPath.includes("\\") ||
    normalizedPath.split("/").some((segment) => segment === "..") ||
    normalizedPath.length > 1024
  ) {
    return { ok: false, status: 400, message: "Percorso storage non valido." };
  }

  return { ok: true, bucket: normalizedBucket, filePath: normalizedPath };
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "::1" ||
    h === "::" ||
    h.startsWith("fc") ||
    h.startsWith("fd") ||
    h.startsWith("fe80:")
  );
}

export function isSafeRemoteImageUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.username || url.password) return false;

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
      hostname === "localhost" ||
      hostname === "metadata.google.internal" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local")
    ) {
      return false;
    }

    const ipVersion = isIP(hostname);
    if (ipVersion === 4) return !isPrivateIpv4(hostname);
    if (ipVersion === 6) return !isPrivateIpv6(hostname);

    return true;
  } catch {
    return false;
  }
}
