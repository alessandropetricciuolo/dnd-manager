import { test, expect } from "@playwright/test";

test.describe("Missioni fuori Egida — Browser UI Verification", () => {
  test("flusso completo interfaccia: GM estraneo, Admin, Giocatore e Proiezione", async ({ page }) => {
    // Apri la pagina del componente reale nel browser Chromium
    await page.goto("/test-missions-ui");
    await expect(page.locator("h2:has-text('Bacheca delle Taglie')")).toBeVisible();

    // =========================================================================
    // 1. Ruolo: GM Estraneo (Non proprietario della campagna)
    // =========================================================================
    // Il tab "Missioni fuori Egida" deve essere visibile con badge "Riservate a GM/Admin"
    const personalTabTrigger = page.locator("button[role='tab']:has-text('Missioni fuori Egida')");
    await expect(personalTabTrigger).toBeVisible();
    await expect(personalTabTrigger.locator("text=Riservate a GM/Admin")).toBeVisible();

    // Clicca sul tab "Missioni fuori Egida"
    await personalTabTrigger.click();

    // Verifica presenza intestazione e badge di riservatezza
    await expect(page.locator("h3:has-text('Missioni fuori Egida')")).toBeVisible();
    await expect(page.locator("div.space-y-1 span:has-text('Riservate a GM/Admin')")).toBeVisible();

    // Verifica card preesistenti caricate
    await expect(page.locator("h4:has-text('Incontro Segreto al Molo')")).toBeVisible();
    await expect(page.locator("h4:has-text('Indagine sulle Ombre')")).toBeVisible();

    // Verifica chip di collegamento Wiki presente sulla card
    const wikiChip = page.locator("a:has-text('Informatore Cieco')");
    await expect(wikiChip).toBeVisible();
    await expect(wikiChip).toHaveAttribute("href", "/campaigns/test-campaign-1/wiki/wiki-1");

    // =========================================================================
    // 2. Creazione Missione con soli Titolo e Descrizione
    // =========================================================================
    const newMissionBtn = page.getByRole("button", { name: "Nuova Missione fuori Egida" });
    await expect(newMissionBtn).toBeVisible();
    await newMissionBtn.click();

    // Il dialog deve aprirsi con indicazione chiara
    const dialog = page.locator("div[role='dialog']");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("text=Nuova Missione fuori Egida")).toBeVisible();

    // Verifica che NON ci siano campi fittizi o obbligatori per grado, paga o premi gilda
    await expect(dialog.locator("#m-grade")).toHaveCount(0);
    await expect(dialog.locator("#m-paga")).toHaveCount(0);
    await expect(dialog.locator("#m-points")).toHaveCount(0);

    // Compila solo titolo e descrizione (campi obbligatori)
    const testTitle = `Trama GM Test ${Date.now()}`;
    await dialog.locator("#pm-title").fill(testTitle);
    await dialog.locator("#pm-desc").fill("Descrizione riservata al Master per la sessione imminente.");

    // Committente, Ubicazione, Urgenza sono opzionali
    await dialog.locator("#pm-committente").fill("Nobile Decaduto");

    // Verifica pulsante di annulla chiuda il dialog
    const cancelBtn = dialog.getByRole("button", { name: "Annulla" });
    await cancelBtn.click();
    await expect(dialog).toBeHidden();

    // =========================================================================
    // 3. Filtri e Ricerca
    // =========================================================================
    const searchInput = page.locator("input[placeholder*='Cerca per titolo']");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Molo");

    await expect(page.locator("h4:has-text('Incontro Segreto al Molo')")).toBeVisible();
    await expect(page.locator("h4:has-text('Indagine sulle Ombre')")).toBeHidden();

    // Resetta ricerca
    await searchInput.fill("");
    await expect(page.locator("h4:has-text('Indagine sulle Ombre')")).toBeVisible();

    // Filtra per stato "In corso"
    const inProgressFilterBtn = page.getByRole("button", { name: "In corso" });
    await inProgressFilterBtn.click();
    await expect(page.locator("h4:has-text('Indagine sulle Ombre')")).toBeVisible();
    await expect(page.locator("h4:has-text('Incontro Segreto al Molo')")).toBeHidden();

    // Torna a "Tutte"
    await page.getByRole("button", { name: "Tutte" }).click();
    await expect(page.locator("h4:has-text('Incontro Segreto al Molo')")).toBeVisible();
    await expect(page.locator("h4:has-text('Indagine sulle Ombre')")).toBeVisible();

    // =========================================================================
    // 4. Azioni di stato: Avvia, Completa, Riapri, Modifica, Elimina
    // =========================================================================
    // Card "Incontro Segreto al Molo" è "Aperta" -> mostra pulsante "Avvia"
    const moloCard = page.locator("div.rounded-xl:has(h4:has-text('Incontro Segreto al Molo'))");
    await expect(moloCard.getByRole("button", { name: "Avvia" })).toBeVisible();
    await expect(moloCard.getByRole("button", { name: "Modifica" })).toBeVisible();
    await expect(moloCard.getByRole("button", { name: "Elimina" })).toBeVisible();

    // Card "Indagine sulle Ombre" è "In corso" -> mostra "Riapri" e "Completa"
    const ombreCard = page.locator("div.rounded-xl:has(h4:has-text('Indagine sulle Ombre'))");
    await expect(ombreCard.getByRole("button", { name: "Riapri" })).toBeVisible();
    await expect(ombreCard.getByRole("button", { name: "Completa" })).toBeVisible();

    // Clicca Modifica sulla card Molo
    await moloCard.getByRole("button", { name: "Modifica" }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("text=Modifica Missione fuori Egida")).toBeVisible();
    await expect(dialog.locator("#pm-title")).toHaveValue("Incontro Segreto al Molo");
    await dialog.getByRole("button", { name: "Annulla" }).click();

    // =========================================================================
    // 5. Ruolo Admin: Stessa visibilità e capacità di gestione
    // =========================================================================
    await page.locator("#btn-role-admin").click();
    await expect(personalTabTrigger).toBeVisible();
    await expect(page.locator("h4:has-text('Incontro Segreto al Molo')")).toBeVisible();

    // =========================================================================
    // 6. Ruolo Giocatore: ESCLUSIONE TOTALE
    // =========================================================================
    await page.locator("#btn-role-player").click();

    // Il tab "Missioni fuori Egida" NON DEVE ESISTERE per i giocatori
    await expect(page.locator("button[role='tab']:has-text('Missioni fuori Egida')")).toBeHidden();
    // Nessun contenuto di missioni riservate deve essere visibile
    await expect(page.locator("text=Incontro Segreto al Molo")).toBeHidden();
    await expect(page.locator("text=Indagine sulle Ombre")).toBeHidden();
    // I giocatori vedono solo la bacheca dell'organizzazione
    await expect(page.locator("button[role='tab']:has-text('Missioni dell')")).toBeVisible();
    await expect(page.locator("button[role='tab']:has-text('Classifica Gilde')")).toBeVisible();

    // =========================================================================
    // 7. Proiezione ai Giocatori: ESCLUSIONE TOTALE
    // =========================================================================
    await page.locator("#btn-role-projection").click();

    // Anche quando la proiezione è attiva, il tab "Missioni fuori Egida" NON DEVE ESISTERE
    await expect(page.locator("button[role='tab']:has-text('Missioni fuori Egida')")).toBeHidden();
    await expect(page.locator("text=Incontro Segreto al Molo")).toBeHidden();
    await expect(page.locator("text=Indagine sulle Ombre")).toBeHidden();
    await expect(page.locator("text=Bando dei Goblin del Fiume")).toBeVisible();
  });
});
