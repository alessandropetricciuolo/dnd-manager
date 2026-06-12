import { test, expect } from "@playwright/test";

test.describe("Player — profilo", () => {
  test("aggiorna il nickname", async ({ page }) => {
    const nickname = `e2e-${Date.now().toString(36)}`;
    await page.goto("/profile");
    await page.locator("#nickname").fill(nickname);
    await page.getByRole("button", { name: "Salva modifiche" }).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText(/profilo aggiornato/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#nickname")).toHaveValue(nickname);
  });
});
