import { test, expect } from "@playwright/test";
import { loadE2ECredentials } from "../helpers/fixtures";
import { openCampaignTab } from "../helpers/campaign-ui";

test.describe("GM — torneo", () => {
  const { campaigns } = loadE2ECredentials();

  test("strumenti GM mostrano link Torneo 2.0", async ({ page }) => {
    await openCampaignTab(page, campaigns.torneoId, "gm");
    await expect(page.getByRole("link", { name: /Torneo 2\.0/i })).toBeVisible();
  });

  test("console Torneo 2.0 carica setup", async ({ page }) => {
    await page.goto(`/campaigns/${campaigns.torneoId}/torneo2`);
    await expect(page.getByRole("button", { name: /Setup|Live|Tabellone|Classifica/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
