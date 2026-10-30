import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test.describe('Generatore Bardo V2', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.beforeEach(async ({ context, request }) => {
    if (process.env.SHEET_V2_ISOLATED_TEST) {
      const cookie = await (await request.get('http://127.0.0.1:54449/__test/session')).json();
      await context.addCookies([{ ...cookie, url: 'http://localhost:3119', sameSite: 'Lax' }]);
    }
  });
  test('scelte, competenze Sapienza e download completo; V1 resta disponibile', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/generator-v2');
    if (page.url().includes('/login')) {
      const credentials = (process.env.SHEET_V2_ISOLATED_TEST ? { email: 'sheet-test@example.test', password: 'local-test-password' } : JSON.parse(fs.readFileSync('tests/e2e/.auth/credentials.json', 'utf8')).admin);
      await page.locator('#email').fill(credentials.email);
      await page.locator('#password').fill(credentials.password);
      await page.getByRole('button', { name: 'Entra nella Taverna' }).click();
      await page.waitForURL('**/dashboard**'); await page.goto('/generator-v2');
    }
    await expect(page.getByRole('heading', { name: 'Generatore V2 · Bardo' })).toBeVisible();
    await page.locator('#characterName').fill('Bardo V2 verifica');
    await page.locator('#raceSlug').selectOption('halfling');
    await page.locator('#backgroundSlug').selectOption('intrattenitore');
    const loreValue = await page.locator('#classSubclass option').filter({ hasText: 'Collegio della Sapienza' }).getAttribute('value');
    await page.locator('#classSubclass').selectOption(loreValue!);
    await page.locator('#level').fill('5');
    await page.getByRole('button', { name: 'Genera Scheda', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Conferma e genera PDF' })).toBeVisible();
    await page.getByRole('button', { name: 'Conferma e genera PDF' }).click();
    const section = page.getByRole('region', { name: 'Esportazione scheda V2' });
    await expect(section.getByRole('button', { name: 'Genera scheda V2', exact: true })).toBeEnabled();
    const downloadPromise = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Genera scheda V2', exact: true }).click();
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
    const destination = test.info().outputPath('bardo-v2.pdf'); await download.saveAs(destination);
    expect(fs.readFileSync(destination).subarray(0, 5).toString()).toBe('%PDF-');
    await page.screenshot({ path: test.info().outputPath('generatore-v2-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: test.info().outputPath('generatore-v2-mobile.png'), fullPage: false });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.goto('/generator');
    await expect(page.getByRole('heading', { name: 'Generatore Schede D&D (HTML)' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Prova il Generatore V2 del Bardo' })).toBeVisible();
  });

  test('endpoint rifiuta una scheda arbitraria e richieste anonime', async ({ page, playwright }) => {
    const anonymous = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL });
    const unauthorized = await anonymous.post('/api/sheet-pdf-v2', { data: { input: { classLabel: 'Bardo' } } });
    expect(unauthorized.status()).toBe(401); await anonymous.dispose();
    await page.goto('/generator-v2');
    if (page.url().includes('/login')) {
      const credentials = (process.env.SHEET_V2_ISOLATED_TEST ? { email: 'sheet-test@example.test', password: 'local-test-password' } : JSON.parse(fs.readFileSync('tests/e2e/.auth/credentials.json', 'utf8')).admin);
      await page.locator('#email').fill(credentials.email); await page.locator('#password').fill(credentials.password);
      await page.getByRole('button', { name: 'Entra nella Taverna' }).click(); await page.waitForURL('**/dashboard**');
    }
    const invalid = await page.request.post('/api/sheet-pdf-v2', { data: { sheet: { classLabel: 'Bardo', classFeaturesMd: 'Regola inventata' } } });
    expect(invalid.status()).toBe(400);
  });
});
