import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMobileLevelProgress,
  extractWikiEntityBody,
  extractWikiEntitySnippet,
  formatMissionRankMeta,
  formatMissionTreasureLabel,
  getEldariaGuideSections,
  resolveBackgroundCatalogInfo,
  resolveMobileCharacterCalendar,
  resolveRaceAndSubraceLabels,
  resolveTelegramOrImageUrl,
} from '../long-campaign-helpers';
import { projectMobileCharacter } from '../character-projection';

test('resolveRaceAndSubraceLabels and resolveBackgroundCatalogInfo map Italian catalog slugs', () => {
  const race = resolveRaceAndSubraceLabels({
    raceSlug: 'elfo',
    subclassSlug: 'elfo_boschi',
  });
  assert.equal(race.raceLabel, 'Elfo');
  assert.equal(race.subraceLabel, 'Elfo dei boschi');

  const bg = resolveBackgroundCatalogInfo({ backgroundSlug: 'sapiente' });
  assert.equal(bg.label, 'Sapiente');
  assert.equal(bg.bookPrefix, 'PHB');
  assert.equal(bg.fullBadge, 'PHB: Sapiente');

  const ravenloftBg = resolveBackgroundCatalogInfo({ backgroundSlug: 'investigatore' });
  assert.equal(ravenloftBg.fullBadge, 'Ravenloft: Investigatore');
});

test('calculateMobileLevelProgress computes D&D 5e XP progress and level-up flag', () => {
  const lvl1 = calculateMobileLevelProgress(150, 1);
  assert.equal(lvl1.calculatedLevel, 1);
  assert.equal(lvl1.nextLevelXp, 300);
  assert.equal(lvl1.progressPercent, 50);
  assert.equal(lvl1.hasLevelUp, false);

  const lvlUp = calculateMobileLevelProgress(950, 2);
  assert.equal(lvlUp.calculatedLevel, 3);
  assert.equal(lvlUp.nextLevelXp, 2700);
  assert.equal(lvlUp.hasLevelUp, true);

  const lvl20 = calculateMobileLevelProgress(400000, 20);
  assert.equal(lvl20.calculatedLevel, 20);
  assert.equal(lvl20.nextLevelXp, null);
  assert.equal(lvl20.progressPercent, 100);
});

test('resolveMobileCharacterCalendar computes anchor and base fantasy dates accurately', () => {
  const fromBase = resolveMobileCharacterCalendar({
    campaignBaseDate: { year: 1, month: 1, day: 1 },
    timeOffsetHours: 48,
  });
  assert.equal(fromBase.dateLabel, '3 Luna del Gelo, Anno 1');
  assert.equal(fromBase.hours, 48);

  const fromAnchor = resolveMobileCharacterCalendar({
    campaignBaseDate: { year: 1, month: 1, day: 1 },
    calendarAnchorDate: { year: 2, month: 4, day: 29 },
    calendarAnchorHours: 100,
    timeOffsetHours: 148,
  });
  assert.equal(fromAnchor.dateLabel, '1 Lame al Vento, Anno 2');
  assert.equal(fromAnchor.hours, 148);
});

test('getEldariaGuideSections splits rules, welcome section, and strips legacy compendium', () => {
  const raw = [
    '**[Regola Zero] La morte è reale**',
    'Testo regola.',
    'Compendio di Eldaria:',
    '- Voce vecchia',
    '## Benvenuto in Eldaria',
    'Benvenuto avventuriero!',
  ].join('\n');

  const parsed = getEldariaGuideSections(raw);
  assert.match(parsed.rules, /^## \[Regola Zero\] La morte è reale/m);
  assert.equal(parsed.rules.includes('Voce vecchia'), false);
  assert.equal(parsed.welcome, 'Benvenuto avventuriero!');
});

test('extractWikiEntityBody, resolveTelegramOrImageUrl, and mission formatters handle web payloads', () => {
  assert.equal(
    extractWikiEntityBody({ body: '## Titolo\nContenuto della voce wiki' }),
    '## Titolo\nContenuto della voce wiki'
  );
  assert.equal(
    extractWikiEntitySnippet({ summary: 'Breve sommario', body: 'Testo lungo' }),
    'Breve sommario'
  );
  assert.match(
    resolveTelegramOrImageUrl(null, 'file_abc_123') ?? '',
    /\/api\/tg-image\/file_abc_123$/
  );

  const sRank = formatMissionRankMeta('S');
  assert.equal(sRank.rank, 'S');
  assert.match(sRank.label, /Leggendario/);

  assert.equal(
    formatMissionTreasureLabel({ paga: 'Taglia Reale', treasure_gp: 50, treasure_sp: 5 }),
    'Taglia Reale (50 MO · 5 MA)'
  );
});

test('projectMobileCharacter reads top-level CharacterRulesSnapshotV1 markdown when character_sheet is absent', () => {
  const projected = projectMobileCharacter({
    id: 'char-long-1',
    campaign_id: 'camp-long-1',
    name: 'Theren',
    character_class: 'Mago',
    class_subclass: 'Scuola di Evocazione',
    level: 3,
    armor_class: 15,
    hit_points: 20,
    background: 'Nato a Silverymoon, custode di antichi tomi.',
    race_slug: 'elfo',
    subclass_slug: 'elfo_alto',
    background_slug: 'sapiente',
    rules_snapshot: {
      version: 1,
      max_hp: 20,
      cantripsKnown: 3,
      spellcastingAbility: 'int',
      raceTraitsMd: '### Scurovisione\nVedi al buio entro 18 metri.',
      classPrivilegesMd: '### Recupero Arcano\nRecuperi slot con riposo breve.',
      backgroundRulesMd: '### Ricercatore\nSai dove reperire informazioni.',
      spellsListMd: '### Trucchetti\n- Dardo di Fuoco',
      spellsDetailsMd: { 'Dardo di Fuoco': 'Attacco magico a distanza 1d10.' },
    },
  });

  assert.equal(projected.background, 'Nato a Silverymoon, custode di antichi tomi.');
  const snap = projected.rules_snapshot as any;
  assert.equal(snap.cantrips_known, 3);
  assert.equal(snap.spellcasting?.ability, 'int');
  assert.equal(snap.derived_rules?.spellsListMd, '### Trucchetti\n- Dardo di Fuoco');
  assert.equal(
    snap.derived_rules?.spellsDetailsMd?.['Dardo di Fuoco'],
    'Attacco magico a distanza 1d10.'
  );
  assert.equal(Array.isArray(snap.features), true);
  assert.equal(snap.features.some((f: any) => f.name === 'Recupero Arcano'), true);
  assert.equal(snap.features.some((f: any) => f.name === 'Ricercatore'), true);
});
