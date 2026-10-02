import { test, expect } from "@playwright/test";
import { loadE2ECredentials } from "../helpers/fixtures";

test.describe("GM — schermo live", () => {
  const { campaigns } = loadE2ECredentials();

  test("gm-screen v2 resta cliccabile prima e dopo il pannello Audio", async ({ page }) => {
    await page.goto(`/campaigns/${campaigns.longId}/gm-screen-v2`);
    const grid = page.getByRole("button", { name: "Griglia Modulare", exact: true });
    await grid.click();
    await expect(page.getByRole("button", { name: "Reset", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Apri Audio", exact: true }).click();
    const audio = page.getByRole("dialog", { name: "Audio", exact: true });
    await expect(audio).toBeVisible();
    await audio.getByRole("button", { name: "Chiudi", exact: true }).click();
    await expect(audio).toBeHidden();
    await page.getByRole("button", { name: "Plancia Tattica", exact: true }).click();
    await expect(page.getByRole("button", { name: "Solo 1", exact: true })).toBeVisible();
  });

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
