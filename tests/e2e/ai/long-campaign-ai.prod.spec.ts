import { test, expect } from "@playwright/test";
import { loadE2ECredentials } from "../helpers/fixtures";
import { openCampaignTab, pickCalendarTodayPastTime } from "../helpers/campaign-ui";
import {
  expandCreateWikiAssistant,
  fillNpcAssistantTraits,
  openCreateWikiDialog,
  openWikiEditDialog,
  openWikiEntityDetail,
  runBacchettaIa,
} from "../helpers/wiki-ai-ui";
import {
  fetchAiMemorySnapshot,
  memoryChunkContainsToken,
  waitForMemoryToken,
} from "../helpers/ai-memory-db";

/**
 * QA AI end-to-end su campagna long in produzione.
 * Target: https://dnd-manager-j8h5.vercel.app (stesso deploy di barberandragons.com).
 */
test.describe.configure({ mode: "serial", timeout: 600_000 });

test.describe("AI campagna long — produzione", () => {
  const { campaigns } = loadE2ECredentials();
  const campaignId = campaigns.longId;
  const runId = Date.now();
  const token = `E2E-AI-${runId}`;
  const wikiTitle = `E2E AI NPC ${runId}`;
  const wikiAiTitle = `E2E AI Generated ${runId}`;
  const sessionLocation = `E2E Live ${runId}`;

  const architectDescription =
    "Campagna dark fantasy gothic-noir in città portuale nebbiosa. Magia rara e pericolosa. " +
    "Stile visivo: inchiostri scuri, luce di candela, niente tecnologia moderna, niente colori neon o cartoon. " +
    "I nemici sono congiure politiche e culti marini.";

  test("1 · Architetto AI: paletti e negative prompt immagine", async ({ page }) => {
    await openCampaignTab(page, campaignId, "gm");
    await page.getByRole("button", { name: "AI" }).click();
    await expect(page.getByText("L'Anima della Campagna")).toBeVisible();

    await page.locator(`#ai-architect-desc-${campaignId}`).fill(architectDescription);
    await page.getByRole("button", { name: "Genera Paletti AI" }).click();

    await expect(page.locator("[data-sonner-toast]")).toContainText(/paletti ai salvati|contesto/i, {
      timeout: 120_000,
    });
    await expect(page.getByText("Cervello AI configurato")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Vietato in immagine")).toBeVisible();

    const snapshot = await fetchAiMemorySnapshot(campaignId);
    expect(snapshot.aiContext?.narrative_tone?.length).toBeGreaterThan(10);
    expect(snapshot.aiContext?.visual_negative?.length).toBeGreaterThan(10);
    expect(snapshot.aiContext?.visual_negative?.toLowerCase()).toMatch(/neon|modern|cartoon|tech/);
  });

  test("2 · Wiki canonica con memoria IA", async ({ page }) => {
    await openCampaignTab(page, campaignId, "wiki");
    await openCreateWikiDialog(page);

    await page.locator("#entity-title").fill(wikiTitle);
    await page.locator("#entity-content").fill(
      `Il mercante ${wikiTitle} vende reliquie marine. Segreto QA: ${token}-WIKI.`
    );
    await page.locator("#entity-ai-memory").check();
    await page.getByRole("button", { name: "Crea voce" }).click();

    await expect(page.locator("[data-sonner-toast]")).toContainText(/creat|aggiunt|salvat/i, {
      timeout: 30_000,
    });
    await expect(page.getByText(wikiTitle)).toBeVisible({ timeout: 20_000 });

    const indexed = await waitForMemoryToken(campaignId, `${token}-WIKI`, {
      sourceType: "wiki",
      timeoutMs: 90_000,
    });
    expect(indexed).toBeTruthy();
  });

  test("3 · Generazione testo wiki via Assistente IA", async ({ page }) => {
    await openCampaignTab(page, campaignId, "wiki");
    await openCreateWikiDialog(page);

    await page.locator("#entity-title").fill(wikiAiTitle);
    const assistant = await expandCreateWikiAssistant(page);
    await fillNpcAssistantTraits(assistant);
    await page.locator("#assist-prompt").fill(
      `Mercante del porto nebbioso legato al culto marino — tono dark fantasy gothic-noir`
    );
    await page.getByRole("button", { name: "Genera testo" }).click();

    await expect(page.locator("[data-sonner-toast]")).toContainText(/Contenuto AI generato/i, {
      timeout: 180_000,
    });

    await expect.poll(async () => (await page.locator("#entity-content").inputValue()).trim().length).toBeGreaterThan(80);
    await page.locator("#entity-ai-memory").check();
    await page.getByRole("button", { name: "Crea voce" }).click();
    await expect(page.getByText(/Entit[aà] creata/i)).toBeVisible({ timeout: 30_000 });
  });

  test("4 · Sessione live simulata: chiusura con riassunto", async ({ page }) => {
    await openCampaignTab(page, campaignId, "sessioni");
    await page.getByRole("button", { name: "Nuova Sessione" }).click();
    await expect(page.getByRole("heading", { name: "Nuova sessione" })).toBeVisible();

    await pickCalendarTodayPastTime(page);
    await page.locator("#session-location").fill(sessionLocation);
    await page.getByRole("button", { name: "Crea sessione" }).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText(/sessione creata/i, {
      timeout: 20_000,
    });

    await expect(page.getByText(sessionLocation).first()).toBeVisible({ timeout: 15_000 });
    const sessionBlock = page
      .locator("div")
      .filter({ hasText: sessionLocation })
      .filter({ has: page.getByRole("button", { name: "Chiudi sessione (con riepilogo e XP)" }) })
      .first();

    await sessionBlock.getByRole("button", { name: "Chiudi sessione (con riepilogo e XP)" }).first().click();
    await expect(page.getByRole("heading", { name: /Chiudi sessione/i })).toBeVisible();

    const presentRadio = page.getByRole("radio", { name: "Presente" }).first();
    if (await presentRadio.isVisible()) await presentRadio.check();

    await page.getByRole("button", { name: "Avanti" }).click();
    await page.locator("#wizard-summary").fill(
      `Sessione QA ${runId}: il gruppo scopre il sigillo ${token}-SESSION nel porto nebbioso.`
    );
    await page.getByRole("button", { name: "Avanti" }).click();
    await page.getByRole("button", { name: "Avanti" }).click();
    await page.getByRole("button", { name: "Avanti" }).click();
    await page.getByRole("button", { name: "Avanti" }).click();
    await page.getByRole("button", { name: "Concludi Sessione Definitivamente" }).click();

    await expect(page.locator("[data-sonner-toast]")).toContainText(/chius|complet|conclus/i, {
      timeout: 60_000,
    });

    const indexed = await waitForMemoryToken(campaignId, `${token}-SESSION`, {
      sourceType: "session_summary",
      timeoutMs: 120_000,
    });
    expect(indexed).toBeTruthy();
  });

  test("5 · Memoria campagna: query semantica sul riassunto", async ({ page }) => {
    await openCampaignTab(page, campaignId, "gm");
    await expect(page.getByText("Chiedi alla Memoria Campagna")).toBeVisible();

    await page.locator(`#campaign-memory-q-${campaignId}`).fill(
      `Cosa è successo con il sigillo ${token}-SESSION nel porto?`
    );
    await page.getByRole("button", { name: "Interroga" }).click();

    await expect(page.locator("[data-sonner-toast]")).toContainText(/memoria interrogata/i, {
      timeout: 120_000,
    });
    await expect(page.getByRole("heading", { name: "Risposta" })).toBeVisible({ timeout: 30_000 });

    const answer = await page.locator("h3:has-text('Risposta') + div").innerText();
    expect(answer.toLowerCase()).toMatch(/sigillo|porto|session|qa/i);
  });

  test("6 · Rigenerazione wiki: Bacchetta IA con memoria sessione", async ({ page }) => {
    await openCampaignTab(page, campaignId, "wiki");
    await runBacchettaIa(
      page,
      `Un testimone occhiuto del porto che ha visto il sigillo ${token}-SESSION durante la sessione QA ${runId}`
    );

    await expect(page.getByText(/sigillo|porto|session|testimone/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("7 · Generazione immagine coerente (negative prompt)", async ({ page }) => {
    await openCampaignTab(page, campaignId, "wiki");
    await openWikiEntityDetail(page, wikiTitle);
    await openWikiEditDialog(page);

    await page.getByRole("button", { name: "Genera immagine IA" }).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText(/immagine|generat|caricat|salvat/i, {
      timeout: 240_000,
    });

    const snapshot = await fetchAiMemorySnapshot(campaignId);
    expect(snapshot.aiContext?.visual_negative?.length).toBeGreaterThan(5);
    expect(await memoryChunkContainsToken(campaignId, `${token}-WIKI`, "wiki")).toBeTruthy();
  });
});
