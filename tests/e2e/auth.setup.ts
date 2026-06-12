import { execSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test as setup, expect } from "@playwright/test";

const authDir = path.join(__dirname, ".auth");

type CredentialsFile = {
  admin: { email: string; password: string };
  gm: { email: string; password: string };
  player: { email: string; password: string };
};

setup.describe.configure({ mode: "serial" });

setup.beforeAll(() => {
  execSync("npx tsx scripts/e2e-provision-users.ts", {
    stdio: "inherit",
    cwd: path.join(__dirname, "../.."),
  });
});

async function loginAndSave(role: "admin" | "gm" | "player", email: string, password: string, page: import("@playwright/test").Page) {
  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Entra nella Taverna" }).click();
  await page.waitForURL("**/dashboard**", { timeout: 30_000 });
  mkdirSync(authDir, { recursive: true });
  await page.context().storageState({ path: path.join(authDir, `${role}.json`) });
}

function loadCredentials(): CredentialsFile {
  return JSON.parse(readFileSync(path.join(authDir, "credentials.json"), "utf8")) as CredentialsFile;
}

setup("authenticate admin", async ({ page }) => {
  const { admin } = loadCredentials();
  await loginAndSave("admin", admin.email, admin.password, page);
});

setup("authenticate gm", async ({ page }) => {
  const { gm } = loadCredentials();
  await loginAndSave("gm", gm.email, gm.password, page);
});

setup("authenticate player", async ({ page }) => {
  const { player } = loadCredentials();
  await loginAndSave("player", player.email, player.password, page);
});
