import { test, expect } from "@playwright/test";
import { loadE2ECredentials } from "../helpers/fixtures";

test.describe("GM Screen — strumenti (smoke)", () => {
  const { campaigns } = loadE2ECredentials();

  test("apre galleria e sussurri dal gm-screen", async ({ page }) => {
    await page.goto(`/campaigns/${campaigns.oneshotPlayedId}/gm-screen`);
    await page.getByRole("button", { name: "Apri Regia Immagini" }).click();
    await expect(page.getByRole("heading", { name: "Regia Immagini" })).toBeVisible({
      timeout: 10_000,
    });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Apri Sussurri Segreti" }).click();
    await expect(page.getByRole("heading", { name: "Sussurri Segreti" })).toBeVisible({ timeout: 10_000 });
  });
});
