import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function openCreateWikiDialog(page: Page) {
  await page.getByRole("button", { name: "Nuova voce" }).click();
  await expect(page.getByRole("heading", { name: "Nuova voce wiki" })).toBeVisible();
  await expect(page.locator("#entity-title")).toBeEnabled({ timeout: 20_000 });
}

export async function expandCreateWikiAssistant(page: Page) {
  const section = page.locator("details").filter({ hasText: "Assistente IA" });
  await section.locator("summary").click();
  await expect(page.getByRole("button", { name: "Genera testo" })).toBeVisible();
  return section;
}

export async function fillNpcAssistantTraits(section: ReturnType<Page["locator"]>) {
  const selects = section.locator("select");
  await selects.nth(0).selectOption({ index: 1 });
  await selects.nth(1).selectOption({ index: 1 });
  await selects.nth(2).selectOption({ index: 1 });
}

export async function openWikiEntityDetail(page: Page, title: string) {
  await page.getByRole("link", { name: title }).click().catch(async () => {
    await page.getByText(title, { exact: true }).first().click();
  });
  await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 20_000 });
}

export async function openWikiEditDialog(page: Page) {
  await page.getByRole("button", { name: "Modifica" }).click();
  await expect(page.getByRole("heading", { name: "Modifica voce wiki" })).toBeVisible();
}

export async function runBacchettaIa(page: Page, prompt: string, entityType: "npc" | "location" | "item" | "lore" = "lore") {
  await openCreateWikiDialog(page);
  await page.getByRole("button", { name: "Genera tutto con la Bacchetta IA" }).click();
  await expect(page.getByRole("heading", { name: "Generazione completa" })).toBeVisible();
  await page.locator("#magic-entity-type").selectOption(entityType);
  await page.locator("#magic-prompt").fill(prompt);
  await page.getByRole("button", { name: "Genera", exact: true }).click();
  await expect(page.getByText(/Bozza (completa|testo) pronta/i)).toBeVisible({ timeout: 300_000 });
  await page.getByRole("dialog").filter({ hasText: "Generazione completa" }).getByRole("button", { name: "Chiudi" }).click();
  await page.getByRole("button", { name: "Crea voce" }).click();
  await expect(page.getByText(/Entit[aà] creata/i)).toBeVisible({ timeout: 60_000 });
}
