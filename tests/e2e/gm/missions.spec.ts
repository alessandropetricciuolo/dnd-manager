import { test, expect } from "@playwright/test";
import { loadE2ECredentials } from "../helpers/fixtures";
import { openCampaignTab } from "../helpers/campaign-ui";

test.describe("GM — missioni Long", () => {
  const { campaigns } = loadE2ECredentials();
  const missionTitle = `E2E Missione ${Date.now()}`;

  test("crea una missione sulla campagna Long", async ({ page }) => {
    await openCampaignTab(page, campaigns.longId, "missioni");
    await page.getByRole("button", { name: "Nuova Missione" }).click();
    await expect(page.getByRole("heading", { name: "Nuova Missione" })).toBeVisible();

    await page.locator("#m-title").fill(missionTitle);
    await page.locator("#m-grade").fill("B");
    await page.locator("#m-committente").fill("Gilda E2E");
    await page.locator("#m-ubicazione").fill("Porto");
    await page.locator("#m-paga").fill("50 mo");
    await page.locator("#m-urgency").fill("Media");
    await page.locator("#m-desc").fill("Missione di test Playwright.");
    await page.getByRole("button", { name: "Aggiungi" }).click();

    await expect(page.locator("[data-sonner-toast]")).toContainText(/missione|aggiunt|creat/i, {
      timeout: 15_000,
    });
    await expect(page.getByText(missionTitle)).toBeVisible();
  });
});
