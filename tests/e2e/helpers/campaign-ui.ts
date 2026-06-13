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

/** Seleziona oggi e un orario già trascorso (per abilitare la chiusura sessione). */
export async function pickCalendarTodayPastTime(page: Page) {
  await page.getByRole("button", { name: "Scegli data" }).click();
  const day = String(new Date().getDate());
  const cell = page.getByRole("gridcell", { name: day, exact: true });
  if (await cell.isVisible()) {
    await cell.click();
  } else {
    await page.locator("button.rdp-day:not([disabled])").first().click();
  }

  const now = new Date();
  const hour = Math.max(0, now.getHours() - 1);
  const timeValue = `${String(hour).padStart(2, "0")}:00`;
  await page.locator("#session-time").fill(timeValue);
}
