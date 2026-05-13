import { S3Client } from "@aws-sdk/client-s3";

export type R2Config = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBase: string;
};

export function getR2Config(): R2Config {
  const endpoint = process.env.R2_ENDPOINT?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
    throw new Error(
      "Config R2 incompleta: servono R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL."
    );
  }
  return { endpoint, accessKeyId, secretAccessKey, bucket, publicBase };
}

let cached: S3Client | null = null;

export function getR2S3Client(): S3Client {
  if (cached) return cached;
  const { endpoint, accessKeyId, secretAccessKey } = getR2Config();
  cached = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cached;
}

/** URL pubblica HTTPS per lo streaming nel browser (segmenti path codificati). */
export function buildR2PublicObjectUrl(storageKey: string): string {
  const { publicBase } = getR2Config();
  const path = storageKey
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${publicBase}/${path}`;
}
