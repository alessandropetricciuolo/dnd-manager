import { test, expect } from "@playwright/test";
import { loadE2ECredentials } from "../helpers/fixtures";

test.describe("GM — schermo live", () => {
  const { campaigns } = loadE2ECredentials();

  test("gm-screen oneshot mostra tracker iniziativa", async ({ page }) => {
    await page.goto(`/campaigns/${campaigns.oneshotPlayedId}/gm-screen`);
    await expect(page.getByRole("button", { name: /Apri Initiative Tracker|Chiudi Initiative Tracker/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apri Regia Immagini" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apri Sussurri Segreti" })).toBeVisible();
  });

  test("gm-screen long mostra pannelli campagna lunga", async ({ page }) => {
    await page.goto(`/campaigns/${campaigns.longId}/gm-screen`);
    await expect(page.getByText("Durante sessione")).toBeVisible({ timeout: 20_000 });
  });

  test("gm-screen torneo mostra gestione e tabellone", async ({ page }) => {
    await page.goto(`/campaigns/${campaigns.torneoId}/gm-screen`);
    await expect(page.getByRole("tab", { name: /Gestione|Tabellone/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
