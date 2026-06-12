import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loginAs } from "../helpers/login";

type CredentialsFile = {
  gm: { email: string; password: string };
};

function loadGmCredentials(): CredentialsFile["gm"] {
  const credPath = path.join(__dirname, "../.auth/credentials.json");
  const data = JSON.parse(readFileSync(credPath, "utf8")) as CredentialsFile;
  return data.gm;
}

test.describe("Auth — login e logout", () => {
  test("login valido porta alla dashboard", async ({ page }) => {
    const { email, password } = loadGmCredentials();
    await loginAs(page, email, password);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("login invalido resta su /login", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("invalido-e2e@barberandragons.qa");
    await page.locator("#password").fill("password-sbagliata");
    await page.getByRole("button", { name: "Entra nella Taverna" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("[data-sonner-toast]")).toContainText(
      /accesso non riuscito|email e password|invalid/i,
      { timeout: 10_000 }
    );
  });

  test("route protetta /dashboard senza sessione reindirizza al login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
