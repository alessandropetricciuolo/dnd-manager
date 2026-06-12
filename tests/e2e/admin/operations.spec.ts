import { test, expect } from "@playwright/test";

test.describe("Admin — operazioni", () => {
  test("gamification carica le tab", async ({ page }) => {
    await page.goto("/admin/gamification");
    await expect(page.getByRole("tab", { name: "Gestione Achievement" })).toBeVisible();
  });

  test("import campagna rifiuta JSON malformato", async ({ page }) => {
    await page.goto("/admin/import");
    await expect(page.getByRole("heading", { name: "Importa Campagna" })).toBeVisible();
    await page.locator("#import-json").fill("{ invalid json");
    await page.locator("form").getByRole("button", { name: "Importa campagna" }).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText(/json non valido|sintassi/i, {
      timeout: 10_000,
    });
  });

  test("CRM reclute carica la tabella", async ({ page }) => {
    await page.goto("/admin/crm");
    await expect(page.getByRole("heading", { name: "Libro Mastro delle Reclute" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Esporta CSV" })).toBeVisible();
  });

  test("comunicazioni carica la pagina", async ({ page }) => {
    await page.goto("/admin/communications");
    await expect(page.getByRole("heading", { name: "Comunicazioni Email ai Giocatori" })).toBeVisible();
  });

  test("knowledge RAG carica i controlli", async ({ page }) => {
    await page.goto("/admin/knowledge");
    await expect(page.getByRole("heading", { name: "Knowledge Base (RAG)" })).toBeVisible();
  });
});
