import { test, expect } from "@playwright/test";
import { loadE2ECredentials } from "../helpers/fixtures";
import { openCampaignTab } from "../helpers/campaign-ui";

test.describe("Player — accesso campagna", () => {
  const { campaigns } = loadE2ECredentials();

  test("su oneshot mai giocata wiki è bloccata", async ({ page }) => {
    await openCampaignTab(page, campaigns.oneshotLockedId, "wiki");
    await expect(page.getByText(/Wiki e Mappe bloccate finché non partecipi/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "In programma" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nuova voce" })).toHaveCount(0);
  });

  test("su oneshot giocata wiki è accessibile", async ({ page }) => {
    await openCampaignTab(page, campaigns.oneshotPlayedId, "wiki");
    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaigns.oneshotPlayedId}.*tab=wiki`));
    await expect(page.getByText(campaigns.wikiEntityTitle)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Nuova voce" })).toHaveCount(0);
  });

  test("campagna privata non mostra sessioni prenotabili", async ({ page }) => {
    await openCampaignTab(page, campaigns.oneshotPrivateId, "sessioni");
    await expect(page.getByRole("button", { name: "Iscriviti" })).toHaveCount(0);
  });

  test("campagna Long iscritto mostra tab Missioni", async ({ page }) => {
    await openCampaignTab(page, campaigns.longId, "missioni");
    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaigns.longId}.*tab=missioni`));
    await expect(page.getByRole("heading", { name: "Missioni", level: 2 })).toBeVisible();
  });
});
