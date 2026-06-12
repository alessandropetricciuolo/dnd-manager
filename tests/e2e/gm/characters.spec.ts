import { test, expect } from "@playwright/test";
import { loadE2ECredentials } from "../helpers/fixtures";
import { openCampaignTab } from "../helpers/campaign-ui";

test.describe("GM — personaggi", () => {
  const { campaigns } = loadE2ECredentials();
  const charName = `E2E-PG-${Date.now()}`;

  test("crea un personaggio con URL immagine", async ({ page }) => {
    await openCampaignTab(page, campaigns.oneshotSessionsId, "pg");
    await page.getByRole("button", { name: "Nuovo personaggio" }).click();
    await expect(page.getByRole("heading", { name: "Nuovo personaggio" })).toBeVisible();

    await page.locator('input[name="name"]').fill(charName);
    await page.getByRole("tab", { name: "Incolla URL" }).first().click();
    await page.getByRole("textbox", { name: /https:\/\/\.\.\. o link Google/i }).fill(
      "https://placehold.co/256x256/1c1917/fbbf24/png?text=PG"
    );
    await page.getByRole("button", { name: "Crea personaggio" }).click();

    await expect(page.locator("[data-sonner-toast]")).toContainText(/creat/i, {
      timeout: 25_000,
    });
    await expect(page.getByText(charName)).toBeVisible({ timeout: 15_000 });
  });
});
