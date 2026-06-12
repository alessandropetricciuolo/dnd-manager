import { test, expect } from "@playwright/test";

test.describe("Pagine pubbliche", () => {
  test("home carica e mostra CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Unisciti alla Gilda|Vai alla Dashboard/i }).first()).toBeVisible();
  });

  test("/login mostra form accesso", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entra nella Taverna" })).toBeVisible();
  });

  test("/privacy carica", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});
