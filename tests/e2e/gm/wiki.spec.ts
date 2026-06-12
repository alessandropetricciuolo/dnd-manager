import { test, expect } from "@playwright/test";
import { loadE2ECredentials } from "../helpers/fixtures";
import { openCampaignTab } from "../helpers/campaign-ui";

test.describe("GM — wiki", () => {
  const { campaigns } = loadE2ECredentials();
  const entityTitle = `E2E Wiki ${Date.now()}`;

  test("crea una voce wiki manuale", async ({ page }) => {
    await openCampaignTab(page, campaigns.oneshotSessionsId, "wiki");
    await page.getByRole("button", { name: "Nuova voce" }).click();
    await expect(page.getByRole("heading", { name: "Nuova voce wiki" })).toBeVisible();
    await expect(page.locator("#entity-title")).toBeEnabled({ timeout: 20_000 });

    await page.locator("#entity-title").fill(entityTitle);
    await page.locator("#entity-content").fill("Descrizione E2E creata da Playwright.");
    await page.getByRole("button", { name: "Crea voce" }).click();

    await expect(page.locator("[data-sonner-toast]")).toContainText(/creat|aggiunt|salvat/i, {
      timeout: 20_000,
    });
    await expect(page.getByText(entityTitle)).toBeVisible({ timeout: 15_000 });
  });
});
