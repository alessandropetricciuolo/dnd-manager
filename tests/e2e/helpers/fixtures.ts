import { readFileSync } from "node:fs";
import path from "node:path";

export type E2ECampaignFixtures = {
  oneshotPlayedId: string;
  oneshotSessionsId: string;
  oneshotLockedId: string;
  oneshotPrivateId: string;
  longId: string;
  torneoId: string;
  wikiEntityTitle: string;
  playerCharacterName: string;
};

export type E2ECredentials = {
  admin: { email: string; password: string };
  gm: { email: string; password: string };
  player: { email: string; password: string };
  userIds: { gm: string; player: string };
  campaigns: E2ECampaignFixtures;
};

const CREDENTIALS_PATH = path.join(__dirname, "../.auth/credentials.json");
const AUTH_DIR = path.join(__dirname, "../.auth");

export function loadE2ECredentials(): E2ECredentials {
  return JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8")) as E2ECredentials;
}

export function storageStatePath(role: "admin" | "gm" | "player"): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

export function campaignUrl(campaignId: string, tab?: string): string {
  const base = `/campaigns/${campaignId}`;
  return tab ? `${base}?tab=${tab}` : base;
}
