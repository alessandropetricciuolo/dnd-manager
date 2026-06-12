import { test, expect } from "@playwright/test";
import { loadE2ECredentials } from "../helpers/fixtures";

test.describe("GM — generator schede", () => {
  const { campaigns } = loadE2ECredentials();

  test("pagina generator con campaignId carica il form", async ({ page }) => {
    await page.goto(`/generator?campaignId=${campaigns.oneshotSessionsId}`);
    await expect(page.getByRole("button", { name: "Genera Scheda" })).toBeVisible();
    await expect(page.locator("#characterName")).toBeVisible();
  });
});
