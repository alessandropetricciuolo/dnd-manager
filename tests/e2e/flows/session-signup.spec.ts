import { test, expect } from "@playwright/test";
import { loadE2ECredentials, storageStatePath } from "../helpers/fixtures";
import { openCampaignTab, pickCalendarTomorrow } from "../helpers/campaign-ui";

test.describe("Flusso GM → Player — iscrizione sessione", () => {
  test("GM crea sessione pubblica e player si iscrive", async ({ browser }) => {
    const { campaigns } = loadE2ECredentials();
    const locationLabel = `E2E-Flow-${Date.now()}`;

    const gmContext = await browser.newContext({ storageState: storageStatePath("gm") });
    const gmPage = await gmContext.newPage();

    await openCampaignTab(gmPage, campaigns.oneshotSessionsId, "sessioni");
    await gmPage.getByRole("button", { name: "Nuova Sessione" }).click();
    await pickCalendarTomorrow(gmPage);
    await gmPage.locator("#session-location").fill(locationLabel);
    await gmPage.getByRole("button", { name: "Crea sessione" }).click();
    await expect(gmPage.locator("[data-sonner-toast]")).toContainText(/sessione creata/i, {
      timeout: 15_000,
    });
    await expect(gmPage.getByText(locationLabel)).toBeVisible();

    const playerContext = await browser.newContext({ storageState: storageStatePath("player") });
    const playerPage = await playerContext.newPage();
    await openCampaignTab(playerPage, campaigns.oneshotSessionsId, "sessioni");
    await expect(playerPage.getByText(locationLabel)).toBeVisible();
    await playerPage
      .locator("[class*='rounded-xl']")
      .filter({ hasText: locationLabel })
      .getByRole("button", { name: "Iscriviti" })
      .click();
    await expect(playerPage.locator("[data-sonner-toast]")).toContainText(/iscriz|prenot|aggiunt/i, {
      timeout: 15_000,
    });

    await gmContext.close();
    await playerContext.close();
  });
});
