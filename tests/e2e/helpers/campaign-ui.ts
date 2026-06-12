import type { Page } from "@playwright/test";

export async function openCampaignTab(page: Page, campaignId: string, tab: string) {
  await page.goto(`/campaigns/${campaignId}?tab=${tab}`);
  await page.waitForURL(new RegExp(`/campaigns/${campaignId}.*tab=${tab}`));
}

export async function pickCalendarTomorrow(page: Page) {
  await page.getByRole("button", { name: "Scegli data" }).click();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = String(tomorrow.getDate());
  const cell = page.getByRole("gridcell", { name: day, exact: true });
  if (await cell.isVisible()) {
    await cell.click();
    return;
  }
  await page.locator("button.rdp-day:not([disabled])").last().click();
}
