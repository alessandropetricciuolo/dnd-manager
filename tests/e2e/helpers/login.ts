import type { Page } from "@playwright/test";

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Entra nella Taverna" }).click();
  await page.waitForURL("**/dashboard**", { timeout: 30_000 });
}

export async function logout(page: Page) {
  const logoutButton = page.getByRole("button", { name: "Esci" });
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL(/\/(login)?$/, { timeout: 15_000 });
  }
}
