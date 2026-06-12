import { test, expect } from "@playwright/test";
import { loadE2ECredentials } from "../helpers/fixtures";
import { openCampaignTab } from "../helpers/campaign-ui";

test.describe("Player — personaggi", () => {
  const { campaigns } = loadE2ECredentials();

  test("vede il proprio PG assegnato", async ({ page }) => {
    await openCampaignTab(page, campaigns.oneshotPlayedId, "pg");
    await expect(page.getByText(campaigns.playerCharacterName)).toBeVisible();
    await expect(page.getByRole("button", { name: "Nuovo personaggio" })).toHaveCount(0);
  });
});
