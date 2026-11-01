import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { execFileSync } from 'node:child_process';

test.describe('Generatore V2', () => {
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
    await expect(page.getByRole('heading', { name: 'Generatore V2' })).toBeVisible();
    await expect(page.locator('#classSubclass option')).toHaveCount(9);
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
    await expect(page.getByRole('link', { name: 'Prova il Generatore V2' })).toBeVisible();
  });


  test('Barbaro: selezione dei totem e download; tutti i sette cammini esportano',async({page})=>{
    test.setTimeout(180_000);
    await page.goto('/generator-v2?classLabel=Barbaro');
    await expect(page.locator('#classLabel')).toHaveValue('Barbaro');
    await expect(page.locator('#classSubclass option')).toHaveCount(8);
    await page.locator('#characterName').fill('Barbaro V2 verifica');
    await page.locator('#raceSlug').selectOption('umano');await page.locator('#backgroundSlug').selectOption('soldato');
    const totem=await page.locator('#classSubclass option').filter({hasText:'Combattente Totemico'}).getAttribute('value');
    await page.locator('#classSubclass').selectOption(totem!);await page.locator('#level').fill('14');
    await page.getByRole('button',{name:'Genera Scheda',exact:true}).click();
    await page.getByRole('button',{name:'Conferma e genera PDF'}).click();
    const section=page.getByRole('region',{name:'Esportazione scheda V2'});
    await section.getByLabel('Spirito Totemico (livello 3)').selectOption('Lupo');
    await section.getByLabel('Aspetto della Bestia (livello 6)').selectOption('Orso');
    await section.getByLabel('Sintonia Totemica (livello 14)').selectOption('Aquila');
    const pending=page.waitForEvent('download');await section.getByRole('button',{name:'Genera scheda V2',exact:true}).click();
    const download=await pending;expect(await download.failure()).toBeNull();await download.saveAs(test.info().outputPath('barbaro-totemico-v2.pdf'));
    for(const path of ['Cammino del Berserker','Cammino del Combattente Totemico','Cammino del Guardiano Ancestrale',"Cammino dell'Araldo della Tempesta",'Cammino dello Zelota','Cammino della Bestia','Cammino della Magia Selvaggia']){
      const response=await page.request.post('/api/sheet-pdf-v2',{data:{input:{classLabel:'Barbaro',characterName:path,raceSlug:'umano',backgroundSlug:'soldato',classSubclass:path,level:'20'}}});
      expect(response.status(),path+': '+(response.status()!==200?await response.text():'')).toBe(200);expect((await response.body()).subarray(0,5).toString()).toBe('%PDF-');
    }
    const invalidChoice=await page.request.post('/api/sheet-pdf-v2',{data:{input:{classLabel:'Barbaro',characterName:'Test',raceSlug:'umano',backgroundSlug:'soldato',classSubclass:'Cammino del Berserker',level:'5'},barbarianChoices:{storm:'Mare'}}});
    expect(invalidChoice.status()).toBe(422);
    await page.screenshot({path:test.info().outputPath('barbaro-v2-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  });

  test('Chierico: scelte della Conoscenza, download e dodici domini',async({page})=>{
    test.setTimeout(240_000);
    await page.goto('/generator-v2?classLabel=Chierico');
    await expect(page.locator('#classLabel')).toHaveValue('Chierico');
    await expect(page.locator('#classSubclass option')).toHaveCount(13);
    await page.locator('#characterName').fill('Chierico V2 verifica');
    await page.locator('#raceSlug').selectOption('umano');await page.locator('#backgroundSlug').selectOption('accolito');
    const domain=await page.locator('#classSubclass option').filter({hasText:'Dominio della Conoscenza'}).getAttribute('value');
    await page.locator('#classSubclass').selectOption(domain!);await page.locator('#level').fill('5');
    await page.getByRole('button',{name:'Genera Scheda',exact:true}).click();
    await page.getByRole('button',{name:'Conferma e genera PDF'}).click();
    const section=page.getByRole('region',{name:'Esportazione scheda V2'});
    await expect(section.getByRole('checkbox',{checked:true})).toHaveCount(2);
    await section.getByRole('checkbox',{checked:true}).first().uncheck();
    await expect(section.getByRole('button',{name:'Genera scheda V2',exact:true})).toBeDisabled();
    await section.getByRole('checkbox',{checked:false}).first().check();
    await section.getByLabel('Linguaggio aggiuntivo 1').selectOption('Draconico');
    await section.getByLabel('Linguaggio aggiuntivo 2').selectOption('Silvano');
    const pending=page.waitForEvent('download');await section.getByRole('button',{name:'Genera scheda V2',exact:true}).click();
    const download=await pending;expect(await download.failure()).toBeNull();await download.saveAs(test.info().outputPath('chierico-conoscenza-v2.pdf'));
    const names=['Dominio della Conoscenza','Dominio della Guerra',"Dominio dell'Inganno",'Dominio della Luce','Dominio della Natura','Dominio della Tempesta','Dominio della Vita','Dominio della Forgia','Dominio della Tomba','Dominio del Crepuscolo',"Dominio dell'Ordine",'Dominio della Pace'];
    for(const classSubclass of names){const response=await page.request.post('/api/sheet-pdf-v2',{data:{input:{classLabel:'Chierico',characterName:classSubclass,raceSlug:'umano',backgroundSlug:'accolito',classSubclass,level:'9'},...(classSubclass==='Dominio della Natura'?{clericChoices:{skills:['survival'],druidCantrip:'Frusta di Spine'}}:{})}});expect(response.status(),classSubclass+': '+(response.status()!==200?await response.text():'')).toBe(200);expect((await response.body()).subarray(0,5).toString()).toBe('%PDF-');}
    const invalid=await page.request.post('/api/sheet-pdf-v2',{data:{input:{classLabel:'Chierico',characterName:'Test',raceSlug:'umano',backgroundSlug:'accolito',classSubclass:'Dominio della Vita',level:'1'},clericChoices:{skills:['arcana']}}});expect(invalid.status()).toBe(422);
    await page.screenshot({path:test.info().outputPath('chierico-v2-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  });

  test('Druido: scelta del Circolo della Terra, ambiente, trucchetto e PDF V2',async({page})=>{
    test.setTimeout(180_000);
    await page.goto('/generator-v2?classLabel=Druido');
    await expect(page.locator('#classLabel')).toHaveValue('Druido');
    await page.locator('#characterName').fill('Druido V2 verifica');
    await page.locator('#raceSlug').selectOption('elfo');
    await page.locator('#backgroundSlug').selectOption('eremita');
    const circle=await page.locator('#classSubclass option').filter({hasText:'Circolo della Terra'}).getAttribute('value');
    await page.locator('#classSubclass').selectOption(circle!);
    await page.locator('#level').fill('5');
    await page.getByRole('button',{name:'Genera Scheda',exact:true}).click();
    await page.getByRole('button',{name:'Conferma e genera PDF'}).click();
    const section=page.getByRole('region',{name:'Esportazione scheda V2'});
    await expect(section.getByLabel('Terreno del Circolo della Terra')).toBeVisible();
    await section.getByLabel('Terreno del Circolo della Terra').selectOption('Palude');
    const cantrip=section.getByLabel('Trucchetto aggiuntivo del Circolo della Terra');
    await cantrip.selectOption({index:0});
    const pending=page.waitForEvent('download');
    await section.getByRole('button',{name:'Genera scheda V2',exact:true}).click();
    const download=await pending;expect(await download.failure()).toBeNull();
    const destination=test.info().outputPath('druido-terra-v2.pdf');await download.saveAs(destination);
    const pdf=fs.readFileSync(destination);expect(pdf.subarray(0,5).toString()).toBe('%PDF-');
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(3);
    const invalidChoice=await page.request.post('/api/sheet-pdf-v2',{data:{input:{classLabel:'Druido',characterName:'Scelta incompatibile',raceSlug:'elfo',backgroundSlug:'eremita',classSubclass:'Circolo della Luna',level:'5'},druidChoices:{landTerrain:'Foresta'}}});
    expect(invalidChoice.status()).toBe(422);
    await page.screenshot({path:test.info().outputPath('druido-v2-desktop.png'),fullPage:true});
  });

  test('Guerriero: selezione dello stile, download e tutti gli otto archetipi esportano', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/generator-v2?classLabel=Guerriero');
    await expect(page.locator('#classLabel')).toHaveValue('Guerriero');
    await expect(page.locator('#classSubclass option')).toHaveCount(9);
    await page.locator('#characterName').fill('Guerriero V2 verifica');
    await page.locator('#raceSlug').selectOption('umano');
    await page.locator('#backgroundSlug').selectOption('soldato');
    const bm = await page.locator('#classSubclass option').filter({ hasText: 'Maestro di Battaglia' }).getAttribute('value');
    await page.locator('#classSubclass').selectOption(bm!);
    await page.locator('#level').fill('5');
    await page.getByRole('button', { name: 'Genera Scheda', exact: true }).click();
    await page.getByRole('button', { name: 'Conferma e genera PDF' }).click();
    const section = page.getByRole('region', { name: 'Esportazione scheda V2' });
    await expect(section.getByLabel('Stile di combattimento')).toBeVisible();
    await section.getByLabel('Stile di combattimento').selectOption('Duellare');
    const pending = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Genera scheda V2', exact: true }).click();
    const download = await pending;
    expect(await download.failure()).toBeNull();
    const destination = test.info().outputPath('guerriero-bm-v2.pdf');
    await download.saveAs(destination);
    const pdf = fs.readFileSync(destination);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(2);

    const archetypes = [
      'Campione',
      'Maestro di Battaglia',
      'Cavaliere Mistico',
      'Arciere Arcano',
      'Cavaliere Errante',
      'Samurai',
      'Cavaliere Runico',
      'Guerriero Psionico',
    ];
    for (const classSubclass of archetypes) {
      const response = await page.request.post('/api/sheet-pdf-v2', {
        data: {
          input: {
            classLabel: 'Guerriero',
            characterName: classSubclass,
            raceSlug: 'umano',
            backgroundSlug: 'soldato',
            classSubclass,
            level: '10',
          },
          fighterChoices: { fightingStyle: 'Duellare' },
        },
      });
      expect(response.status(), classSubclass + ': ' + (response.status() !== 200 ? await response.text() : '')).toBe(200);
      expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
    }

    const invalidChoice = await page.request.post('/api/sheet-pdf-v2', {
      data: {
        input: {
          classLabel: 'Barbaro',
          characterName: 'Scelta errata',
          raceSlug: 'umano',
          backgroundSlug: 'soldato',
          classSubclass: 'Cammino del Berserker',
          level: '5',
        },
        fighterChoices: { fightingStyle: 'Duellare' },
      },
    });
    expect(invalidChoice.status()).toBe(422);

    await page.screenshot({ path: test.info().outputPath('guerriero-v2-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  });

  test('Ladro: opzioni, download e tutti i nove archetipi esportano', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/generator-v2?classLabel=Ladro');
    await expect(page.locator('#classLabel')).toHaveValue('Ladro');
    await expect(page.locator('#classSubclass option')).toHaveCount(10);
    await page.locator('#characterName').fill('Ladro V2 verifica');
    await page.locator('#raceSlug').selectOption('umano');
    await page.locator('#backgroundSlug').selectOption('criminale');
    const sw = await page.locator('#classSubclass option').filter({ hasText: 'Spadaccino' }).getAttribute('value');
    await page.locator('#classSubclass').selectOption(sw!);
    await page.locator('#level').fill('5');
    await page.getByRole('button', { name: 'Genera Scheda', exact: true }).click();
    await page.getByRole('button', { name: 'Conferma e genera PDF' }).click();
    const section = page.getByRole('region', { name: 'Esportazione scheda V2' });
    const pending = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Genera scheda V2', exact: true }).click();
    const download = await pending;
    expect(await download.failure()).toBeNull();
    const destination = test.info().outputPath('ladro-spadaccino-v2.pdf');
    await download.saveAs(destination);
    const pdf = fs.readFileSync(destination);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(2);

    const archetypes = [
      'Furfante',
      'Assassino',
      'Mistificatore Arcano',
      'Esploratore',
      'Indagatore',
      'Pianificatore',
      'Spadaccino',
      'Fantasma',
      'Lama Spirituale',
    ];
    for (const classSubclass of archetypes) {
      const response = await page.request.post('/api/sheet-pdf-v2', {
        data: {
          input: {
            classLabel: 'Ladro',
            characterName: classSubclass,
            raceSlug: 'umano',
            backgroundSlug: 'criminale',
            classSubclass,
            level: '5',
          },
        },
      });
      expect(response.status(), classSubclass + ': ' + (response.status() !== 200 ? await response.text() : '')).toBe(200);
      expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
    }

    const invalidChoice = await page.request.post('/api/sheet-pdf-v2', {
      data: {
        input: {
          classLabel: 'Barbaro',
          characterName: 'Scelta errata',
          raceSlug: 'umano',
          backgroundSlug: 'soldato',
          classSubclass: 'Cammino del Berserker',
          level: '5',
        },
        rogueChoices: { mastermindGamingSet: 'Set di dadi' },
      },
    });
    expect(invalidChoice.status()).toBe(422);

    await page.screenshot({ path: test.info().outputPath('ladro-v2-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  });

  test('Mago: scelte Tradizione Arcana, download e tutte le 11 tradizioni esportano', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/generator-v2?classLabel=Mago');
    await expect(page.locator('#classLabel')).toHaveValue('Mago');
    await expect(page.locator('#classSubclass option')).toHaveCount(12);
    await page.locator('#characterName').fill('Mago V2 verifica');
    await page.locator('#raceSlug').selectOption('umano');
    await page.locator('#backgroundSlug').selectOption('sapiente');
    const tradition = await page.locator('#classSubclass option').filter({ hasText: 'Canto della Lama' }).getAttribute('value');
    await page.locator('#classSubclass').selectOption(tradition!);
    await page.locator('#level').fill('5');
    await page.getByRole('button', { name: 'Genera Scheda', exact: true }).click();
    await page.getByRole('button', { name: 'Conferma e genera PDF' }).click();

    const section = page.getByRole('region', { name: 'Esportazione scheda V2' });
    await expect(section.getByLabel('Arma da mischia ad una mano (Arte della Guerra e del Canto)')).toBeVisible();
    await section.getByLabel('Arma da mischia ad una mano (Arte della Guerra e del Canto)').selectOption('Stocco');

    const pending = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Genera scheda V2', exact: true }).click();
    const download = await pending;
    expect(await download.failure()).toBeNull();
    await download.saveAs(test.info().outputPath('mago-canto-lama-v2.pdf'));

    const traditions = [
      'Scuola di Abiurazione',
      'Scuola di Ammaliamento',
      'Scuola di Divinazione',
      'Scuola di Evocazione',
      'Scuola di Illusione',
      'Scuola di Invocazione',
      'Scuola di Necromanzia',
      'Scuola di Trasmutazione',
      'Magia della Guerra',
      'Canto della Lama',
      'Ordine degli Scribi',
    ];

    for (const sub of traditions) {
      const response = await page.request.post('/api/sheet-pdf-v2', {
        data: {
          input: {
            classLabel: 'Mago',
            characterName: sub,
            raceSlug: 'umano',
            backgroundSlug: 'sapiente',
            classSubclass: sub,
            level: '14',
          },
          wizardChoices: sub === 'Canto della Lama' ? { bladesingerWeapon: 'Stocco' } : undefined,
        },
      });
      expect(response.status(), sub + ': ' + (response.status() !== 200 ? await response.text() : '')).toBe(200);
      expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
    }

    const invalid = await page.request.post('/api/sheet-pdf-v2', {
      data: {
        input: {
          classLabel: 'Mago',
          characterName: 'Test',
          raceSlug: 'umano',
          backgroundSlug: 'sapiente',
          classSubclass: 'Scuola di Evocazione',
          level: '5',
        },
        wizardChoices: { bladesingerWeapon: 'Spada laser' },
      },
    });
    expect(invalid.status()).toBe(400);

    await page.screenshot({ path: test.info().outputPath('mago-v2-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  });

  test('Monaco: scelte Kensei, download e tutte le 8 tradizioni esportano', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/generator-v2?classLabel=Monaco');
    await expect(page.locator('#classLabel')).toHaveValue('Monaco');
    await expect(page.locator('#classSubclass option')).toHaveCount(9);
    await page.locator('#characterName').fill('Monaco V2 verifica');
    await page.locator('#raceSlug').selectOption('umano');
    await page.locator('#backgroundSlug').selectOption('eremita');
    const tradition = await page.locator('#classSubclass option').filter({ hasText: 'Kensei' }).getAttribute('value');
    await page.locator('#classSubclass').selectOption(tradition!);
    await page.locator('#level').fill('5');
    await page.getByRole('button', { name: 'Genera Scheda', exact: true }).click();
    await page.getByRole('button', { name: 'Conferma e genera PDF' }).click();

    const section = page.getByRole('region', { name: 'Esportazione scheda V2' });
    await expect(section.getByLabel('Arma Kensei da mischia')).toBeVisible();
    await section.getByLabel('Arma Kensei da mischia').selectOption('Spada lunga');
    await expect(section.getByLabel('Arma Kensei a distanza')).toBeVisible();
    await section.getByLabel('Arma Kensei a distanza').selectOption('Arco lungo');

    const pending = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Genera scheda V2', exact: true }).click();
    const download = await pending;
    expect(await download.failure()).toBeNull();
    await download.saveAs(test.info().outputPath('monaco-kensei-v2.pdf'));

    const traditions = [
      'Via della Mano Aperta',
      "Via dell'Ombra",
      'Via dei Quattro Elementi',
      'Via del Kensei',
      'Via del Maestro Ubriaco',
      "Via dell'Anima Solare",
      'Via del Sé Astrale',
      'Via della Misericordia',
    ];

    for (const sub of traditions) {
      const response = await page.request.post('/api/sheet-pdf-v2', {
        data: {
          input: {
            classLabel: 'Monaco',
            characterName: sub,
            raceSlug: 'umano',
            backgroundSlug: 'eremita',
            classSubclass: sub,
            level: '14',
          },
          monkChoices: sub === 'Via del Kensei' ? { kenseiMeleeWeapon: 'Spada lunga', kenseiRangedWeapon: 'Arco lungo' } : undefined,
        },
      });
      expect(response.status(), sub + ': ' + (response.status() !== 200 ? await response.text() : '')).toBe(200);
      expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
    }

    const invalid = await page.request.post('/api/sheet-pdf-v2', {
      data: {
        input: {
          classLabel: 'Monaco',
          characterName: 'Test',
          raceSlug: 'umano',
          backgroundSlug: 'eremita',
          classSubclass: 'Via della Mano Aperta',
          level: '5',
        },
        monkChoices: { kenseiMeleeWeapon: 'Arma inventata' },
      },
    });
    expect(invalid.status()).toBe(400);

    await page.screenshot({ path: test.info().outputPath('monaco-v2-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  });

  test('Paladino: stile di combattimento, download e tutti i 7 giuramenti esportano', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/generator-v2?classLabel=Paladino');
    await expect(page.locator('#classLabel')).toHaveValue('Paladino');
    await expect(page.locator('#classSubclass option')).toHaveCount(8);
    await page.locator('#characterName').fill('Paladino V2 verifica');
    await page.locator('#raceSlug').selectOption('umano');
    await page.locator('#backgroundSlug').selectOption('nobile');
    const oath = await page.locator('#classSubclass option').filter({ hasText: 'Devozione' }).getAttribute('value');
    await page.locator('#classSubclass').selectOption(oath!);
    await page.locator('#level').fill('5');
    await page.getByRole('button', { name: 'Genera Scheda', exact: true }).click();
    await page.getByRole('button', { name: 'Conferma e genera PDF' }).click();

    const section = page.getByRole('region', { name: 'Esportazione scheda V2' });
    await expect(section.getByLabel('Scegli lo stile di combattimento')).toBeVisible();
    await section.getByLabel('Scegli lo stile di combattimento').selectOption('Difesa');

    const pending = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Genera scheda V2', exact: true }).click();
    const download = await pending;
    expect(await download.failure()).toBeNull();
    await download.saveAs(test.info().outputPath('paladino-devozione-v2.pdf'));

    const oaths = [
      'Giuramento di Devozione',
      'Giuramento degli Antichi',
      'Giuramento di Vendetta',
      'Giuramento di Conquista',
      'Giuramento di Redenzione',
      'Giuramento di Gloria',
      'Giuramento delle Sentinelle',
    ];

    for (const sub of oaths) {
      const response = await page.request.post('/api/sheet-pdf-v2', {
        data: {
          input: {
            classLabel: 'Paladino',
            characterName: sub,
            raceSlug: 'umano',
            backgroundSlug: 'nobile',
            classSubclass: sub,
            level: '14',
          },
          paladinChoices: { fightingStyle: 'Difesa' },
        },
      });
      expect(response.status(), sub + ': ' + (response.status() !== 200 ? await response.text() : '')).toBe(200);
      expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
    }

    const invalid = await page.request.post('/api/sheet-pdf-v2', {
      data: {
        input: {
          classLabel: 'Paladino',
          characterName: 'Test',
          raceSlug: 'umano',
          backgroundSlug: 'nobile',
          classSubclass: 'Giuramento di Devozione',
          level: '5',
        },
        paladinChoices: { fightingStyle: 'Stile Inesistente' },
      },
    });
    expect(invalid.status()).toBe(400);

    await page.screenshot({ path: test.info().outputPath('paladino-v2-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  });

  test('Ranger: stile di combattimento, download e tutti i 7 archetipi esportano', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/generator-v2?classLabel=Ranger');
    await expect(page.locator('#classLabel')).toHaveValue('Ranger');
    await expect(page.locator('#classSubclass option')).toHaveCount(8);
    await page.locator('#characterName').fill('Ranger V2 verifica');
    await page.locator('#raceSlug').selectOption('umano');
    await page.locator('#backgroundSlug').selectOption('forestiero');
    const hunter = await page.locator('#classSubclass option').filter({ hasText: 'Cacciatore' }).first().getAttribute('value');
    await page.locator('#classSubclass').selectOption(hunter!);
    await page.locator('#level').fill('5');
    await page.getByRole('button', { name: 'Genera Scheda', exact: true }).click();
    await page.getByRole('button', { name: 'Conferma e genera PDF' }).click();

    const section = page.getByRole('region', { name: 'Esportazione scheda V2' });
    await expect(section.getByLabel('Scegli lo stile di combattimento')).toBeVisible();
    await section.getByLabel('Scegli lo stile di combattimento').selectOption('Tiro');

    const pending = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Genera scheda V2', exact: true }).click();
    const download = await pending;
    expect(await download.failure()).toBeNull();
    await download.saveAs(test.info().outputPath('ranger-cacciatore-v2.pdf'));

    const archetypes = [
      'Cacciatore',
      'Signore delle Bestie',
      'Cacciatore delle Tenebre',
      'Uccisore di Mostri',
      "Viandante dell'Orizzonte",
      'Custode degli Sciami',
      'Viandante Fatato',
    ];

    for (const sub of archetypes) {
      const response = await page.request.post('/api/sheet-pdf-v2', {
        data: {
          input: {
            classLabel: 'Ranger',
            characterName: sub,
            raceSlug: 'umano',
            backgroundSlug: 'forestiero',
            classSubclass: sub,
            level: '14',
          },
          rangerChoices: { fightingStyle: 'Tiro' },
        },
      });
      expect(response.status(), sub + ': ' + (response.status() !== 200 ? await response.text() : '')).toBe(200);
      expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
    }

    const invalid = await page.request.post('/api/sheet-pdf-v2', {
      data: {
        input: {
          classLabel: 'Ranger',
          characterName: 'Test',
          raceSlug: 'umano',
          backgroundSlug: 'forestiero',
          classSubclass: 'Cacciatore',
          level: '5',
        },
        rangerChoices: { fightingStyle: 'Stile Inesistente' },
      },
    });
    expect(invalid.status()).toBe(400);

    await page.screenshot({ path: test.info().outputPath('ranger-v2-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  });

  test('Stregone: opzioni origine, metamagia, download e tutte le 7 origini esportano', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/generator-v2?classLabel=Stregone');
    await expect(page.locator('#classLabel')).toHaveValue('Stregone');
    await expect(page.locator('#classSubclass option')).toHaveCount(8);
    await page.locator('#characterName').fill('Stregone V2 verifica');
    await page.locator('#raceSlug').selectOption('umano');
    await page.locator('#backgroundSlug').selectOption('sapiente');
    const draconic = await page.locator('#classSubclass option').filter({ hasText: 'Discendenza' }).first().getAttribute('value');
    await page.locator('#classSubclass').selectOption(draconic!);
    await page.locator('#level').fill('5');
    await page.getByRole('button', { name: 'Genera Scheda', exact: true }).click();
    await page.getByRole('button', { name: 'Conferma e genera PDF' }).click();

    const section = page.getByRole('region', { name: 'Esportazione scheda V2' });
    await expect(section.getByLabel('Antenato Draconico')).toBeVisible();
    await section.getByLabel('Antenato Draconico').selectOption('Rosso');

    const pending = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Genera scheda V2', exact: true }).click();
    const download = await pending;
    expect(await download.failure()).toBeNull();
    await download.saveAs(test.info().outputPath('stregone-draconico-v2.pdf'));

    const origins = [
      'Discendenza draconica',
      'Magia selvaggia',
      'Anima Divina',
      'Magia delle Ombre',
      'Stregoneria della Tempesta',
      'Anima Meccanica',
      'Mente Aberrante',
    ];

    for (const sub of origins) {
      const response = await page.request.post('/api/sheet-pdf-v2', {
        data: {
          input: {
            classLabel: 'Stregone',
            characterName: sub,
            raceSlug: 'umano',
            backgroundSlug: 'sapiente',
            classSubclass: sub,
            level: '14',
          },
          sorcererChoices: {
            metamagic: ['Incantesimo Rapido', 'Incantesimo Raddoppiato', 'Incantesimo Celato'],
            draconicAncestry: 'Rosso',
            divineAffinity: 'Bene',
          },
        },
      });
      expect(response.status(), sub + ': ' + (response.status() !== 200 ? await response.text() : '')).toBe(200);
      expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
    }

    const invalid = await page.request.post('/api/sheet-pdf-v2', {
      data: {
        input: {
          classLabel: 'Stregone',
          characterName: 'Test',
          raceSlug: 'umano',
          backgroundSlug: 'sapiente',
          classSubclass: 'Discendenza draconica',
          level: '5',
        },
        sorcererChoices: { divineAffinity: 'Affinità Inesistente' },
      },
    });
    expect(invalid.status()).toBe(400);

    await page.screenshot({ path: test.info().outputPath('stregone-v2-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  });

  test('Artefice: il motore propone infusioni e oggetti, le scelte si modificano e tutte le specializzazioni esportano',async({page})=>{
    test.setTimeout(240_000);
    await page.goto('/generator-v2?classLabel=Artefice');
    await expect(page.locator('#classLabel')).toHaveValue('Artefice');await expect(page.locator('#classSubclass option')).toHaveCount(5);
    await page.locator('#characterName').fill('Artefice V2 verifica');await page.locator('#raceSlug').selectOption('umano');await page.locator('#backgroundSlug').selectOption('sapiente');
    await page.locator('#classSubclass').selectOption('Fabbro da battaglia');await page.locator('#level').fill('5');
    await page.getByRole('button',{name:'Genera Scheda',exact:true}).click();
    await expect(page.locator('#artificer-known-1')).toHaveValue('weapon');await expect(page.locator('#artificer-active-1')).toHaveValue('weapon::hammer');
    await page.locator('#artificer-known-1').selectOption('returning');await expect(page.locator('#artificer-active-1')).toHaveValue('');
    await page.locator('#artificer-active-1').selectOption('returning::hammer');await expect(page.locator('#artificer-state-1')).toHaveValue('self');
    await page.getByRole('button',{name:'Conferma e genera PDF'}).click();
    await expect(page.getByRole('region',{name:'Infusioni dell’Artefice'})).toContainText("RITORNO DELL'ARMA");
    const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Genera scheda V2',exact:true}).click();const download=await pending;expect(await download.failure()).toBeNull();await download.saveAs(test.info().outputPath('artefice-v2.pdf'));
    for(const classSubclass of ['Alchimista','Armaiolo','Artigliere','Fabbro da battaglia']){const response=await page.request.post('/api/sheet-pdf-v2',{data:{input:{classLabel:'Artefice',characterName:classSubclass,raceSlug:'umano',backgroundSlug:'sapiente',classSubclass,level:'10'}}});expect(response.status(),classSubclass+': '+(response.status()!==200?await response.text():'')).toBe(200);expect((await response.body()).subarray(0,5).toString()).toBe('%PDF-');}
    const invalid=await page.request.post('/api/sheet-pdf-v2',{data:{input:{classLabel:'Artefice',characterName:'Test',raceSlug:'umano',backgroundSlug:'sapiente',level:'2',buildOverridesJson:JSON.stringify({artificer:{known:['weapon','defense','focus','mind'],assignments:[{infusionId:'weapon',itemId:'armor',state:'self'}]}})}}});expect(invalid.status()).toBe(400);
    await page.screenshot({path:test.info().outputPath('artefice-v2-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
    // The original generator uses the same corrected engine, not a V2-only patch.
    await page.goto('/generator?classLabel=Artefice');await page.locator('#characterName').fill('Artefice V1 verifica');await page.locator('#raceSlug').selectOption('umano');await page.locator('#backgroundSlug').selectOption('sapiente');await page.locator('#level').fill('2');
    await page.getByRole('button',{name:'Genera Scheda',exact:true}).click();await expect(page.locator('#artificer-known-1')).toHaveValue('defense');await expect(page.locator('#artificer-active-1')).toHaveValue('defense::armor');await page.getByRole('button',{name:'Conferma e genera PDF'}).click();
    await expect(page.getByRole('region',{name:'Infusioni dell’Artefice'})).toContainText('DIFESA MIGLIORATA');
    const legacyPayload=JSON.parse(execFileSync(process.execPath,['--import','tsx','tests/e2e/fixtures/artificer-legacy-payload.ts'],{encoding:'utf8'}));
    const legacy=await page.request.post('/api/sheet-pdf',{data:legacyPayload});
    expect(legacy.status(),legacy.status()===200?'':await legacy.text()).toBe(200);
    const legacyBytes=await legacy.body();expect((await PDFDocument.load(legacyBytes)).getPageCount()).toBeGreaterThan(3);fs.writeFileSync(test.info().outputPath('artefice-v1.pdf'),legacyBytes);

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

  test('tutti i collegi dei manuali e i due stili delle Spade producono un PDF',async({page})=>{
    test.setTimeout(180_000);
    await page.goto('/generator-v2');
    if(page.url().includes('/login')){
      const credentials=JSON.parse(fs.readFileSync('tests/e2e/.auth/credentials.json','utf8')).admin;
      await page.locator('#email').fill(credentials.email);await page.locator('#password').fill(credentials.password);
      await page.getByRole('button',{name:'Entra nella Taverna'}).click();await page.waitForURL('**/dashboard**');
    }
    for(const college of ['Collegio del Valore','Collegio dei Sussurri',"Collegio dell'Incanto",'Collegio delle Spade',"Collegio dell'Eloquenza",'Collegio della Creazione','Collegio degli Spiriti']){
      for(const fightingStyle of college==='Collegio delle Spade'?['Duellare','Combattere con Due Armi']:[undefined]){
      const response=await page.request.post('/api/sheet-pdf-v2',{data:{input:{classLabel:'Bardo',characterName:college,raceSlug:'halfling',backgroundSlug:'intrattenitore',classSubclass:college,level:'6'},bonusSkills:[],...(fightingStyle?{fightingStyle}:{})}});
      expect(response.status(),college+': '+(response.status()!==200?await response.text():'')).toBe(200);
      const bytes=await response.body();expect(bytes.subarray(0,5).toString()).toBe('%PDF-');
      if(college.includes('Eloquenza')||college.includes('Creazione')||college.includes('Spiriti'))fs.writeFileSync(test.info().outputPath(college.replace(/[^a-z]/gi,'-')+'.pdf'),bytes);
      }
    }
  });
});
