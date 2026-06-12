import { test, expect } from "@playwright/test";

test.describe("Player — dashboard e permessi", () => {
  test("dashboard mostra Le mie sessioni", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Le mie sessioni" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin Panel" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Export immagini" })).toHaveCount(0);
  });

  test("testo descrittivo player sulle campagne", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Campagne in cui hai già partecipato ad almeno una sessione.")).toBeVisible();
    await expect(
      page.getByText("Campagne pubbliche o a cui sei iscritto (prenota una sessione per sbloccarle).")
    ).toBeVisible();
  });

  test("/admin reindirizza alla dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("/compendium reindirizza alla dashboard", async ({ page }) => {
    await page.goto("/compendium");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Compendio" })).toHaveCount(0);
  });

  test("profilo personale accessibile", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Il tuo profilo" })).toBeVisible();
  });
});
