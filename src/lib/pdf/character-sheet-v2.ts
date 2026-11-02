import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';
import type { GeneratedCharacterSheet, GeneratedSpell, SkillKey, AbilityKey } from '@/lib/sheet-generator/types';
import { buildBardPrintModel, printPlainText, SKILL_LABELS, type BardPrintFeature } from '@/lib/sheet-generator/bard-print-model';
import { buildArtificerPrintModel } from '@/lib/sheet-generator/artificer-print-model';
import { artificerReferenceCards } from '@/lib/sheet-generator/artificer-reference-copy';
import { buildClericPrintModel, type ClericEvidence } from '@/lib/sheet-generator/cleric-print-model';
import type { ClericChoices } from '@/lib/sheet-generator/cleric-domains';
import { clericReferenceCards } from '@/lib/sheet-generator/cleric-reference-copy';
import { buildBarbarianPrintModel, type BarbarianEvidence } from '@/lib/sheet-generator/barbarian-print-model';
import type { BarbarianChoices } from '@/lib/sheet-generator/barbarian-paths';
import { barbarianReferenceCards } from '@/lib/sheet-generator/barbarian-reference-copy';
import { bardReferenceCards } from '@/lib/sheet-generator/bard-reference-copy';
import type { BardFightingStyle } from '@/lib/sheet-generator/bard-colleges';
import { sanitizeTextForStandardPdfFont } from './winansi-text';
import {
  drawFantasyFrame,
  drawFantasyBanner,
  drawFantasyTracker,
  drawFantasyShield,
  drawBardEmblem,
  drawBarbarianEmblem,
  drawClericEmblem,
  drawDruidEmblem,
  drawArtificerEmblem,
  drawFighterEmblem,
  drawRogueEmblem,
  drawWizardEmblem,
  drawMonkEmblem,
  drawPaladinEmblem,
  drawRangerEmblem,
  drawSorcererEmblem,
  drawWarlockEmblem,
} from './fantasy-sheet-graphics';
import type { DruidEvidence } from '@/lib/sheet-generator/druid-circles';
import { buildDruidPrintModel, druidReferenceCards } from '@/lib/sheet-generator/druid-print-model';
import type { FighterEvidence } from '@/lib/server/fighter-source';
import type { FighterChoices } from '@/lib/sheet-generator/fighter-archetypes';
import { buildFighterPrintModel } from '@/lib/sheet-generator/fighter-print-model';
import { fighterReferenceCards } from '@/lib/sheet-generator/fighter-reference-copy';
import type { RogueEvidence } from '@/lib/server/rogue-source';
import type { RogueChoices } from '@/lib/sheet-generator/rogue-archetypes';
import { buildRoguePrintModel } from '@/lib/sheet-generator/rogue-print-model';
import { rogueReferenceCards } from '@/lib/sheet-generator/rogue-reference-copy';
import type { WizardEvidence } from '@/lib/server/wizard-source';
import type { WizardChoices } from '@/lib/sheet-generator/wizard-traditions';
import { buildWizardPrintModel } from '@/lib/sheet-generator/wizard-print-model';
import { wizardReferenceCards } from '@/lib/sheet-generator/wizard-reference-copy';
import type { MonkEvidence } from '@/lib/server/monk-source';
import type { MonkChoices } from '@/lib/sheet-generator/monk-traditions';
import { buildMonkPrintModel } from '@/lib/sheet-generator/monk-print-model';
import { monkReferenceCards } from '@/lib/sheet-generator/monk-reference-copy';
import type { PaladinEvidence } from '@/lib/server/paladin-source';
import type { PaladinChoices } from '@/lib/sheet-generator/paladin-oaths';
import { buildPaladinPrintModel } from '@/lib/sheet-generator/paladin-print-model';
import { paladinReferenceCards } from '@/lib/sheet-generator/paladin-reference-copy';
import type { RangerEvidence } from '@/lib/server/ranger-source';
import type { RangerChoices } from '@/lib/sheet-generator/ranger-archetypes';
import { buildRangerPrintModel } from '@/lib/sheet-generator/ranger-print-model';
import { rangerReferenceCards } from '@/lib/sheet-generator/ranger-reference-copy';
import type { SorcererEvidence } from '@/lib/server/sorcerer-source';
import type { SorcererChoices } from '@/lib/sheet-generator/sorcerer-origins';
import { buildSorcererPrintModel } from '@/lib/sheet-generator/sorcerer-print-model';
import { sorcererReferenceCards } from '@/lib/sheet-generator/sorcerer-reference-copy';
import type { WarlockEvidence } from '@/lib/server/warlock-source';
import type { WarlockChoices } from '@/lib/sheet-generator/warlock-patrons';
import { buildWarlockPrintModel } from '@/lib/sheet-generator/warlock-print-model';
import {
  buildSteelDefenderStatBlock,
  buildHomunculusStatBlock,
  buildEldritchCannonStatBlock,
  buildBeastCompanionStatBlock,
  drawCompanionStatBlock,
  measureCompanionStatBlockHeight,
  type CompanionStatBlockData,
} from './companion-stat-block';
import {
  assertSheetSpellsVerifiedForPrint,
  getSpellOperativeSummary,
} from '@/lib/sheet-generator/spell-operative-summaries';
import {
  canonicalFeatureKey,
  cleanAndFilterManualFeatureBody,
  summarizeResolvedFeature,
  ABILITY_IT,
} from '@/lib/sheet-generator/feature-operative-summaries';
import type { PrintFeature } from '@/lib/sheet-generator/manual-feature-text';

export type CharacterSheetPrintOptions = {
  warlockEvidence?: WarlockEvidence;
  warlockChoices?: WarlockChoices;
  sorcererEvidence?: SorcererEvidence;
  sorcererChoices?: SorcererChoices;
  rangerEvidence?: RangerEvidence;
  rangerChoices?: RangerChoices;
  paladinEvidence?: PaladinEvidence;
  paladinChoices?: PaladinChoices;
  monkEvidence?: MonkEvidence;
  monkChoices?: MonkChoices;
  wizardEvidence?: WizardEvidence;
  wizardChoices?: WizardChoices;
  rogueEvidence?: RogueEvidence;
  rogueChoices?: RogueChoices;
  fighterEvidence?: FighterEvidence;
  fighterChoices?: FighterChoices;
  druidEvidence?: DruidEvidence;
  clericEvidence?: ClericEvidence;
  clericChoices?: ClericChoices;
  barbarianEvidence?: BarbarianEvidence;
  barbarianChoices?: BarbarianChoices;
  bonusSkills?: SkillKey[];
  collegeFeatures?: BardPrintFeature[];
  fightingStyle?: BardFightingStyle;
  story?: string;
  quickManualSections?: Array<{ title: string; body: string }>;
};

const W = 595.28,
  H = 841.89;
const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const PAPER = rgb(0.96, 0.95, 0.92);

const ABILITY_ABBR: Record<AbilityKey, string> = {
  str: 'FOR',
  dex: 'DES',
  con: 'COS',
  int: 'INT',
  wis: 'SAG',
  cha: 'CAR',
};

/** Measured wrapping: split a token only when it cannot fit a complete line. */
export function wrapSheetText(value: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of printPlainText(value).split('\n')) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      if (font.widthOfTextAtSize(word, size) > width) {
        if (line) {
          lines.push(line);
          line = '';
        }
        let part = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(part + ch, size) > width && part) {
            lines.push(part);
            part = '';
          }
          part += ch;
        }
        line = part;
      } else if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > width) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    if (line || lines.length === 0) lines.push(line);
  }
  return lines.filter((l, idx, arr) => l !== '' || arr.length === 1);
}

/** Resolves damage formulas like '1d4+INT+1' to concrete numbers like '1d4+6' */
function resolveDamageFormula(
  formula: string,
  abilityMods: Record<AbilityKey, number>
): string {
  return formula.replace(/\+(INT|FOR|DES|COS|SAG|CAR)(\+(\d+))?/gi, (_, ab, _plus, bonus) => {
    const key = (
      ab.toUpperCase() === 'INT'
        ? 'int'
        : ab.toUpperCase() === 'FOR'
        ? 'str'
        : ab.toUpperCase() === 'DES'
        ? 'dex'
        : ab.toUpperCase() === 'COS'
        ? 'con'
        : ab.toUpperCase() === 'SAG'
        ? 'wis'
        : 'cha'
    ) as AbilityKey;
    const mod = abilityMods[key] ?? 0;
    const b = bonus ? parseInt(bonus, 10) : 0;
    const total = mod + b;
    return total >= 0 ? `+${total}` : `${total}`;
  });
}

type InfusionTableRow = {
  title: string;
  itemLabel: string;
  sintonia: string;
  effect: string;
};

type FlowItem =
  | { kind: 'feature'; title: string; body: string }
  | { kind: 'inline'; label: string; body: string; indentContinuation?: number }
  | { kind: 'bullet'; text: string }
  | { kind: 'infusionRow'; row: InfusionTableRow };

type FlowSection = {
  title: string;
  items: FlowItem[];
  hasInfusionHeader?: boolean;
};

export async function renderCharacterSheetV2(
  original: GeneratedCharacterSheet,
  logoBytes: Uint8Array,
  options: CharacterSheetPrintOptions = {}
) {
  const bard =
    original.classLabel === 'Bardo'
      ? buildBardPrintModel(original, options.bonusSkills, options.collegeFeatures, options.fightingStyle)
      : null;
  const barbarian =
    original.classLabel === 'Barbaro' && options.barbarianEvidence
      ? buildBarbarianPrintModel(original, options.barbarianEvidence, options.barbarianChoices)
      : null;
  const cleric =
    original.classLabel === 'Chierico' && options.clericEvidence
      ? buildClericPrintModel(original, options.clericEvidence, options.clericChoices)
      : null;
  const artificer = original.classLabel === 'Artefice' ? buildArtificerPrintModel(original) : null;
  const druid =
    original.classLabel === 'Druido' && options.druidEvidence
      ? buildDruidPrintModel(original, options.druidEvidence)
      : null;
  const fighter =
    original.classLabel === 'Guerriero' && options.fighterEvidence
      ? buildFighterPrintModel(original, options.fighterEvidence, options.fighterChoices)
      : null;
  const rogue =
    original.classLabel === 'Ladro' && options.rogueEvidence
      ? buildRoguePrintModel(original, options.rogueEvidence, options.rogueChoices)
      : null;
  const wizard =
    original.classLabel === 'Mago' && options.wizardEvidence
      ? buildWizardPrintModel(original, options.wizardEvidence, options.wizardChoices)
      : null;
  const monk =
    original.classLabel === 'Monaco' && options.monkEvidence
      ? buildMonkPrintModel(original, options.monkEvidence, options.monkChoices)
      : null;
  const paladin =
    original.classLabel === 'Paladino' && options.paladinEvidence
      ? buildPaladinPrintModel(original, options.paladinEvidence, options.paladinChoices)
      : null;
  const ranger =
    original.classLabel === 'Ranger' && options.rangerEvidence
      ? buildRangerPrintModel(original, options.rangerEvidence, options.rangerChoices)
      : null;
  const sorcerer =
    original.classLabel === 'Stregone' && options.sorcererEvidence
      ? buildSorcererPrintModel(original, options.sorcererEvidence, options.sorcererChoices)
      : null;
  const warlock =
    original.classLabel === 'Warlock' && options.warlockEvidence
      ? buildWarlockPrintModel(original, options.warlockEvidence, options.warlockChoices)
      : null;

  const model =
    bard ??
    barbarian ??
    cleric ??
    artificer ??
    druid ??
    fighter ??
    rogue ??
    wizard ??
    monk ??
    paladin ??
    ranger ??
    sorcerer ??
    warlock;
  if (!model) throw new Error('Classe o fonti non supportate dalla V2.');
  const s = model.sheet;

  // Fail explicitly before generating any PDF pages if any spell lacks a verified operative summary or required metadata
  if (s.spells && s.spells.length > 0) {
    assertSheetSpellsVerifiedForPrint(s.spells);
  }

  const doc = await PDFDocument.create();
  doc.setTitle(`${s.characterName} - ${s.classLabel} V2`);

  // Load new logo if available on disk; fall back to logoBytes
  let effectiveLogoBytes = logoBytes;
  try {
    const v2LogoPath = path.join(process.cwd(), 'public/logo-v2.png');
    if (fs.existsSync(v2LogoPath)) {
      effectiveLogoBytes = fs.readFileSync(v2LogoPath);
    }
  } catch {
    // fallback
  }

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const logo = await doc.embedPng(effectiveLogoBytes);

  const clean = (v: unknown) => sanitizeTextForStandardPdfFont(String(v ?? ''));
  const text = (p: PDFPage, x: number, y: number, v: unknown, size = 8, f = font) =>
    p.drawText(clean(v), { x, y, size, font: f });
  const fit = (p: PDFPage, x: number, y: number, v: string, width: number, size = 10, f = font) => {
    const t = clean(v),
      m = f.widthOfTextAtSize(t, size);
    text(p, x, y, t, Math.min(size, m ? (size * width) / m : size), f);
  };
  const drawCardHeader = (p: PDFPage, x: number, top: number, width: number, title: string) => {
    const t = clean(title);
    const h = 16;
    const y = top - h - 4;
    const bannerW = width - 18;
    const bx = x + 9;
    p.drawRectangle({
      x: bx,
      y,
      width: bannerW,
      height: h,
      color: PAPER,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 0.6,
    });
    const size = Math.min(8, (bannerW - 12) / Math.max(1, bold.widthOfTextAtSize(t, 1)));
    p.drawText(t, {
      x: bx + (bannerW - bold.widthOfTextAtSize(t, size)) / 2,
      y: y + (h - size) / 2 + 1,
      size,
      font: bold,
      color: rgb(0.12, 0.12, 0.12),
    });
  };

  const frame = (p: PDFPage, x: number, top: number, width: number, height: number, title?: string) => {
    drawFantasyFrame(p, { x, y: top - height, width, height });
    if (title) drawCardHeader(p, x, top, width, title);
  };

  const drawSectionBanner = (p: PDFPage, top: number, title: string) => {
    const t = clean(title);
    const w = 525;
    const x = 35;
    const h = 18;
    const y = top - h;
    const size = Math.min(9, (w - 24.2) / Math.max(1, bold.widthOfTextAtSize(t, 1)));
    drawFantasyBanner(p, { x, y, width: w, height: h }, t, bold, size);
  };

  const drawEmblem = (p: PDFPage, box: { x: number; y: number; width: number; height: number }) => {
    (
      warlock
        ? drawWarlockEmblem
        : sorcerer
        ? drawSorcererEmblem
        : ranger
        ? drawRangerEmblem
        : paladin
        ? drawPaladinEmblem
        : monk
        ? drawMonkEmblem
        : wizard
        ? drawWizardEmblem
        : bard
        ? drawBardEmblem
        : artificer
        ? drawArtificerEmblem
        : cleric
        ? drawClericEmblem
        : druid
        ? drawDruidEmblem
        : fighter
        ? drawFighterEmblem
        : rogue
        ? drawRogueEmblem
        : drawBarbarianEmblem
    )(p, box);
  };

  /** Page 1: Full Header with new logo and all identity attributes */
  const newFirstPage = (title: string): PDFPage => {
    const p = doc.addPage([W, H]);
    drawFantasyFrame(p, { x: 18, y: 30, width: W - 36, height: H - 48 });

    // Logo on left (aspect ratio ~0.73)
    const scale = Math.min(50 / logo.width, 54 / logo.height);
    const lw = logo.width * scale,
      lh = logo.height * scale;
    p.drawImage(logo, { x: 27 + (50 - lw) / 2, y: 760 + (54 - lh) / 2, width: lw, height: lh });

    // Full Header Frame next to logo (2 clean rows, height 54)
    drawFantasyFrame(p, { x: 84, y: 760, width: 484, height: 54 });
    const rule = (x: number, y: number, xx: number, yy: number) =>
      p.drawLine({ start: { x, y }, end: { x: xx, y: yy }, thickness: 0.45, color: rgb(0.35, 0.35, 0.35) });

    // Single dividing horizontal line between Row 1 and Row 2
    rule(87, 787, 565, 787);

    // Row 1 vertical dividers (Nome, Razza, Background)
    rule(270, 814, 270, 787);
    rule(430, 814, 430, 787);

    // Row 2 vertical dividers (Classe, Sottoclasse, Allineamento & Dati Fisici, Livello)
    rule(190, 787, 190, 760);
    rule(345, 787, 345, 760);
    rule(515, 787, 515, 760);

    // Row 1 Content
    text(p, 92, 803, 'NOME', 6);
    fit(p, 92, 792, s.characterName, 172, 11, bold);
    text(p, 276, 803, 'RAZZA E SOTTORAZZA', 6);
    const fullRace = s.subraceLabel ? `${s.raceLabel} (${s.subraceLabel})` : s.raceLabel;
    fit(p, 276, 792, fullRace, 148, 9);
    text(p, 436, 803, 'BACKGROUND', 6);
    fit(p, 436, 792, s.backgroundLabel, 124, 9);

    // Row 2 Content
    drawEmblem(p, { x: 88, y: 762, width: 24, height: 21 });
    text(p, 118, 777, 'CLASSE', 5.5);
    fit(p, 118, 766, s.classLabel.toUpperCase(), 68, 9.5, bold);

    text(p, 196, 777, 'SOTTOCLASSE', 5.5);
    fit(p, 196, 766, s.classSubclass ?? '-', 142, 8.5);

    text(p, 351, 777, 'ALLINEAMENTO E DATI FISICI', 5.5);
    const physicalParts = [
      s.alignment,
      s.sex,
      s.age ? `${s.age} a.` : '',
      s.height,
      s.weight,
    ].filter(Boolean);
    const physText = physicalParts.join(' • ') || '-';
    fit(p, 351, 766, physText, 158, 8);

    text(p, 523, 777, 'LIVELLO', 5.5);
    text(p, 532, 765, String(s.level), 11, bold);

    // Section banner: 8pt below header frame
    drawSectionBanner(p, 752, title);
    return p;
  };

  /** Pages 2+: Reduced Header (saves ~50pt vertical space per page!) */
  const newSubsequentPage = (sectionTitle: string): PDFPage => {
    const p = doc.addPage([W, H]);
    drawFantasyFrame(p, { x: 18, y: 30, width: W - 36, height: H - 48 });

    // Small logo on left
    const scale = Math.min(24 / logo.width, 30 / logo.height);
    p.drawImage(logo, { x: 27, y: 770, width: logo.width * scale, height: logo.height * scale });

    // Header strip
    drawFantasyFrame(p, { x: 55, y: 770, width: 513, height: 30 });
    text(p, 64, 788, 'PERSONAGGIO', 5.5);
    fit(p, 64, 776, s.characterName, 175, 10, bold);

    text(p, 245, 788, 'CLASSE E LIVELLO', 5.5);
    fit(
      p,
      245,
      776,
      `${s.classLabel} ${s.level}${s.classSubclass ? ' (' + s.classSubclass + ')' : ''}`,
      315,
      9
    );

    // Section banner: 8pt below header strip
    drawSectionBanner(p, 762, sectionTitle);
    return p;
  };

  // --- PAGE 1: IMMEDIATE COMBAT & PLAY ---
  const first = newFirstPage('SCHEDA DEL PERSONAGGIO - V2');

  // LEFT COLUMN: Proficiency Bonus + Abilities + Passive Perception
  drawFantasyFrame(first, { x: 27, y: 684, width: 175, height: 40 });
  const pbLabel = 'BONUS DI COMPETENZA';
  text(first, 27 + (175 - bold.widthOfTextAtSize(pbLabel, 7.5)) / 2, 710, pbLabel, 7.5, bold);
  const pbVal = `+${s.proficiencyBonus}`;
  text(first, 27 + (175 - bold.widthOfTextAtSize(pbVal, 16)) / 2, 692, pbVal, 16, bold);

  const names: Record<AbilityKey, string> = {
    str: 'FORZA',
    dex: 'DESTREZZA',
    con: 'COSTITUZIONE',
    int: 'INTELLIGENZA',
    wis: 'SAGGEZZA',
    cha: 'CARISMA',
  };
  const groups: Record<AbilityKey, SkillKey[]> = {
    str: ['athletics'],
    dex: ['acrobatics', 'stealth', 'sleight_of_hand'],
    con: [],
    int: ['arcana', 'investigation', 'nature', 'religion', 'history'],
    wis: ['animal_handling', 'insight', 'medicine', 'perception', 'survival'],
    cha: ['deception', 'intimidation', 'performance', 'persuasion'],
  };

  const abilityHeights: Record<AbilityKey, number> = {
    str: 56,
    dex: 76,
    con: 52,
    int: 96,
    wis: 96,
    cha: 86,
  };

  let abY = 676;
  for (const key of Object.keys(names) as AbilityKey[]) {
    const height = abilityHeights[key];
    const top = abY;
    const box = { x: 27, y: top - height, width: 175, height };

    drawFantasyFrame(first, box);
    drawCardHeader(first, box.x, top, box.width, names[key]);

    const score = String(s.abilities[key]);
    const modifier = sign(s.abilityMods[key]);
    const leftCenter = box.x + 24;

    text(first, leftCenter - font.widthOfTextAtSize(score, 9.5) / 2, top - 32, score, 9.5);
    text(first, leftCenter - bold.widthOfTextAtSize(modifier, 16) / 2, top - 48, modifier, 16, bold);

    first.drawLine({
      start: { x: box.x + 48, y: top - 24 },
      end: { x: box.x + 48, y: top - height + 6 },
      thickness: 0.4,
      color: rgb(0.6, 0.6, 0.6),
    });

    const rows = [
      { label: 'Tiro salvezza', value: s.savingThrows[key].value, marker: '' },
      ...groups[key].map((sk) => {
        const v = s.skills[sk];
        return { label: SKILL_LABELS[sk], value: v.value, marker: v.expertise ? 'M' : v.proficient ? 'C' : '-' };
      }),
    ];

    rows.forEach((row, idx) => {
      const rowY = top - 32 - idx * 10;
      const mText = row.marker ? `${row.marker} ` : '';
      text(first, box.x + 52, rowY, mText, 6.5, bold);
      fit(first, box.x + 62, rowY, row.label, 90, 7);
      text(first, box.x + 155, rowY, sign(row.value), 7.5, bold);
    });

    abY -= height + 5;
  }

  // Passive Perception Box
  drawFantasyFrame(first, { x: 27, y: 144, width: 175, height: 32 });
  const ppLabel = 'PERCEZIONE PASSIVA';
  text(first, 27 + (175 - bold.widthOfTextAtSize(ppLabel, 7)) / 2, 164, ppLabel, 7, bold);
  const ppVal = `${s.passivePerception}`;
  text(first, 27 + (175 - bold.widthOfTextAtSize(ppVal, 14)) / 2, 150, ppVal, 14, bold);

  // Senses / Inspiration Notes
  drawFantasyFrame(first, { x: 27, y: 100, width: 175, height: 38 });
  const combinedRaceText = `${s.raceTraitsMd} ${s.subraceTraitsMd ?? ''}`;
  const hasDarkvision = /scurovisione|darkvision|luce fioca/i.test(combinedRaceText);
  const dvRange = /36\s*metri|36\s*m|120\s*ft/i.test(combinedRaceText) ? '36 m' : '18 m';
  const senseText = hasDarkvision ? `Scurovisione ${dvRange}` : 'Visione normale';
  text(first, 36, 122, senseText, 7.5, bold);
  text(first, 36, 110, 'C: competenza  M: maestria | Ispiraz. [  ]', 6.8);

  // CENTER COLUMN: Defense (3 separate boxes) + HP & Hit Dice + Death Saves + Attacks + Combat Resources
  drawFantasyFrame(first, { x: 212, y: 674, width: 52, height: 50 });
  text(first, 212 + (52 - bold.widthOfTextAtSize('CA', 7)) / 2, 712, 'CA', 7, bold);
  const caVal = `${s.armorClass}`;
  text(first, 212 + (52 - bold.widthOfTextAtSize(caVal, 18)) / 2, 688, caVal, 18, bold);

  drawFantasyFrame(first, { x: 268, y: 674, width: 52, height: 50 });
  const initLbl = 'INIZIATIVA';
  text(first, 268 + (52 - bold.widthOfTextAtSize(initLbl, 6)) / 2, 712, initLbl, 6, bold);
  const initVal = `${sign(s.initiative)}`;
  text(first, 268 + (52 - bold.widthOfTextAtSize(initVal, 18)) / 2, 688, initVal, 18, bold);

  // Velocità box with clean multi-line fitting for conditional speed notes like "(+3 m senza armatura)"
  drawFantasyFrame(first, { x: 324, y: 674, width: 56, height: 50 });
  const spdLbl = 'VELOCITÀ';
  text(first, 324 + (56 - bold.widthOfTextAtSize(spdLbl, 6)) / 2, 712, spdLbl, 6, bold);
  const spdClean = clean(s.speed);
  const spdMatch = spdClean.match(/^([^(]+?)\s*(\(.+\))?$/);
  const spdPrimary = (spdMatch?.[1] ?? spdClean).trim();
  const spdSecondary = spdMatch?.[2]?.trim() ?? '';
  if (spdSecondary) {
    const pSize = Math.min(11.5, (48 / Math.max(1, bold.widthOfTextAtSize(spdPrimary, 1))));
    text(first, 324 + (56 - bold.widthOfTextAtSize(spdPrimary, pSize)) / 2, 694, spdPrimary, pSize, bold);
    const noteLines = wrapSheetText(spdSecondary, font, 5.2, 48).slice(0, 2);
    noteLines.forEach((nl, idx) => {
      text(first, 324 + (56 - font.widthOfTextAtSize(nl, 5.2)) / 2, 684 - idx * 6, nl, 5.2);
    });
  } else {
    const pSize = Math.min(13, (48 / Math.max(1, bold.widthOfTextAtSize(spdPrimary, 1))));
    text(first, 324 + (56 - bold.widthOfTextAtSize(spdPrimary, pSize)) / 2, 690, spdPrimary, pSize, bold);
  }

  // Distinct HP & Hit Dice Box
  frame(first, 212, 666, 168, 104, 'PUNTI FERITA E DADI VITA');
  const hpBoxW = 48;
  const hpBoxH = 32;
  const hpY = 608;
  first.drawRectangle({ x: 218, y: hpY, width: hpBoxW, height: hpBoxH, borderColor: rgb(0.4, 0.4, 0.4), borderWidth: 0.5, color: rgb(0.98, 0.98, 0.97) });
  text(first, 218 + (hpBoxW - bold.widthOfTextAtSize('MAX', 6.5)) / 2, hpY + hpBoxH - 9, 'MAX', 6.5, bold);
  text(first, 218 + (hpBoxW - bold.widthOfTextAtSize(`${s.hpMax}`, 13)) / 2, hpY + 6, `${s.hpMax}`, 13, bold);

  first.drawRectangle({ x: 271, y: hpY, width: 50, height: hpBoxH, borderColor: rgb(0.4, 0.4, 0.4), borderWidth: 0.5, color: rgb(0.98, 0.98, 0.97) });
  text(first, 271 + (50 - bold.widthOfTextAtSize('ATTUALI', 6.5)) / 2, hpY + hpBoxH - 9, 'ATTUALI', 6.5, bold);
  first.drawLine({ start: { x: 275, y: hpY + 7 }, end: { x: 317, y: hpY + 7 }, thickness: 0.4, color: rgb(0.5, 0.5, 0.5) });

  first.drawRectangle({ x: 326, y: hpY, width: 48, height: hpBoxH, borderColor: rgb(0.4, 0.4, 0.4), borderWidth: 0.5, color: rgb(0.98, 0.98, 0.97) });
  text(first, 326 + (48 - bold.widthOfTextAtSize('TEMP', 6.5)) / 2, hpY + hpBoxH - 9, 'TEMP', 6.5, bold);
  first.drawLine({ start: { x: 330, y: hpY + 7 }, end: { x: 370, y: hpY + 7 }, thickness: 0.4, color: rgb(0.5, 0.5, 0.5) });

  text(first, 222, hpY - 14, `Dadi Vita: ${s.hitDiceTotal} ${s.hitDie}`, 8, bold);
  text(first, 222, hpY - 26, 'Dadi Vita spesi: ________________', 7.5);

  // Salvezze da Morte
  frame(first, 212, 554, 168, 56, 'SALVEZZE DA MORTE');
  text(first, 224, 524, 'Successi', 7.5);
  drawFantasyTracker(first, { x: 288, y: 518, width: 80, height: 16 }, 3);
  text(first, 224, 506, 'Fallimenti', 7.5);
  drawFantasyTracker(first, { x: 288, y: 500, width: 80, height: 16 }, 3);

  // Dynamic Attacks Box (no silent .slice(0, 3) drop!)
  const extraAttacksCount = fighter
    ? s.level >= 20
      ? 4
      : s.level >= 11
      ? 3
      : s.level >= 5
      ? 2
      : 1
    : s.level >= 5 &&
      (barbarian ||
        paladin ||
        ranger ||
        monk ||
        (artificer && /fabbro da battaglia|battle smith|armaiolo|armorer/i.test(s.classSubclass ?? '')))
    ? 2
    : s.level >= 6 &&
      ((bard && /valore|spade/i.test(s.classSubclass ?? '')) ||
        (wizard && /cantore della lama|bladesing/i.test(s.classSubclass ?? '')))
    ? 2
    : 1;

  const maxAttacksOnPage1 = 6;
  const page1Weapons = s.weaponRows.slice(0, maxAttacksOnPage1);
  const overflowWeapons = s.weaponRows.slice(maxAttacksOnPage1);
  const attackRowsH = Math.max(2, page1Weapons.length) * 13 + (extraAttacksCount > 1 ? 13 : 0);
  const attacksBoxH = Math.max(68, 34 + attackRowsH + 6);
  frame(first, 212, 490, 168, attacksBoxH, 'ATTACCHI');
  let curAtkY = 490 - 30;
  page1Weapons.forEach((a) => {
    const resolvedDmg = resolveDamageFormula(a.damage, s.abilityMods);
    const rowStr = `${a.name} ${a.toHit} / ${resolvedDmg} (${a.type.slice(0, 4)}.)`;
    fit(first, 220, curAtkY, rowStr, 152, 7.6, bold);
    curAtkY -= 13;
  });
  if (extraAttacksCount > 1) {
    text(first, 220, curAtkY + 1, `Attacco Extra: ${extraAttacksCount} attacchi per azione`, 6.9);
  }

  // Class Combat Resources (Page 1, placed dynamically 8pt below ATTACCHI)
  const resTop = 490 - attacksBoxH - 8;
  const resH = 114;
  if (artificer) {
    const state = artificer.state;
    const attuned = state.assignments.filter((a) => a.state === 'attuned' || a.state === 'carried-attuned').length;
    frame(first, 212, resTop, 168, resH, 'RISORSE DI CLASSE');
    const intMod = Math.max(1, s.abilityMods.int);
    if (s.level >= 7) {
      text(first, 224, resTop - 30, `Lampo di Genio: ${intMod} usi / lungo`, 7.8, bold);
      drawFantasyTracker(first, { x: 224, y: resTop - 46, width: 140, height: 16 }, intMod);
      fit(first, 224, resTop - 60, `Reazione (visibile 9 m): +${intMod} a prova o TS`, 144, 7);
    } else {
      text(first, 224, resTop - 30, 'Inventore Arcano / Strumenti', 8, bold);
      fit(first, 224, resTop - 46, `Azione: magia lieve in max ${intMod} ogg. Minuscoli`, 144, 7);
    }
    text(first, 224, resTop - 76, `Infusioni attive: ${state.assignments.length}/${state.itemLimit}`, 7.8, bold);
    text(first, 224, resTop - 90, `Sintonia usata: ${attuned}/${state.attunementLimit}`, 7.5);
    text(first, 224, resTop - 104, 'Incantesimi e slot sulle pagine seguenti.', 6.8);
  } else if (bard) {
    frame(first, 212, resTop, 168, resH, 'ISPIRAZIONE BARDICA');
    drawFantasyShield(first, { x: 226, y: resTop - 92, width: 40, height: 50 }, bard.die, bold);
    drawFantasyTracker(first, { x: 279, y: resTop - 77, width: 96, height: 34 }, bard.uses);
    text(first, 277, resTop - 89, `${bard.uses} utilizzi (${bard.die})`);
    text(first, 222, resTop - 104, s.level >= 5 ? 'Recupero: riposo breve o lungo' : 'Recupero: riposo lungo', 7.3);
  } else if (barbarian) {
    frame(first, 212, resTop, 168, resH, 'IRA E COMBATTIMENTO');
    drawFantasyShield(first, { x: 226, y: resTop - 92, width: 40, height: 50 }, `+${barbarian.rage.damage}`, bold);
    if (barbarian.rage.uses !== null)
      drawFantasyTracker(first, { x: 279, y: resTop - 77, width: 96, height: 34 }, barbarian.rage.uses);
    text(first, 277, resTop - 89, barbarian.rage.uses === null ? 'Usi illimitati' : `${barbarian.rage.uses} utilizzi`);
    text(first, 222, resTop - 104, 'Recupero: riposo lungo', 7.5);
  } else if (cleric) {
    frame(first, 212, resTop, 168, resH, s.level >= 2 ? 'INCANALARE DIVINITÀ' : 'POTERE DIVINO');
    const cdUses = s.level >= 18 ? 3 : s.level >= 6 ? 2 : s.level >= 2 ? 1 : 0;
    if (cdUses > 0) {
      text(first, 224, resTop - 30, `Incanalare Divinità: ${cdUses} usi / riposo`, 8, bold);
      drawFantasyTracker(first, { x: 224, y: resTop - 50, width: 140, height: 16 }, cdUses);
      text(first, 224, resTop - 68, `CD Incantesimi e Divinità: ${s.spellSaveDc}`, 7.8);
      if (s.level >= 5) {
        text(first, 224, resTop - 84, `Distruggere Non Morti: GS ${cleric.undeadCr ?? '-'}`, 7.8, bold);
      }
      text(first, 224, resTop - 102, 'Recupero: riposo breve o lungo', 7.2);
    } else {
      fit(first, 224, resTop - 34, `Dominio: ${s.classSubclass ?? '-'}`, 144, 8, bold);
      text(first, 224, resTop - 52, `Incantesimi preparabili: ${s.spellsPrepared}`, 7.8);
      text(first, 224, resTop - 68, `CD Incantesimi: ${s.spellSaveDc} | TpC: ${sign(s.spellAttackBonus ?? 0)}`, 7.5);
      text(first, 224, resTop - 96, 'Magie di dominio sempre preparate.', 7);
    }
  } else if (druid) {
    frame(first, 212, resTop, 168, resH, s.level >= 2 ? 'FORMA SELVATICA' : 'MAGIA DRUIDICA');
    if (s.level >= 2) {
      const wsUses = s.level >= 20 ? 'Illimitati' : '2 usi / riposo';
      text(first, 224, resTop - 30, `Forma Selvatica: ${wsUses}`, 8, bold);
      if (s.level < 20) {
        drawFantasyTracker(first, { x: 224, y: resTop - 50, width: 140, height: 16 }, 2);
      }
      const moon = /circolo della luna/i.test(s.classSubclass ?? '');
      const maxCr = moon ? (s.level >= 6 ? Math.floor(s.level / 3) : 1) : s.level >= 8 ? 1 : s.level >= 4 ? 0.5 : 0.25;
      const crLabel = maxCr === 0.25 ? '1/4' : maxCr === 0.5 ? '1/2' : String(maxCr);
      fit(first, 224, resTop - 68, `GS Max: ${crLabel} (${s.level >= 8 ? 'Volo/Nuoto' : s.level >= 4 ? 'Nuoto' : 'Terra'})`, 144, 7.2);
      text(first, 224, resTop - 84, `CD Salvezza: ${s.spellSaveDc}`, 7.5);
      text(first, 224, resTop - 102, 'Recupero: riposo breve o lungo', 7.2);
    } else {
      text(first, 224, resTop - 36, `Incantesimi preparabili: ${s.spellsPrepared}`, 8, bold);
      text(first, 224, resTop - 54, `CD Incantesimi: ${s.spellSaveDc} | TpC: ${sign(s.spellAttackBonus ?? 0)}`, 7.5);
      text(first, 224, resTop - 74, 'Linguaggio Druidico conosciuto.', 7.2);
    }
  } else if (fighter) {
    const res = fighter.resources;
    frame(first, 212, resTop, 168, resH, 'RISORSE MARZIALI');
    text(first, 224, resTop - 30, `Recuperare Energie: ${res.secondWind}`, 7.8, bold);
    fit(first, 224, resTop - 44, 'Azione bonus (1 uso / riposo breve o lungo)', 144, 7);
    drawFantasyTracker(first, { x: 224, y: resTop - 62, width: 140, height: 16 }, 1);
    if (res.actionSurge > 0) {
      text(first, 224, resTop - 78, `Azione Impetuosa: ${res.actionSurge} usi / riposo`, 7.8, bold);
      drawFantasyTracker(first, { x: 224, y: resTop - 96, width: 140, height: 16 }, res.actionSurge);
      text(first, 224, resTop - 108, 'Recupero: riposo breve o lungo', 6.8);
    } else {
      const st = options.fighterChoices?.fightingStyle ?? '-';
      fit(first, 224, resTop - 84, `Stile: ${st}`, 144, 7.6, bold);
    }
  } else if (rogue) {
    const res = rogue.resources;
    frame(first, 212, resTop, 168, resH, 'ATTACCO FURTIVO');
    drawFantasyShield(first, { x: 224, y: resTop - 84, width: 44, height: 44 }, res.sneakAttackDamage, bold);
    text(first, 276, resTop - 56, `Danno: ${res.sneakAttackDamage}`, 9.5, bold);
    text(first, 276, resTop - 70, `Dadi: ${res.sneakAttackDice}d6`, 8);
    fit(first, 222, resTop - 92, '1 v/turno: vantaggio o alleato entro 1,5 m', 148, 6.8);
    fit(first, 222, resTop - 104, 'Richiede arma accurata o a distanza', 148, 6.8);
  } else if (monk) {
    const res = monk.resources;
    frame(first, 212, resTop, 168, resH, s.level >= 2 ? 'PUNTI KI E ARTI MARZIALI' : 'ARTI MARZIALI');
    drawFantasyShield(first, { x: 224, y: resTop - 84, width: 44, height: 44 }, res.martialArtsDie, bold);
    if (res.kiPoints > 0) {
      text(first, 276, resTop - 54, `Punti Ki: ${res.kiPoints}`, 9.5, bold);
      text(first, 276, resTop - 68, `CD Ki: ${res.kiSaveDc}`, 8.5);
      drawFantasyTracker(first, { x: 270, y: resTop - 88, width: 100, height: 16 }, Math.min(res.kiPoints, 6));
      text(first, 222, resTop - 104, 'Recupero Ki: riposo breve o lungo', 7.2);
    } else {
      text(first, 276, resTop - 58, `Dado Arti: ${res.martialArtsDie}`, 8.5, bold);
      text(first, 276, resTop - 72, '1 att. senz\'armi bonus', 7.2);
      text(first, 222, resTop - 102, 'Senza armatura e senza scudo', 7);
    }
  } else if (paladin) {
    const res = paladin.resources;
    frame(first, 212, resTop, 168, resH, 'RISORSE DEL PALADINO');
    text(first, 224, resTop - 30, `Imposizione Mani: ${res.layOnHandsPool} PF`, 8, bold);
    fit(first, 224, resTop - 44, `Riserva PF: ${res.layOnHandsPool} (5 PF curano veleno)`, 144, 6.8);
    text(first, 224, resTop - 62, `Senso del Divino: ${res.divineSenseUses} usi / lungo`, 7.8, bold);
    drawFantasyTracker(first, { x: 224, y: resTop - 80, width: 140, height: 16 }, Math.min(res.divineSenseUses, 9));
    if (res.channelDivinityUses > 0) {
      text(first, 224, resTop - 94, `Incanalare Divinità: ${res.channelDivinityUses} uso / riposo breve`, 7.3);
    }
    text(first, 224, resTop - 107, s.level >= 2 ? 'Punizione Divina e magie nelle pagg. seguenti.' : 'Recupero risorse a riposo lungo.', 6.6);
  } else if (ranger) {
    const res = ranger.resources;
    frame(first, 212, resTop, 168, resH, 'RISORSE DEL RANGER');
    text(first, 224, resTop - 30, 'Nemico Prescelto:', 7.8, bold);
    fit(first, 224, resTop - 42, res.favoredEnemies.join(', ') || 'Nessuno', 144, 7);
    text(first, 224, resTop - 58, 'Esploratore Nato (Terreni):', 7.8, bold);
    fit(first, 224, resTop - 70, res.favoredTerrains.join(', ') || 'Nessuno', 144, 7);
    if (s.level >= 3) {
      fit(first, 224, resTop - 86, `Archetipo: ${s.classSubclass ?? 'Ranger'}`, 144, 7.5, bold);
      text(first, 224, resTop - 100, `CD Incantesimi: ${res.spellSaveDc} | TpC: ${sign(res.spellAttackBonus)}`, 7.2);
    } else if (s.level >= 2) {
      text(first, 224, resTop - 92, `CD Incantesimi: ${res.spellSaveDc} | TpC: ${sign(res.spellAttackBonus)}`, 7.2);
    } else {
      text(first, 224, resTop - 96, 'Vantaggio a seguire tracce dei nemici prescelti', 6.8);
    }
  } else if (sorcerer) {
    const res = sorcerer.resources;
    frame(first, 212, resTop, 168, resH, s.level >= 2 ? 'PUNTI STREGONERIA' : 'MAGIA INNATA');
    if (res.sorceryPoints > 0) {
      text(first, 224, resTop - 30, `Punti Stregoneria: ${res.sorceryPoints}`, 8.5, bold);
      drawFantasyTracker(first, { x: 224, y: resTop - 50, width: 140, height: 16 }, Math.min(res.sorceryPoints, 9));
      if (s.level >= 3) {
        text(first, 224, resTop - 68, `Metamagia: ${res.metamagic.length} opzioni note`, 7.8);
      }
      fit(first, 224, resTop - 84, 'Converti punti <-> slot con azione bonus', 144, 6.8);
      text(first, 224, resTop - 102, 'Recupero Punti: riposo lungo', 7.2);
    } else {
      fit(first, 224, resTop - 36, `Origine: ${s.classSubclass ?? '-'}`, 144, 8, bold);
      text(first, 224, resTop - 54, `Trucchetti: ${res.cantripsKnown} | Inc. noti: ${res.spellsKnown}`, 7.5);
      text(first, 224, resTop - 72, `CD Incantesimi: ${res.spellSaveDc} | TpC: ${sign(res.spellAttackBonus)}`, 7.5);
    }
  } else if (warlock) {
    const res = warlock.resources;
    frame(first, 212, resTop, 168, resH, 'MAGIA DEL PATTO');
    text(first, 224, resTop - 30, `Slot del Patto: ${res.pactSlotsCount} di ${res.pactSlotLevel}° Liv.`, 8.5, bold);
    drawFantasyTracker(first, { x: 224, y: resTop - 50, width: 140, height: 16 }, res.pactSlotsCount);
    if (s.level >= 2) {
      text(first, 224, resTop - 68, `Suppliche Occulte: ${res.invocationsCount} note`, 7.8);
    }
    if (s.level >= 3 && res.pactBoon) {
      fit(first, 224, resTop - 84, `Dono del Patto: ${res.pactBoon.name}`, 144, 7.5);
    }
    text(first, 224, resTop - 102, 'Recupero Slot: riposo breve o lungo', 7.2);
  } else if (wizard) {
    const res = wizard.resources;
    frame(first, 212, resTop, 168, resH, 'RECUPERO ARCANO');
    text(first, 224, resTop - 30, `Recupero Arcano: ${res.arcaneRecoveryLevels} liv. slot`, 7.8, bold);
    fit(first, 224, resTop - 44, '1 volta/giorno al termine di un riposo breve', 144, 7.2);
    text(first, 224, resTop - 62, `Incantesimi Preparabili: ${res.spellsPrepared}`, 7.8, bold);
    if (res.arcaneWardHp) {
      text(first, 224, resTop - 80, `Barriera Arcana: ${res.arcaneWardHp} PF`, 7.8, bold);
    } else if (res.portentDiceCount) {
      text(first, 224, resTop - 80, `Presagio: ${res.portentDiceCount} d20 dopo riposo lungo`, 7.8, bold);
    } else if (res.bladesongUses) {
      text(first, 224, resTop - 80, `Canto Lama: ${res.bladesongUses} usi (+${res.bladesongAcBonus} CA)`, 7.8, bold);
    } else {
      text(first, 224, resTop - 80, `Trucchetti noti: ${res.cantripsKnown} | CD ${res.spellSaveDc}`, 7.5);
    }
    text(first, 224, resTop - 104, 'Incantesimi e rituali nelle pagine seguenti.', 6.8);
  }

  // RIGHT COLUMN (PAGE 1): Combat & Core Reference Cards (level-gated, choice-filtered, true measured height)
  const buildPage1CandidateCards = (): Array<{ title: string; body: string }> => {
    if (artificer) {
      const sub = (s.classSubclass ?? '').toLowerCase();
      const cards: Array<{ title: string; body: string }> = [];
      if (s.level >= 3 && (sub.includes('fabbro da battaglia') || sub.includes('battle smith'))) {
        cards.push({
          title: 'Pronto per la Battaglia',
          body: 'Ottieni competenza nelle armi da guerra. Quando attacchi con un\'arma magica, puoi usare il modificatore di Intelligenza invece di Forza o Destrezza per i tiri per colpire e per i danni.',
        });
      } else if (s.level >= 3 && (sub.includes('armaiolo') || sub.includes('armorer'))) {
        const isInfiltrator = s.weaponRows.some((w) => w.name.includes('Fulmini'));
        cards.push({
          title: `Armatura Arcana (${isInfiltrator ? 'Infiltrato' : 'Custode'})`,
          body: isInfiltrator
            ? 'Lanciatore di Fulmini (gittata 27/90 m, 1d6 da fulmine, +1d6 extra 1 volta/turno), Passo Veloce (+1,5 m velocità) e Campo Smorzante (vantaggio a Furtività).'
            : 'Guanti Tonanti (mischia, 1d8 da tuono; bersaglio colpito ha svantaggio ai TpC contro bersagli diversi da te) e Campo Difensivo (azione bonus: PF temp pari al livello, BC usi/riposo lungo).',
        });
      } else if (s.level >= 3 && (sub.includes('alchimista') || sub.includes('alchemist'))) {
        cards.push({
          title: 'Elisir Sperimentale',
          body: `Fine riposo lungo (con scorte da alchimista): crei ${s.level >= 15 ? 3 : s.level >= 6 ? 2 : 1} elisir casuale (d6: Guarigione, Rapidità, Resilienza, Audacia, Volo o Trasformazione). Puoi spendere 1 slot incantesimo per crearne uno scelto. Bere/somministrare richiede 1 azione.`,
        });
      } else if (s.level >= 3 && (sub.includes('artigliere') || sub.includes('artillerist'))) {
        cards.push({
          title: 'Cannone Occulto',
          body: 'Azione (con strumenti da falegname o da fabbro): crei 1 Cannone Occulto Piccolo o Minuscolo entro 1,5 m (1 gratis/riposo lungo o spendendo 1 slot; dura 1 ora). Nel tuo turno usi azione bonus per attivarlo entro 18 m (vedi scheda Compagno).',
        });
      }
      if (s.level >= 5 && (sub.includes('fabbro da battaglia') || sub.includes('battle smith') || sub.includes('armaiolo') || sub.includes('armorer'))) {
        cards.push({
          title: 'Attacco Extra',
          body: 'Puoi attaccare due volte invece di una ogni volta che effettui l\'azione di Attacco nel tuo turno.',
        });
      }
      const refCards = artificerReferenceCards(s.level);
      const flash = refCards.find((c) => canonicalFeatureKey(c.title) === 'lampo di genio');
      if (flash) {
        cards.push({
          title: 'Lampo di Genio',
          body: `Reazione: quando tu o un'altra creatura entro 9 m che sei in grado di vedere effettuate una prova di caratteristica o un TS, puoi aggiungere il tuo modificatore di Intelligenza (${sign(s.abilityMods.int)}) al tiro. Usi: ${Math.max(1, s.abilityMods.int)} / riposo lungo.`,
        });
      }
      const tinkering = refCards.find((c) => canonicalFeatureKey(c.title) === 'inventore arcano');
      if (tinkering) {
        cards.push({
          title: 'Inventore Arcano',
          body: `Azione: infondi magia lieve in fino a ${Math.max(1, s.abilityMods.int)} oggetti non magici Minuscoli (luce 1,5 m + 1,5 m fioca, messaggio registrato di 6 s udibile a 3 m, odore/suono costante a 3 m, o immagine/testo statico max 25 parole).`,
        });
      }
      for (const rc of refCards) {
        if (rc.level >= 10) {
          cards.push({ title: rc.title, body: rc.body });
        }
      }
      return cards;
    }

    if (warlock) {
      const res = warlock.resources;
      const cards: Array<{ title: string; body: string }> = [
        {
          title: 'Magia del Patto',
          body: `Disponi di ${res.pactSlotsCount} slot incantesimo, tutti di ${res.pactSlotLevel}° livello, e recuperi tutti gli slot spesi completando un riposo breve o lungo. Caratteristica da incantatore: Carisma (CD ${res.spellSaveDc}, TpC ${sign(res.spellAttackBonus)}).`,
        },
      ];
      if (s.level >= 3 && res.pactBoon) {
        cards.push({
          title: `Dono del Patto: ${res.pactBoon.name}`,
          body: res.pactBoon.desc,
        });
      }
      if (s.level >= 11 && res.mysticArcanum.length > 0) {
        cards.push({
          title: 'Arcanum Mistico',
          body: `Lanci ciascun Arcanum 1 volta senza spendere slot, recuperando tutti gli usi dopo un riposo lungo: ${res.mysticArcanum.map((a) => `${a.level}° liv. ${a.spellName}`).join('; ')}.`,
        });
      }
      if (s.level >= 20) {
        cards.push({
          title: 'Maestro dell\'Occulto',
          body: 'Trascorrendo 1 minuto invocando l\'aiuto del tuo patrono recuperi tutti gli slot incantesimo spesi della Magia del Patto (1 volta per riposo lungo).',
        });
      }
      return cards;
    }

    const rawCards: PrintFeature[] = bard
      ? bardReferenceCards(s.level)
      : barbarian
      ? barbarianReferenceCards(s.level)
      : cleric
      ? clericReferenceCards(s.level, cleric.undeadCr)
      : druid
      ? druidReferenceCards(s.level, s.classSubclass)
      : fighter
      ? fighterReferenceCards(
          s.level,
          options.fighterChoices?.fightingStyle,
          options.fighterChoices?.secondFightingStyle,
          /campione/i.test(s.classSubclass ?? '')
        )
      : rogue
      ? rogueReferenceCards(s.level)
      : wizard
      ? wizardReferenceCards(s.level)
      : monk
      ? monkReferenceCards(s.level)
      : paladin
      ? paladinReferenceCards(s.level, paladin.resources.fightingStyle)
      : ranger
      ? rangerReferenceCards(s.level)
      : sorcerer
      ? sorcererReferenceCards(s.level)
      : [];

    return rawCards.map((c) => ({ title: c.title, body: c.body }));
  };

  const candidateCards = buildPage1CandidateCards();
  const renderedOnPage1Keys = new Set<string>();
  const overflowPage1Cards: Array<{ title: string; body: string }> = [];

  let ry = 724;
  for (const card of candidateCards) {
    const lines = wrapSheetText(card.body, font, 7.6, 158);
    // Exact true height: header/padding (34pt) + lines * 9.5pt + bottom margin (8pt) — NEVER clamped!
    const cardHeight = 34 + lines.length * 9.5 + 8;
    if (ry - cardHeight >= 44) {
      frame(first, 390, ry, 178, cardHeight, card.title);
      lines.forEach((l, i) => text(first, 398, ry - 33 - i * 9.5, l, 7.6));
      renderedOnPage1Keys.add(canonicalFeatureKey(card.title));
      ry -= cardHeight + 7;
    } else {
      overflowPage1Cards.push(card);
    }
  }

  // --- PAGE 2+: DYNAMIC TWO-COLUMN FLOW FOR CAPACITÀ, RAZZA, SOTTOCLASSE E DOTAZIONE ---
  // Separate base-class features vs subclass features from the resolved evidence/model
  const rawSubclassFeatures: PrintFeature[] = barbarian
    ? options.barbarianEvidence?.pathFeatures ?? []
    : bard
    ? model.features.filter((f) => f.source.toLowerCase().includes('collegio') || (options.collegeFeatures ?? []).some((cf) => cf.title === f.title))
    : cleric
    ? options.clericEvidence?.domainFeatures ?? []
    : druid
    ? options.druidEvidence?.circleFeatures ?? []
    : fighter
    ? options.fighterEvidence?.archetypeFeatures ?? []
    : monk
    ? options.monkEvidence?.traditionFeatures ?? []
    : paladin
    ? options.paladinEvidence?.traditionFeatures ?? []
    : ranger
    ? options.rangerEvidence?.archetypeFeatures ?? []
    : rogue
    ? options.rogueEvidence?.archetypeFeatures ?? []
    : sorcerer
    ? options.sorcererEvidence?.originFeatures ?? []
    : warlock
    ? options.warlockEvidence?.patronFeatures ?? []
    : wizard
    ? options.wizardEvidence?.traditionFeatures ?? []
    : [];

  const subclassTitleSet = new Set(rawSubclassFeatures.map((f) => f.title));

  // For Artificer, exclude raw known-infusion items appended in artificer-print-model because they have dedicated tables
  const artificerInfusionTitleSet = new Set((artificer?.state.known ?? []).map((k) => k.title));

  const classFeatureItems: FlowItem[] = [];
  const seenFeatureKeys = new Set<string>(renderedOnPage1Keys);

  for (const ov of overflowPage1Cards) {
    const key = canonicalFeatureKey(ov.title);
    if (seenFeatureKeys.has(key)) continue;
    seenFeatureKeys.add(key);
    classFeatureItems.push({ kind: 'feature', title: ov.title, body: ov.body });
  }

  for (const feat of model.features) {
    if (feat.level > s.level) continue;
    if (subclassTitleSet.has(feat.title)) continue;
    if (artificer && artificerInfusionTitleSet.has(feat.title)) continue;
    // Skip features dedicated to structured boxes on Page 2 right column (e.g. Warlock Invocations/Pact Boon/Arcanum, Sorcerer Metamagic)
    const key = canonicalFeatureKey(feat.title);
    if (seenFeatureKeys.has(key)) continue;
    if (warlock && (key === 'suppliche occulte' || key === 'dono del patto' || key === 'arcanum mistico')) continue;
    if (sorcerer && key === 'metamagia') continue;

    const summarized = summarizeResolvedFeature(feat, s);
    if (!summarized) continue;
    seenFeatureKeys.add(key);
    classFeatureItems.push({
      kind: 'feature',
      title: summarized.title,
      body: summarized.body,
    });
  }

  // Operational Racial Traits (no .slice truncation, exact racial spell ability!)
  const getOperationalRacialTraits = (
    raceMd: string,
    subraceMd?: string | null,
    spells?: GeneratedSpell[]
  ): FlowItem[] => {
    const combined = [raceMd, subraceMd ?? ''].filter(Boolean).join('\n\n');
    const items: FlowItem[] = [];
    const re = /\*{2,3}([^*]+?)\.?\*{2,3}\s*([\s\S]*?)(?=\n\s*\*{2,3}[^*]+?\.?\*{2,3}|$)/g;
    let m: RegExpExecArray | null;
    const isExcludedRacialTrait = (normTitle: string): boolean => {
      // Exclude ability score increases and their title variants (already integrated into scores)
      if (
        normTitle.includes('incremento') ||
        normTitle.includes('aumento') ||
        normTitle.includes('punteggi') ||
        normTitle.includes('punteggio') ||
        normTitle.includes('ability score')
      ) {
        return true;
      }
      // Exclude meta/informational headings (age, alignment, size, languages, subrace choice text)
      const pureMeta =
        /^(eta|allineamento|taglia|velocita|linguaggi|linguaggio extra|nomi|tratti|tratti razziali|sottorazza|sottorazze|elfo|nano|umano|gnomo|mezzelfo|mezzorco|halfling|dragonide|tiefling)$/;
      return pureMeta.test(normTitle) || normTitle.startsWith('sottorazz');
    };
    const seen = new Set<string>();

    while ((m = re.exec(combined.replace(/\r/g, ''))) !== null) {
      const t = m[1]?.trim().replace(/[.:]+$/, '') ?? '';
      const b = m[2]?.trim() ?? '';
      const norm = t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
      if (!t || isExcludedRacialTrait(norm) || seen.has(norm)) continue;
      seen.add(norm);

      if (norm.includes('scurovisione') || norm.includes('darkvision')) {
        const range = /36\s*metri|36\s*m|120\s*ft/i.test(b) ? '36 m' : '18 m';
        items.push({
          kind: 'inline',
          label: t,
          body: `Vedi nella luce fioca entro ${range} come luce intensa, e nell'oscurità come luce fioca (solo toni di grigio).`,
        });
      } else if (norm.includes('sensi acuti') || norm.includes('keen senses')) {
        items.push({ kind: 'inline', label: t, body: "Competenza nell'abilità Percezione." });
      } else if (norm.includes('retaggio fatato') || norm.includes('fey ancestry')) {
        items.push({
          kind: 'inline',
          label: t,
          body: "Vantaggio ai TS contro l'essere affascinato e immunità al sonno provocato dalla magia.",
        });
      } else if (norm.includes('trance')) {
        items.push({
          kind: 'inline',
          label: t,
          body: 'Non hai bisogno di dormire: 4 ore di meditazione profonda al giorno conferiscono gli stessi benefici di 8 ore di sonno umano (riposo lungo).',
        });
      } else if (norm.includes('addestramento') && norm.includes('armi')) {
        items.push({
          kind: 'inline',
          label: t,
          body: cleanAndFilterManualFeatureBody(b, s.level),
        });
      } else if (norm.includes('trucchetto') || norm.includes('cantrip')) {
        const racialCantripObj =
          s.racialSpells?.find((sp) => sp.level === 0) ??
          spells?.find((sp) => sp.origin === 'race' && sp.level === 0);
        const cantripName = racialCantripObj?.name ?? 'Trucchetto a scelta';
        const racialAbKey: AbilityKey =
          racialCantripObj?.ability ??
          (s.raceLabel.toLowerCase().includes('gnomo') || s.raceLabel.toLowerCase().includes('elfo')
            ? 'int'
            : 'cha');
        const abilityName = ABILITY_IT[racialAbKey];
        items.push({
          kind: 'inline',
          label: t.includes('(') ? t : `${t} (${s.subraceLabel ?? s.raceLabel})`,
          body: `Conosci 1 trucchetto (${cantripName}; caratteristica da incantatore: ${abilityName}).`,
        });
      } else if (norm.includes('eredita infernale') || norm.includes('infernal legacy')) {
        const parts = ['Conosci il trucchetto Taumaturgia (Carisma).'];
        if (s.level >= 3) parts.push('Lanci Intimorire Infernale come incantesimo di 2° liv. 1 volta/riposo lungo (Carisma).');
        if (s.level >= 5) parts.push('Lanci Oscurità 1 volta/riposo lungo (Carisma).');
        items.push({ kind: 'inline', label: t, body: parts.join(' ') });
      } else if (norm.includes('magia drow') || norm.includes('drow magic')) {
        const parts = ['Conosci il trucchetto Luci Danzanti (Carisma).'];
        if (s.level >= 3) parts.push('Lanci Luminescenza 1 volta/riposo lungo (Carisma).');
        if (s.level >= 5) parts.push('Lanci Oscurità 1 volta/riposo lungo (Carisma).');
        items.push({ kind: 'inline', label: t, body: parts.join(' ') });
      } else if (norm.includes('arma a soffio') || norm === 'soffio') {
        const breathDmg = s.level >= 16 ? '5d6' : s.level >= 11 ? '4d6' : s.level >= 6 ? '3d6' : '2d6';
        const breathDc = 8 + s.proficiencyBonus + s.abilityMods.con;
        items.push({
          kind: 'inline',
          label: t,
          body: `Azione: esali energia distruttiva secondo la tua ascendenza draconica (CD TS ${breathDc}). Danno ${breathDmg} su TS fallito, metà su successo. 1 uso per riposo breve o lungo.`,
        });
      } else {
        const cleaned = cleanAndFilterManualFeatureBody(b, s.level);
        if (cleaned) {
          items.push({ kind: 'inline', label: t, body: cleaned });
        }
      }
    }

    return items;
  };

  // Proficiencies & Languages (strictly from real character data; NO Artificer fallbacks!)
  const buildProficiencyItems = (): FlowItem[] => {
    const hasArtificerToolExpertise = Boolean(artificer && s.level >= 6);
    const baseRogueSkillExpertises = rogue
      ? Object.entries(s.skills).filter(([k, sk]) => {
          if (!sk.expertise) return false;
          if (rogue.archetype?.slug === 'xge-ladro-esploratore' && s.level >= 3 && (k === 'nature' || k === 'survival')) {
            return false;
          }
          return true;
        }).length
      : 0;
    const hasRogueThievesToolsExpertise = Boolean(
      rogue && baseRogueSkillExpertises < (s.level >= 6 ? 4 : 2)
    );

    const formattedTools =
      s.toolProficiencies.length === 0
        ? 'Nessuno'
        : s.toolProficiencies
            .map((tool) => {
              if (!hasArtificerToolExpertise && hasRogueThievesToolsExpertise && /scasso/i.test(tool)) {
                return `${tool} (x2 BC)`;
              }
              return tool;
            })
            .join(', ');

    return [
      { kind: 'inline', label: 'Armature', body: s.armorProficiencies.join(', ') || 'Nessuna' },
      { kind: 'inline', label: 'Armi', body: s.weaponProficiencies.join(', ') || 'Nessuna' },
      {
        kind: 'inline',
        label: hasArtificerToolExpertise && s.toolProficiencies.length > 0 ? 'Strumenti (x2 BC)' : 'Strumenti',
        body: formattedTools,
      },
      { kind: 'inline', label: 'Linguaggi', body: s.languages.join(', ') || 'Nessuno' },
    ];
  };

  const leftSections: FlowSection[] = [];
  if (classFeatureItems.length > 0) {
    leftSections.push({ title: 'PRIVILEGI DI CLASSE', items: classFeatureItems });
  }
  const operationalRacialTraits = getOperationalRacialTraits(s.raceTraitsMd, s.subraceTraitsMd, s.spells);
  if (operationalRacialTraits.length > 0) {
    leftSections.push({
      title: `TRATTI RAZZIALI (${(s.subraceLabel ?? s.raceLabel).toUpperCase()})`,
      items: operationalRacialTraits,
    });
  }
  leftSections.push({
    title: 'LINGUAGGI E COMPETENZE',
    items: buildProficiencyItems(),
  });

  // Build Right-Column Priority Sections: Artificer Infusions OR Subclass Features + Chosen Options + Inventory
  const rightSections: FlowSection[] = [];
  const appliedInfusions = artificer?.state.assignments ?? [];

  if (artificer) {
    if (s.level >= 2) {
      const getInfusionRow = (inf: (typeof appliedInfusions)[number]): InfusionTableRow => {
        const bonus = s.level >= 10 ? 2 : 1;
        const norm = inf.infusionId.toLowerCase();
        const stateLabels: Record<string, string> = {
          self: 'usato',
          attuned: 'in sintonia',
          carried: 'portato (non attivo)',
          'carried-attuned': 'portato in sintonia',
          other: 'assegnato ad altri',
        };
        const stateSuffix = inf.state ? ` [${stateLabels[inf.state] ?? inf.state}]` : '';
        const itemWithState = `${inf.itemLabel}${stateSuffix}`;

        if (norm === 'weapon' || norm.includes('arma-migliorata')) {
          const matchedWeapon = s.weaponRows.find((w) =>
            inf.itemLabel.toLowerCase().includes(w.name.toLowerCase().split(' ')[0])
          );
          const weaponStatsNote =
            matchedWeapon && (inf.state === 'self' || inf.state === 'attuned')
              ? ` (${matchedWeapon.name}: TpC ${matchedWeapon.toHit}, danno ${resolveDamageFormula(matchedWeapon.damage, s.abilityMods)}).`
              : '.';
          return {
            title: inf.title,
            itemLabel: itemWithState,
            sintonia: 'No',
            effect: `+${bonus} magico ai tiri per colpire e per i danni con quest'arma${weaponStatsNote}`,
          };
        }
        if (norm === 'defense' || norm.includes('difesa')) {
          return {
            title: inf.title,
            itemLabel: itemWithState,
            sintonia: 'No',
            effect: `+${bonus} bonus magico alla CA mentre indossi l'armatura o impugni lo scudo infuso.`,
          };
        }
        if (norm === 'repulsion' || norm.includes('repulsione')) {
          return {
            title: inf.title,
            itemLabel: itemWithState,
            sintonia: 'Sì',
            effect: '+1 alla CA mentre impugnato. 4 cariche (rec. 1d4 all\'alba): subito dopo essere stato colpito in mischia, reazione (1 carica) per spingere l\'attaccante fino a 4,5 m.',
          };
        }
        if (norm === 'repeating' || norm.includes('ripetizione')) {
          return {
            title: inf.title,
            itemLabel: itemWithState,
            sintonia: 'Sì',
            effect: '+1 a TpC e danni; ignora la proprietà ricarica e genera automaticamente 1 munizione magica quando attacchi se non è carica.',
          };
        }
        if (norm === 'resistant' || norm.includes('resistente')) {
          const resType = inf.resistance ? ` ai danni da ${inf.resistance}` : ' a 1 tipo di danno scelto';
          return {
            title: inf.title,
            itemLabel: itemWithState,
            sintonia: 'Sì',
            effect: `Mentre indossi questa armatura ottieni resistenza${resType}.`,
          };
        }
        if (norm === 'mind' || norm.includes('ment')) {
          return {
            title: inf.title,
            itemLabel: itemWithState,
            sintonia: 'No',
            effect: '4 cariche (rec. 1d4 all\'alba): quando fallisci un TS su Costituzione per mantenere la concentrazione, reazione (1 carica) per superarlo invece.',
          };
        }
        if (norm === 'focus') {
          return {
            title: inf.title,
            itemLabel: itemWithState,
            sintonia: 'Sì',
            effect: `Mentre impugnato: +${bonus} ai tiri per colpire degli incantesimi e ignori la mezza copertura quando effettui un attacco con incantesimo.`,
          };
        }
        if (norm === 'homunculus' || norm.includes('omuncolo')) {
          return {
            title: inf.title,
            itemLabel: itemWithState,
            sintonia: 'No',
            effect: 'Determina l\'aspetto e anima il Servo Omuncolo (vedi mini scheda Compagno dedicata; comando con azione bonus).',
          };
        }

        const knownDef = artificer.state.known.find((k) => k.id === inf.infusionId);
        const rawDesc = knownDef ? `${knownDef.replicaBody ?? knownDef.body}` : '';
        const cleanedDesc = rawDesc
          ? cleanAndFilterManualFeatureBody(
              rawDesc.replace(/^\*?(?:Prerequisiti|Oggetto):[^\n]*\*?\n*/gim, ''),
              s.level
            )
          : 'Oggetto infuso attivo secondo le regole dell\'infusione selezionata.';

        return {
          title: inf.title,
          itemLabel: itemWithState,
          sintonia: inf.requiresAttunement ? 'Sì' : 'No',
          effect: cleanedDesc,
        };
      };

      const infRows: FlowItem[] =
        appliedInfusions.length > 0
          ? appliedInfusions.map((inf) => ({ kind: 'infusionRow', row: getInfusionRow(inf) }))
          : [{ kind: 'bullet', text: 'Nessun oggetto infuso attualmente assegnato.' }];

      rightSections.push({
        title: 'OGGETTI INFUSI (ATTIVI)',
        hasInfusionHeader: appliedInfusions.length > 0,
        items: infRows,
      });

      const activeInfusionIds = new Set(appliedInfusions.map((a) => a.infusionId));
      const UNAPPLIED_INFUSION_SUMMARIES: Record<string, string> = {
        homunculus: 'Gemma/cristallo da almeno 100 mo: crea il compagno Servo Omuncolo che obbedisce ai tuoi comandi (azione bonus).',
        mind: 'Armatura o veste (4 cariche, rec. 1d4 all\'alba): reazione (1 carica) per superare un TS Costituzione fallito sulla concentrazione.',
        repeating: 'Arma a distanza con munizioni (sintonia): +1 a TpC e danni, ignora ricarica e genera munizioni magiche se scarica.',
        resistant: 'Armatura (sintonia, 6° liv): conferisce resistenza a 1 tipo di danno scelto (acido, freddo, fuoco, forza, fulmine, necrotico, psichico, radioso, tuono o veleno).',
        focus: `Verga, bastone o bacchetta (sintonia): +${s.level >= 10 ? 2 : 1} a TpC degli incantesimi e ignora mezza copertura.`,
        weapon: `Arma semplice o da guerra: +${s.level >= 10 ? 2 : 1} a TpC e danni.`,
        defense: `Armatura o scudo: +${s.level >= 10 ? 2 : 1} alla CA.`,
        repulsion: 'Scudo (sintonia, 6° liv, 4 cariche): +1 CA; reazione dopo colpo in mischia (1 carica) per spingere l\'attaccante fino a 4,5 m.',
      };

      const unappliedItems: FlowItem[] = (artificer.state.known ?? [])
        .filter((k) => !activeInfusionIds.has(k.id))
        .map((k) => {
          const knownSummary = UNAPPLIED_INFUSION_SUMMARIES[k.id.toLowerCase()];
          if (knownSummary) {
            return { kind: 'inline' as const, label: `• ${k.title}`, body: knownSummary, indentContinuation: 8 };
          }
          const cleaned = cleanAndFilterManualFeatureBody(
            k.body.replace(/^\*?(?:Prerequisiti|Oggetto):[^\n]*\*?\n*/gim, ''),
            s.level
          );
          return { kind: 'inline' as const, label: `• ${k.title}`, body: cleaned, indentContinuation: 8 };
        });

      rightSections.push({
        title: 'INFUSIONI NOTE (NON ATTIVE)',
        items:
          unappliedItems.length > 0
            ? unappliedItems
            : [{ kind: 'bullet', text: 'Nessuna infusione non attiva (tutte assegnate).' }],
      });
    }
  } else {
    // Subclass features (strictly resolved from evidence & gated by s.level)
    if (s.classSubclass && rawSubclassFeatures.length > 0) {
      const subItems: FlowItem[] = [];
      for (const sf of rawSubclassFeatures) {
        if (sf.level > s.level) continue;
        const key = canonicalFeatureKey(sf.title);
        if (seenFeatureKeys.has(key)) continue;
        const summarized = summarizeResolvedFeature(sf, s);
        if (!summarized) continue;
        seenFeatureKeys.add(key);
        subItems.push({ kind: 'feature', title: summarized.title, body: summarized.body });
      }
      if (subItems.length > 0) {
        rightSections.push({
          title: `SOTTOCLASSE: ${s.classSubclass.toUpperCase()}`,
          items: subItems,
        });
      }
    }

    // Warlock Chosen Eldritch Invocations (only when level >= 2)
    if (warlock && s.level >= 2) {
      const invItems: FlowItem[] =
        warlock.resources.invocations.length > 0
          ? warlock.resources.invocations.map((inv) => ({
              kind: 'inline' as const,
              label: `• ${inv.name}`,
              body: inv.desc,
              indentContinuation: 8,
            }))
          : [{ kind: 'bullet', text: 'Nessuna supplica occulta selezionata.' }];
      rightSections.push({
        title: 'SUPPLICHE OCCULTE (SCELTE)',
        items: invItems,
      });
    }

    // Sorcerer Chosen Metamagic Options (only when level >= 3)
    if (sorcerer && s.level >= 3 && sorcerer.resources.metamagic.length > 0) {
      rightSections.push({
        title: 'OPZIONI DI METAMAGIA (SCELTE)',
        items: sorcerer.resources.metamagic.map((mm) => ({
          kind: 'inline' as const,
          label: `• ${mm.name} (${mm.cost} pt)`,
          body: mm.desc,
          indentContinuation: 8,
        })),
      });
    }
  }

  // Overflow weapons from Page 1 (if > 6 weapons)
  if (overflowWeapons.length > 0) {
    rightSections.push({
      title: 'ATTACCHI AGGIUNTIVI',
      items: overflowWeapons.map((a) => ({
        kind: 'bullet' as const,
        text: `${a.name}: ${a.toHit} per colpire / ${resolveDamageFormula(a.damage, s.abilityMods)} (${a.type})`,
      })),
    });
  }

  // Complete Inventory (NO .slice(0, 12) truncation!)
  const filteredInv = s.inventory.filter((it) => {
    const t = it.trim();
    return (
      !t.includes('->') &&
      !t.startsWith('* ARMA') &&
      !t.startsWith('* DIFESA') &&
      !t.startsWith('* SCUDO DELLA REPULSIONE')
    );
  });
  const invItems = filteredInv.length > 0 ? filteredInv : s.inventory;
  rightSections.push({
    title: 'INVENTARIO ED EQUIPAGGIAMENTO',
    items:
      invItems.length > 0
        ? invItems.map((it) => ({
            kind: 'bullet' as const,
            text: it.replace(/^\*\s*/, '').trim(),
          }))
        : [{ kind: 'bullet', text: 'Nessun oggetto in inventario.' }],
  });

  // --- DYNAMIC TWO-COLUMN MEASUREMENT & PAGINATION ENGINE ---
  const COL_X = [27, 302] as const;
  const COL_W = [265, 266] as const;
  const FLOW_TOP_Y = 735;
  const FLOW_MIN_Y = 42;

  type MeasuredItem =
    | {
        kind: 'feature';
        title: string;
        lines: string[];
        height: number;
      }
    | {
        kind: 'inline';
        labelStr: string;
        labelW: number;
        lines: string[];
        indentContinuation: number;
        height: number;
      }
    | {
        kind: 'bullet';
        lines: string[];
        height: number;
      }
    | {
        kind: 'infusionRow';
        titleLines: string[];
        itemLines: string[];
        sintonia: string;
        effLines: string[];
        rowHeight: number;
        height: number;
      };

  const expandAndMeasureItems = (items: FlowItem[], colW: number): MeasuredItem[] => {
    const innerW = colW - 16;
    const out: MeasuredItem[] = [];
    for (const item of items) {
      if (item.kind === 'feature') {
        const allLines = wrapSheetText(item.body, font, 7.2, innerW);
        // Split extra-long feature bodies (> 48 lines) into clean sub-chunks so any single item fits inside one column
        const maxLinesPerChunk = 48;
        for (let offset = 0; offset < allLines.length; offset += maxLinesPerChunk) {
          const chunkLines = allLines.slice(offset, offset + maxLinesPerChunk);
          const chunkTitle = offset === 0 ? item.title : `${item.title} (cont.)`;
          out.push({
            kind: 'feature',
            title: chunkTitle,
            lines: chunkLines,
            height: 10 + chunkLines.length * 8.9 + 4,
          });
        }
      } else if (item.kind === 'inline') {
        const labelStr = `${item.label}: `;
        const labelW = bold.widthOfTextAtSize(clean(labelStr), 7.4) + 1.5;
        const contIndent = item.indentContinuation ?? 0;
        // Wrap line 1 in remaining width (innerW - labelW), and subsequent lines in (innerW - contIndent)
        const words = printPlainText(item.body).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
        const lines: string[] = [];
        let cur = '';
        let firstLine = true;
        for (const w of words) {
          const avail = firstLine ? Math.max(60, innerW - labelW) : innerW - contIndent;
          const candidate = cur ? `${cur} ${w}` : w;
          if (cur && font.widthOfTextAtSize(clean(candidate), 7.1) > avail) {
            lines.push(cur);
            cur = w;
            firstLine = false;
          } else {
            cur = candidate;
          }
        }
        if (cur || lines.length === 0) lines.push(cur);
        out.push({
          kind: 'inline',
          labelStr,
          labelW,
          lines,
          indentContinuation: contIndent,
          height: Math.max(1, lines.length) * 8.8 + 3.2,
        });
      } else if (item.kind === 'bullet') {
        const lines = wrapSheetText(`• ${item.text}`, font, 7.1, innerW - 4);
        out.push({
          kind: 'bullet',
          lines,
          height: Math.max(1, lines.length) * 8.8 + 2,
        });
      } else if (item.kind === 'infusionRow') {
        const titleLines = wrapSheetText(item.row.title, bold, 7.6, 102);
        const itemLines = wrapSheetText(item.row.itemLabel, font, 6.8, 102);
        const leftH = 7 + titleLines.length * 9 + itemLines.length * 8.2 + 7;
        const effLines = wrapSheetText(item.row.effect, font, 7.0, 110);
        const effH = 7 + effLines.length * 8.6 + 7;
        const rowHeight = Math.max(36, leftH, effH);
        out.push({
          kind: 'infusionRow',
          titleLines,
          itemLines,
          sintonia: item.row.sintonia,
          effLines,
          rowHeight,
          height: rowHeight + 3,
        });
      }
    }
    return out;
  };

  let flowPage = newSubsequentPage('CAPACITÀ, RAZZA E DOTAZIONE');
  let flowCol: 0 | 1 = 0;
  let flowY = FLOW_TOP_Y;

  const advanceColumnOrPage = () => {
    if (flowCol === 0) {
      flowCol = 1;
      flowY = FLOW_TOP_Y;
    } else {
      flowPage = newSubsequentPage('CAPACITÀ, RAZZA E DOTAZIONE (CONTINUAZIONE)');
      flowCol = 0;
      flowY = FLOW_TOP_Y;
    }
  };

  const renderFlowSection = (section: FlowSection) => {
    if (section.items.length === 0) return;
    let remainingRaw = [...section.items];
    let chunkIdx = 0;

    while (remainingRaw.length > 0) {
      const colX = COL_X[flowCol];
      const colW = COL_W[flowCol];
      const measured = expandAndMeasureItems(remainingRaw, colW);
      const headerOverhead = 30 + (section.hasInfusionHeader ? 18 : 0);
      const bottomPad = 6;

      // Ensure at least the first item fits in the remaining height of this column
      if (flowY - (headerOverhead + measured[0].height + bottomPad) < FLOW_MIN_Y && flowY < FLOW_TOP_Y) {
        advanceColumnOrPage();
        continue;
      }

      // Pack as many consecutive measured items as fit in the current column
      let accH = headerOverhead + bottomPad;
      let count = 0;
      for (let i = 0; i < measured.length; i++) {
        if (count > 0 && flowY - (accH + measured[i].height) < FLOW_MIN_Y) {
          break;
        }
        accH += measured[i].height;
        count++;
      }

      const boxTitle = chunkIdx === 0 ? section.title : `${section.title} (CONT.)`;
      frame(flowPage, colX, flowY, colW, accH, boxTitle);
      let drawY = flowY - 30;

      if (section.hasInfusionHeader) {
        flowPage.drawRectangle({
          x: colX + 6,
          y: drawY - 14,
          width: colW - 12,
          height: 14,
          color: rgb(0.92, 0.92, 0.9),
        });
        text(flowPage, colX + 10, drawY - 10, 'Infusione / Oggetto', 7, bold);
        text(flowPage, colX + 118, drawY - 10, 'Sint.', 7, bold);
        text(flowPage, colX + 146, drawY - 10, 'Effetto Operativo', 7, bold);
        drawY -= 18;
      }

      for (let i = 0; i < count; i++) {
        const it = measured[i];
        if (it.kind === 'feature') {
          text(flowPage, colX + 8, drawY, it.title, 7.8, bold);
          drawY -= 9.5;
          it.lines.forEach((l) => {
            text(flowPage, colX + 8, drawY, l, 7.2);
            drawY -= 8.9;
          });
          drawY -= 4.5;
        } else if (it.kind === 'inline') {
          text(flowPage, colX + 8, drawY, it.labelStr, 7.4, bold);
          it.lines.forEach((l, idx) => {
            const xOff = idx === 0 ? it.labelW : it.indentContinuation;
            text(flowPage, colX + 8 + xOff, drawY - idx * 8.8, l, 7.1);
          });
          drawY -= it.height;
        } else if (it.kind === 'bullet') {
          it.lines.forEach((l, idx) => {
            text(flowPage, colX + 8 + (idx === 0 ? 0 : 7), drawY - idx * 8.8, l, 7.1);
          });
          drawY -= it.height;
        } else if (it.kind === 'infusionRow') {
          const rx = colX + 6;
          const rw = colW - 12;
          flowPage.drawRectangle({
            x: rx,
            y: drawY - it.rowHeight,
            width: rw,
            height: it.rowHeight,
            borderColor: rgb(0.65, 0.65, 0.65),
            borderWidth: 0.5,
          });
          flowPage.drawLine({
            start: { x: colX + 116, y: drawY },
            end: { x: colX + 116, y: drawY - it.rowHeight },
            color: rgb(0.8, 0.8, 0.8),
            thickness: 0.4,
          });
          flowPage.drawLine({
            start: { x: colX + 142, y: drawY },
            end: { x: colX + 142, y: drawY - it.rowHeight },
            color: rgb(0.8, 0.8, 0.8),
            thickness: 0.4,
          });
          it.titleLines.forEach((tl, idx) => {
            text(flowPage, rx + 4, drawY - 10.5 - idx * 9, tl, 7.6, bold);
          });
          const itemStartY = drawY - 10.5 - it.titleLines.length * 9 - 1.5;
          it.itemLines.forEach((il, idx) => {
            text(flowPage, rx + 4, itemStartY - idx * 8.2, il, 6.8);
          });
          text(flowPage, colX + 121, drawY - 10.5, it.sintonia, 7.3, bold);
          it.effLines.forEach((el, idx) => {
            text(flowPage, colX + 146, drawY - 10.5 - idx * 8.6, el, 7.0);
          });
          drawY -= it.height;
        }
      }

      flowY -= accH + 8;

      // Map back how many raw items were consumed:
      // Only `feature` items can expand into multiple MeasuredItems; if all `count` items map 1-to-1, slice directly.
      // To be exact even when a huge feature splits, rebuild remaining items from unrendered `measured.slice(count)`:
      if (count >= measured.length) {
        remainingRaw = [];
      } else {
        remainingRaw = measured.slice(count).map((m): FlowItem => {
          if (m.kind === 'feature') {
            return { kind: 'feature', title: m.title, body: m.lines.join(' ') };
          }
          if (m.kind === 'inline') {
            return {
              kind: 'inline',
              label: m.labelStr.replace(/:\s*$/, ''),
              body: m.lines.join(' '),
              indentContinuation: m.indentContinuation,
            };
          }
          if (m.kind === 'bullet') {
            return {
              kind: 'bullet',
              text: m.lines.join(' ').replace(/^•\s*/, ''),
            };
          }
          return {
            kind: 'infusionRow',
            row: {
              title: m.titleLines.join(' '),
              itemLabel: m.itemLines.join(' '),
              sintonia: m.sintonia,
              effect: m.effLines.join(' '),
            },
          };
        });
        advanceColumnOrPage();
      }
      chunkIdx++;
    }
  };

  for (const sec of leftSections) {
    renderFlowSection(sec);
  }
  // Start right-priority sections cleanly at the top of Column 1 if we are still in Column 0 on Page 2
  if (flowCol === 0 && flowY < FLOW_TOP_Y) {
    flowCol = 1;
    flowY = FLOW_TOP_Y;
  }
  for (const sec of rightSections) {
    renderFlowSection(sec);
  }

  // --- COMPANIONS (ALL ACTIVE COMPANIONS — NO ELSE-IF EXCLUSION!) ---
  const companions: Array<{ bannerTitle: string; data: CompanionStatBlockData }> = [];
  if (artificer && s.level >= 3 && /fabbro da battaglia|battle smith/i.test(s.classSubclass ?? '')) {
    companions.push({
      bannerTitle: "COMPAGNO: DIFENSORE D'ACCIAIO",
      data: buildSteelDefenderStatBlock(
        s.level,
        s.abilityMods.int,
        s.proficiencyBonus,
        s.spellAttackBonus ?? s.proficiencyBonus + s.abilityMods.int,
        s.languages
      ),
    });
  }
  if (artificer && s.level >= 3 && /artigliere|artillerist/i.test(s.classSubclass ?? '')) {
    companions.push({
      bannerTitle: 'COMPAGNO: CANNONE OCCULTO',
      data: buildEldritchCannonStatBlock(
        s.level,
        s.abilityMods.int,
        s.spellSaveDc || 8 + s.proficiencyBonus + s.abilityMods.int,
        s.spellAttackBonus ?? s.proficiencyBonus + s.abilityMods.int
      ),
    });
  }
  if (artificer && appliedInfusions.some((a) => a.infusionId.toLowerCase().includes('homunculus'))) {
    companions.push({
      bannerTitle: 'COMPAGNO: SERVO OMUNCOLO',
      data: buildHomunculusStatBlock(
        s.level,
        s.abilityMods.int,
        s.proficiencyBonus,
        s.spellAttackBonus ?? s.proficiencyBonus + s.abilityMods.int,
        s.languages
      ),
    });
  }
  if (ranger && s.level >= 3 && /signore delle bestie|beast master/i.test(s.classSubclass ?? '')) {
    const chosenBeast = options.rangerChoices?.beastCompanion ?? 'Lupo';
    const beastData = buildBeastCompanionStatBlock(
      s.level,
      s.abilityMods.wis,
      s.proficiencyBonus,
      s.languages,
      chosenBeast
    );
    companions.push({
      bannerTitle: beastData.title,
      data: beastData,
    });
  }

  for (const comp of companions) {
    const pageCompanion = newSubsequentPage(comp.bannerTitle);
    const measuredH = measureCompanionStatBlockHeight(comp.data, font, bold, 541, { hideTopBanner: true });
    const boxH = Math.min(698, Math.max(measuredH, 420));
    drawCompanionStatBlock(
      pageCompanion,
      { x: 27, y: 734 - boxH, width: 541, height: boxH },
      comp.data,
      font,
      bold,
      { hideTopBanner: true }
    );
  }

  // --- SPELLS (VERIFIED OPERATIVE SUMMARIES, ALL SLOT LEVELS 1-9, EXPLICIT PROVENANCE) ---
  if (s.spells && s.spells.length > 0) {
    const sortedSpells = [...s.spells].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      const byName = a.name.localeCompare(b.name, 'it');
      if (byName !== 0) return byName;
      return String(a.origin ?? '').localeCompare(String(b.origin ?? ''), 'it');
    });

    const statBoxW = 172;
    const topCasterBoxY = 734;

    const castAbility: AbilityKey =
      s.spellcastingAbility ??
      sortedSpells.find((sp) => sp.ability)?.ability ??
      s.racialSpells?.[0]?.ability ??
      'int';
    const castAbilityName = names[castAbility] ?? castAbility.toUpperCase();
    const castMod = s.abilityMods[castAbility] ?? 0;
    const cdVal = `${s.spellSaveDc || 8 + s.proficiencyBonus + castMod}`;
    const attVal = `${sign(s.spellAttackBonus ?? s.proficiencyBonus + castMod)}`;

    // Detect secondary spellcasting abilities (e.g. CHA racial spells on WIS Cleric)
    const secondaryAbilities = Array.from(
      new Set(
        sortedSpells
          .map((sp) => sp.ability)
          .filter((ab): ab is AbilityKey => Boolean(ab && ab !== castAbility))
      )
    );
    const secondaryNote =
      secondaryAbilities.length > 0
        ? ' | Magie secondarie: ' +
          secondaryAbilities
            .map((ab) => {
              const mod = s.abilityMods[ab] ?? 0;
              return `${ABILITY_ABBR[ab]} (CD ${8 + s.proficiencyBonus + mod}, TpC ${sign(s.proficiencyBonus + mod)})`;
            })
            .join(', ')
        : '';

    const colX = [27, 72, 192, 274, 340, 402, 568] as const;

    const prepareSpellRowLayout = (sp: GeneratedSpell) => {
      const summary = getSpellOperativeSummary(sp.name);
      if (!summary) {
        throw new Error(`Sintesi operativa verificata mancante per "${sp.name}".`);
      }

      const isAlwaysPrep = Boolean(
        sp.alwaysPrepared ||
          /^Sempre preparato\b|^Incantesimo di dominio:/i.test(sp.summary ?? '')
      );
      const ritual = Boolean(sp.ritual || summary.ritual);
      const levelStr = sp.level === 0 ? 'Trucc.' : `${sp.level}°`;

      const badgeParts: string[] = [];
      if (sp.origin === 'race') {
        const abTag = sp.ability ? ` ${ABILITY_ABBR[sp.ability]}` : '';
        badgeParts.push(`[Razza${abTag}]`);
      } else if (sp.origin === 'arcanum') {
        badgeParts.push('[Arcanum]');
      } else if (sp.origin === 'feat') {
        badgeParts.push('[Talento]');
      } else if (sp.origin === 'item') {
        badgeParts.push('[Oggetto]');
      } else if (sp.origin === 'pact') {
        badgeParts.push('[Patto]');
      }
      if (isAlwaysPrep) badgeParts.push('[Sempre]');
      if (sp.usesPerRest) {
        const shortRest = sp.usesPerRest
          .replace(/riposo lungo/gi, 'RL')
          .replace(/riposo breve/gi, 'RB');
        badgeParts.push(`[${shortRest}]`);
      } else if (sp.requiresSlot === false && sp.level > 0) {
        badgeParts.push('[No slot]');
      }
      if (ritual) badgeParts.push('[Rit.]');

      const badgeLines = badgeParts.length > 0 ? wrapSheetText(badgeParts.join(' '), font, 5.4, 39) : [];

      const castTime = sp.castingTimeOverride ?? summary.castingTime;
      const rangeVal = sp.rangeOverride ?? summary.range;
      const crLines = [
        ...wrapSheetText(castTime, font, 6.8, 74),
        ...wrapSheetText(rangeVal, font, 6.8, 74),
      ];
      const durLines = wrapSheetText(summary.duration, font, 6.7, 58);

      // Preserve Artificer tools-required M override when applicable while keeping costly/consumed components from verified summary
      let compText = summary.components;
      if (sp.material && !/\bM\b/.test(compText)) {
        compText = compText ? `${compText}, M` : 'M';
      }
      const compLines = wrapSheetText(compText, font, 6.5, 54);

      const castLevelPrefix =
        sp.castAtLevel && sp.castAtLevel > sp.level ? `(Al ${sp.castAtLevel}° liv.) ` : '';
      const secondaryAbSuffix =
        sp.ability && sp.ability !== castAbility
          ? ` [${ABILITY_ABBR[sp.ability]}: CD ${8 + s.proficiencyBonus + s.abilityMods[sp.ability]}, TpC ${sign(s.proficiencyBonus + s.abilityMods[sp.ability])}]`
          : '';
      const effectText = `${castLevelPrefix}${summary.effectSummary}${summary.higherLevels ? ' ' + summary.higherLevels : ''}${secondaryAbSuffix}`;
      const effectLines = wrapSheetText(effectText, font, 6.9, 160);

      const nameLines = wrapSheetText(sp.name, bold, 7.5, 112);
      const subLabel =
        sp.sourceLabel && sp.origin && sp.origin !== 'class'
          ? `${summary.school} · ${sp.sourceLabel}`
          : summary.school;
      const schoolLines = wrapSheetText(subLabel, font, 6.1, 112);

      const col0H = 11 + badgeLines.length * 6.6 + 5;
      const col1H = 9 + nameLines.length * 8.5 + schoolLines.length * 7.2 + 5;
      const col2H = 9 + crLines.length * 8.1 + 5;
      const col3H = 9 + durLines.length * 8.1 + 5;
      const col4H = 9 + compLines.length * 7.8 + 5;
      const col5H = 8 + effectLines.length * 8.2 + 5;

      const rowHeight = Math.max(34, col0H, col1H, col2H, col3H, col4H, col5H);
      return {
        levelStr,
        badgeLines,
        nameLines,
        schoolLines,
        crLines,
        durLines,
        compLines,
        effectLines,
        rowHeight,
      };
    };

    const drawSpellRow = (p: PDFPage, layout: ReturnType<typeof prepareSpellRowLayout>, rowY: number): number => {
      const { rowHeight } = layout;
      for (let c = 0; c < 6; c++) {
        p.drawRectangle({
          x: colX[c],
          y: rowY - rowHeight,
          width: colX[c + 1] - colX[c],
          height: rowHeight,
          borderColor: rgb(0.65, 0.65, 0.65),
          borderWidth: 0.4,
          color: rgb(1, 1, 1),
        });
      }

      text(p, colX[0] + 4, rowY - 11.5, layout.levelStr, 7.4, bold);
      layout.badgeLines.forEach((bl, idx) => text(p, colX[0] + 3, rowY - 20 - idx * 6.6, bl, 5.4));

      layout.nameLines.forEach((nl, idx) => text(p, colX[1] + 4, rowY - 11 - idx * 8.5, nl, 7.5, bold));
      const schoolStartY = rowY - 11 - layout.nameLines.length * 8.5 - 1;
      layout.schoolLines.forEach((sl, idx) => text(p, colX[1] + 4, schoolStartY - idx * 7.2, sl, 6.1));

      layout.crLines.forEach((crl, idx) => text(p, colX[2] + 4, rowY - 11 - idx * 8.1, crl, 6.8));
      layout.durLines.forEach((dl, idx) => text(p, colX[3] + 4, rowY - 11 - idx * 8.1, dl, 6.7));
      layout.compLines.forEach((cl, idx) => text(p, colX[4] + 4, rowY - 11 - idx * 7.8, cl, 6.5));
      layout.effectLines.forEach((el, idx) => text(p, colX[5] + 3, rowY - 10 - idx * 8.2, el, 6.9));

      return rowHeight;
    };

    const drawTableHeader = (p: PDFPage, startY: number) => {
      const colLabels = ['Liv.', 'Nome Incantesimo', 'Lancio & Gittata', 'Durata', 'Comp.', 'Effetto'];
      p.drawRectangle({
        x: 27,
        y: startY - 16,
        width: 541,
        height: 16,
        color: rgb(0.9, 0.9, 0.88),
        borderColor: rgb(0.4, 0.4, 0.4),
        borderWidth: 0.5,
      });
      colLabels.forEach((lbl, i) => {
        text(p, colX[i] + 4, startY - 11, lbl, 7, bold);
      });
    };

    const pageSpell1 = newSubsequentPage('INCANTESIMI');

    // Box 1: Caratteristica
    drawFantasyFrame(pageSpell1, { x: 27, y: topCasterBoxY - 44, width: statBoxW, height: 44 });
    const castLbl = 'CARATTERISTICA DA INCANTATORE';
    text(pageSpell1, 27 + (statBoxW - bold.widthOfTextAtSize(castLbl, 6.5)) / 2, topCasterBoxY - 14, castLbl, 6.5, bold);
    const castVal = `${castAbilityName} (${sign(castMod)})`;
    text(pageSpell1, 27 + (statBoxW - bold.widthOfTextAtSize(castVal, 13)) / 2, topCasterBoxY - 32, castVal, 13, bold);

    // Box 2: CD
    drawFantasyFrame(pageSpell1, { x: 211, y: topCasterBoxY - 44, width: statBoxW, height: 44 });
    const cdLbl = 'CD TIRO SALVEZZA';
    text(pageSpell1, 211 + (statBoxW - bold.widthOfTextAtSize(cdLbl, 6.5)) / 2, topCasterBoxY - 14, cdLbl, 6.5, bold);
    text(pageSpell1, 211 + (statBoxW - bold.widthOfTextAtSize(cdVal, 16)) / 2, topCasterBoxY - 32, cdVal, 16, bold);

    // Box 3: Attacco Incantesimi
    drawFantasyFrame(pageSpell1, { x: 396, y: topCasterBoxY - 44, width: statBoxW, height: 44 });
    const attLbl = 'BONUS ATTACCO INCANTESIMI';
    text(pageSpell1, 396 + (statBoxW - bold.widthOfTextAtSize(attLbl, 6.5)) / 2, topCasterBoxY - 14, attLbl, 6.5, bold);
    text(pageSpell1, 396 + (statBoxW - bold.widthOfTextAtSize(attVal, 16)) / 2, topCasterBoxY - 32, attVal, 16, bold);

    // Slot Tracker Box — supports ALL slot levels 1°..9° and Warlock Mystic Arcanum 6°..9°!
    const levelsWithSlots = Object.entries(s.spellSlots)
      .filter(([lvl, count]) => Number(lvl) > 0 && count > 0)
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    const hasWarlockArcanum = Boolean(warlock && warlock.resources.mysticArcanum.length > 0);
    const multiRowSlots = (!warlock && levelsWithSlots.length > 4) || hasWarlockArcanum;
    const slotBoxH = multiRowSlots ? 52 : 32;
    const slotBoxBottomY = topCasterBoxY - 50 - slotBoxH;
    drawFantasyFrame(pageSpell1, { x: 27, y: slotBoxBottomY, width: 541, height: slotBoxH });

    const countSummaryLabel = (() => {
      if (bard || sorcerer || ranger || fighter || rogue) {
        const knownLeveled = sorcerer
          ? sorcerer.resources.spellsKnown
          : ranger
          ? ranger.resources.spellsKnown
          : fighter?.resources.spellsKnown != null
          ? fighter.resources.spellsKnown
          : rogue?.resources.spellsKnown != null
          ? rogue.resources.spellsKnown
          : sortedSpells.filter((sp) => sp.level > 0 && sp.origin !== 'race').length;
        return `Conosciuti: ${knownLeveled}`;
      }
      if (s.spellsPrepared) return `Preparabili: ${s.spellsPrepared}`;
      return `Totale: ${sortedSpells.length}`;
    })();

    if (warlock) {
      const pSlots = warlock.resources.pactSlotsCount;
      const pLevel = warlock.resources.pactSlotLevel;
      text(pageSpell1, 35, topCasterBoxY - 64, `Slot Patto (${pLevel}° Liv.):`, 7.5, bold);
      if (pSlots > 0) {
        drawFantasyTracker(pageSpell1, { x: 130, y: topCasterBoxY - 70, width: pSlots * 15 + 4, height: 16 }, pSlots);
      }
      text(
        pageSpell1,
        220,
        topCasterBoxY - 64,
        `Conosciuti: ${warlock.resources.spellsKnown}  |  Recupero slot: riposo breve o lungo`,
        7.3
      );
      if (hasWarlockArcanum) {
        const arcStr =
          'Arcanum Mistico (1/RL senza slot): ' +
          warlock.resources.mysticArcanum.map((a) => `[  ] ${a.level}° ${a.spellName}`).join('   ');
        fit(pageSpell1, 35, topCasterBoxY - 88, arcStr, 520, 7.1, bold);
      }
    } else if (levelsWithSlots.length > 0) {
      if (!multiRowSlots) {
        let slotX = 35;
        for (const [lvl, count] of levelsWithSlots) {
          const lbl = `Slot ${lvl}°:`;
          text(pageSpell1, slotX, topCasterBoxY - 64, lbl, 7.4, bold);
          const lw = bold.widthOfTextAtSize(lbl, 7.4);
          const tw = count * 15 + 4;
          drawFantasyTracker(pageSpell1, { x: slotX + lw + 3, y: topCasterBoxY - 70, width: tw, height: 16 }, count);
          slotX += lw + tw + 11;
        }
        fit(pageSpell1, Math.min(365, slotX), topCasterBoxY - 64, `${countSummaryLabel}  |  Recupero: riposo lungo`, 560 - Math.min(365, slotX), 7.1);
      } else {
        // Row 1: Slot levels 1°..5° (each slot diamond requires 15pt width and 15pt height)
        let slotX1 = 35;
        for (const [lvl, count] of levelsWithSlots.slice(0, 5)) {
          const lbl = `${lvl}°:`;
          text(pageSpell1, slotX1, topCasterBoxY - 64, lbl, 7.3, bold);
          const lw = bold.widthOfTextAtSize(lbl, 7.3);
          const tw = count * 15 + 2;
          drawFantasyTracker(pageSpell1, { x: slotX1 + lw + 2, y: topCasterBoxY - 70, width: tw, height: 16 }, count);
          slotX1 += lw + tw + 7;
        }
        const summaryX = Math.max(slotX1 + 4, 385);
        fit(pageSpell1, summaryX, topCasterBoxY - 64, `${countSummaryLabel} | Rec: lungo`, 560 - summaryX, 6.9);

        // Row 2: Slot levels 6°..9°
        let slotX2 = 35;
        for (const [lvl, count] of levelsWithSlots.slice(5)) {
          const lbl = `Slot ${lvl}°:`;
          text(pageSpell1, slotX2, topCasterBoxY - 87, lbl, 7.3, bold);
          const lw = bold.widthOfTextAtSize(lbl, 7.3);
          const tw = count * 15 + 2;
          drawFantasyTracker(pageSpell1, { x: slotX2 + lw + 3, y: topCasterBoxY - 93, width: tw, height: 16 }, count);
          slotX2 += lw + tw + 12;
        }
      }
    } else {
      fit(
        pageSpell1,
        35,
        topCasterBoxY - 64,
        'Magie Innate o Razziali (senza slot di classe; utilizzi e recuperi indicati in tabella).',
        520,
        7.4,
        bold
      );
    }

    // Focus & Secondary Ability Notice Banner
    const baseFocusText = artificer
      ? 'Focus Artefice: richiede arnesi o oggetto infuso come focus (M); componenti con costo in mo restano obbligatorie.'
      : cleric || paladin
      ? 'Simbolo Sacro: utilizzabile come focus per incantesimi divini; componenti con costo in mo o consumate restano obbligatorie.'
      : druid
      ? 'Focus Druidico: vischio, verga o bastone sacro; componenti con costo in mo o consumate restano obbligatorie.'
      : ranger
      ? 'Componenti Ranger: borsa per componenti o focus druidico (Tasha); componenti con costo in mo restano obbligatorie.'
      : bard
      ? 'Focus Bardico: strumento musicale utilizzabile come focus da Bardo; componenti con costo in mo restano obbligatorie.'
      : 'Focus Arcano: verga, bacchetta, sfera, cristallo o borsa per componenti; componenti con costo in mo restano obbligatorie.';

    const focusBannerY = slotBoxBottomY - 26;
    drawFantasyBanner(
      pageSpell1,
      { x: 27, y: focusBannerY, width: 541, height: 20 },
      `${baseFocusText}${secondaryNote}`,
      font,
      secondaryNote ? 6.2 : 6.8
    );

    let currentSpellPage = pageSpell1;
    let currentY = focusBannerY - 6;
    drawTableHeader(currentSpellPage, currentY);
    currentY -= 16;

    for (let i = 0; i < sortedSpells.length; i++) {
      const sp = sortedSpells[i];
      const rowLayout = prepareSpellRowLayout(sp);
      const neededH = rowLayout.rowHeight;
      const isLastSpell = i === sortedSpells.length - 1;
      const bottomLimit = isLastSpell ? 68 : 38;

      if (currentY - neededH < bottomLimit) {
        currentSpellPage = newSubsequentPage('INCANTESIMI (CONTINUAZIONE)');
        currentY = 735;
        drawTableHeader(currentSpellPage, currentY);
        currentY -= 16;
      }

      const rowH = drawSpellRow(currentSpellPage, rowLayout, currentY);
      currentY -= rowH;
    }

    // Compendium notice on the last spell page (spawning a clean strip if needed)
    if (currentY < 68) {
      currentSpellPage = newSubsequentPage('INCANTESIMI (CONTINUAZIONE)');
    }
    drawFantasyFrame(currentSpellPage, { x: 27, y: 36, width: 541, height: 30 });
    const compNotice = 'Testi integrali consultabili nel compendio di Barber & Dragons.';
    const compW = bold.widthOfTextAtSize(compNotice, 7.8);
    text(currentSpellPage, 27 + (541 - compW) / 2, 48, compNotice, 7.8, bold);
  }

  // Optional: Storia del Personaggio (full dynamic pagination — NO 3-page cap!)
  if (options.story?.trim()) {
    const allStoryLines = wrapSheetText(options.story.trim(), font, 8, 510);
    let storyIdx = 0;
    while (storyIdx < allStoryLines.length) {
      const pageStory = newSubsequentPage(
        storyIdx === 0 ? 'STORIA DEL PERSONAGGIO' : 'STORIA DEL PERSONAGGIO (CONTINUAZIONE)'
      );
      frame(pageStory, 27, 735, 541, 690, 'STORIA DEL PERSONAGGIO');
      const linesForThisPage = allStoryLines.slice(storyIdx, storyIdx + 55);
      linesForThisPage.forEach((l, i) => text(pageStory, 38, 700 - i * 11, l, 8));
      storyIdx += 55;
    }
  }

  // Optional: Manuale Rapido (full dynamic pagination — NO Math.min(200, ...) clamp or break!)
  if (options.quickManualSections?.length) {
    let qmPage = newSubsequentPage('MANUALE RAPIDO');
    let qmY = 735;
    for (const sec of options.quickManualSections) {
      const allSecLines = wrapSheetText(sec.body, font, 7.5, 515);
      let lineIdx = 0;
      let secChunk = 0;
      while (lineIdx < allSecLines.length) {
        if (qmY - 50 < 38) {
          qmPage = newSubsequentPage('MANUALE RAPIDO (CONTINUAZIONE)');
          qmY = 735;
        }
        const maxLinesHere = Math.max(1, Math.floor((qmY - 38 - 36) / 9.5));
        const chunkLines = allSecLines.slice(lineIdx, lineIdx + maxLinesHere);
        const h = 34 + chunkLines.length * 9.5 + 6;
        const secTitle = secChunk === 0 ? sec.title : `${sec.title} (cont.)`;
        frame(qmPage, 27, qmY, 541, h, secTitle);
        chunkLines.forEach((l, i) => text(qmPage, 38, qmY - 30 - i * 9.5, l, 7.5));
        qmY -= h + 8;
        lineIdx += chunkLines.length;
        secChunk++;
      }
    }
  }

  // Clean, consistent footers on all pages
  const totalPages = doc.getPageCount();
  doc.getPages().forEach((p, idx) => {
    text(p, 28, 16, `Barber & Dragons  |  ${s.classLabel} V2  |  Pagina ${idx + 1} di ${totalPages}`, 7);
  });

  return doc.save();
}
