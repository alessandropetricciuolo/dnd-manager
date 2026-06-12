import { test, expect } from "@playwright/test";

test.describe("Admin — dashboard e pannello", () => {
  test("dashboard mostra sezioni GM e link Admin Panel", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Le tue campagne" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tutte le campagne" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin Panel" })).toBeVisible();
  });

  test("/admin carica la gestione utenti", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Utenti" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nuovo utente" })).toBeVisible();
  });

  test("/compendium accessibile", async ({ page }) => {
    await page.goto("/compendium");
    await expect(page.getByRole("heading", { name: "Compendio" })).toBeVisible();
  });
});
