import { test, expect } from "@playwright/test";
import { loadE2ECredentials } from "../helpers/fixtures";
import { openCampaignTab, pickCalendarTomorrow } from "../helpers/campaign-ui";

test.describe("GM — sessioni", () => {
  const { campaigns } = loadE2ECredentials();

  test("crea una nuova sessione oneshot", async ({ page }) => {
    await openCampaignTab(page, campaigns.oneshotSessionsId, "sessioni");
    await page.getByRole("button", { name: "Nuova Sessione" }).click();
    await expect(page.getByRole("heading", { name: "Nuova sessione" })).toBeVisible();

    await pickCalendarTomorrow(page);
    await page.locator("#session-location").fill("Taverna E2E");
    await page.getByRole("button", { name: "Crea sessione" }).click();

    await expect(page.locator("[data-sonner-toast]")).toContainText(/sessione creata/i, {
      timeout: 15_000,
    });
    await expect(page.getByText("Taverna E2E")).toBeVisible();
  });
});
