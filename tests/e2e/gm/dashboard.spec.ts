import { test, expect } from "@playwright/test";

test.describe("GM — dashboard e permessi", () => {
  test("dashboard mostra strumenti GM senza Admin Panel", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Le tue campagne" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin Panel" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Export immagini" })).toBeVisible();
  });

  test("/admin reindirizza alla dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Utenti" })).toHaveCount(0);
  });

  test("/compendium accessibile al GM", async ({ page }) => {
    await page.goto("/compendium");
    await expect(page.getByRole("heading", { name: "Compendio" })).toBeVisible();
  });

  test("sidebar espansa mostra Nuova campagna", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard");
    const sidebar = page.locator("aside.group\\/sidebar");
    await sidebar.hover();
    await expect(page.getByRole("button", { name: "Nuova campagna" })).toBeVisible();
  });
});
