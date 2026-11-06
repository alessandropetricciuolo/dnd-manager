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
import {
  planAdaptivePage1,
  renderPlacedBlockOnPage1,
  wrapInlineBody,
  type AdaptiveBlock,
  type AvailableSlot,
  type AdaptiveFlowItem,
} from './page1-adaptive-planner';
import { FIGHTING_STYLE_DESCRIPTIONS } from '@/lib/sheet-generator/fighter-reference-copy';
import type { PhbFightingStyle } from '@/lib/sheet-generator/class-choice-catalog';

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
const PAPER = rgb(1, 1, 1);
const INK = rgb(0, 0, 0);
const ACCENT_BRONZE = rgb(0, 0, 0);

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
      color: rgb(0.96, 0.96, 0.96),
      borderColor: INK,
      borderWidth: 0.65,
    });
    // Monochrome black side accent endcaps
    p.drawRectangle({ x: bx, y, width: 2.5, height: h, color: INK });
    p.drawRectangle({ x: bx + bannerW - 2.5, y, width: 2.5, height: h, color: INK });
    const size = Math.min(8, (bannerW - 12) / Math.max(1, bold.widthOfTextAtSize(t, 1)));
    p.drawText(t, {
      x: bx + (bannerW - bold.widthOfTextAtSize(t, size)) / 2,
      y: y + (h - size) / 2 + 1,
      size,
      font: bold,
      color: INK,
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

  /** Page 1: Full Header with 2x enlarged logo and spacious multi-row identity */
  const newFirstPage = (title: string): { page: PDFPage; bodyTopY: number } => {
    const p = doc.addPage([W, H]);
    drawFantasyFrame(p, { x: 18, y: 30, width: W - 36, height: H - 48 });

    // Logo on left enlarged by 100% (doubled width and height, preserving exact aspect ratio ~0.73)
    const scale = 2 * Math.min(50 / logo.width, 54 / logo.height);
    const lw = logo.width * scale,
      lh = logo.height * scale;
    // Header frame height: Row 1 (36pt) + Row 2 (36pt) + Row 3 (46pt) = 118pt (from y: 696 to 814)
    const headerTop = 814;
    const headerBottom = 696;
    const headerHeight = headerTop - headerBottom; // 118
    p.drawImage(logo, { x: 27 + (88 - lw) / 2, y: headerBottom + (headerHeight - lh) / 2, width: lw, height: lh });

    // Full Header Frame next to logo
    drawFantasyFrame(p, { x: 118, y: headerBottom, width: 450, height: headerHeight });
    const rule = (x: number, y: number, xx: number, yy: number) =>
      p.drawLine({ start: { x, y }, end: { x: xx, y: yy }, thickness: 0.45, color: rgb(0.35, 0.35, 0.35) });

    // Dividing horizontal lines between Rows (Row 1: 36pt, Row 2: 36pt, Row 3: 46pt)
    rule(121, 778, 565, 778);
    rule(121, 742, 565, 742);

    // Row 1 vertical divider (Nome / Livello)
    rule(480, 814, 480, 778);

    // Row 2 vertical divider (Classe & Sottoclasse / Razza & Sottorazza)
    rule(345, 778, 345, 742);

    // Row 3 vertical dividers (Background / Allineamento / Dati Fisici / Sesso)
    rule(236, 742, 236, headerBottom);
    rule(346, 742, 346, headerBottom);
    rule(482, 742, 482, headerBottom);

    // Row 1 Content: NOME & LIVELLO
    text(p, 126, 804, 'NOME', 6);
    fit(p, 126, 788, s.characterName, 346, 12.5, bold);

    const lvlLbl = 'LIVELLO';
    text(p, 524 - bold.widthOfTextAtSize(lvlLbl, 6) / 2, 804, lvlLbl, 6, bold);
    const lvlVal = String(s.level);
    text(p, 524 - bold.widthOfTextAtSize(lvlVal, 16) / 2, 785, lvlVal, 16, bold);

    // Row 2 Content: CLASSE E SOTTOCLASSE & RAZZA E SOTTORAZZA
    drawEmblem(p, { x: 122, y: 746, width: 26, height: 26 });
    text(p, 154, 769, 'CLASSE E SOTTOCLASSE', 5.5);
    const classSubText = s.classSubclass
      ? `${s.classLabel.toUpperCase()} • ${s.classSubclass}`
      : s.classLabel.toUpperCase();
    fit(p, 154, 754, classSubText, 185, 9.5, bold);

    text(p, 353, 769, 'RAZZA E SOTTORAZZA', 5.5);
    const fullRace = s.subraceLabel ? `${s.raceLabel} (${s.subraceLabel})` : s.raceLabel;
    fit(p, 353, 754, fullRace, 207, 9.5);

    // Row 3 Content: BACKGROUND, ALLINEAMENTO, DATI FISICI (3 righe distinte), SESSO
    text(p, 126, 733, 'BACKGROUND', 5.5);
    fit(p, 126, 716, s.backgroundLabel, 104, 8.5);

    text(p, 244, 733, 'ALLINEAMENTO', 5.5);
    fit(p, 244, 716, s.alignment || '-', 96, 8.5);

    text(p, 354, 733, 'DATI FISICI', 5.5);
    text(p, 354, 723, 'Età:', 7.2, bold);
    fit(p, 386, 723, s.age ? `${s.age} a.` : '-', 90, 7.2);

    text(p, 354, 712, 'Altezza:', 7.2, bold);
    fit(p, 386, 712, s.height || '-', 90, 7.2);

    text(p, 354, 702, 'Peso:', 7.2, bold);
    fit(p, 386, 702, s.weight || '-', 90, 7.2);

    text(p, 490, 733, 'SESSO', 5.5);
    fit(p, 490, 716, s.sex || '-', 70, 8.5, bold);

    // Section banner: placed dynamically 8pt below header bottom
    const bannerGap = 8;
    const bannerH = 18;
    const bannerTop = headerBottom - bannerGap; // 688
    const bannerY = bannerTop - bannerH; // 670
    drawSectionBanner(p, bannerTop, title);

    // Uniform margin between banner bottom (ribbons reach bannerY - 2) and top border of all body columns
    const bannerLowestY = bannerY - 2; // 668
    const BANNER_TO_BODY_MARGIN = 9;
    const bodyTopY = bannerLowestY - BANNER_TO_BODY_MARGIN; // 659
    return { page: p, bodyTopY };
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
  const { page: first, bodyTopY } = newFirstPage('SCHEDA DEL PERSONAGGIO');

  // LEFT COLUMN: Proficiency Bonus + Abilities + Passive Perception + Senses (Chained dynamically from bodyTopY)
  const pbBoxH = 34;
  const pbTop = bodyTopY;
  const pbBottom = pbTop - pbBoxH;
  drawFantasyFrame(first, { x: 27, y: pbBottom, width: 175, height: pbBoxH });
  const pbLabel = 'BONUS DI COMPETENZA';
  text(first, 27 + (175 - bold.widthOfTextAtSize(pbLabel, 7)) / 2, pbTop - 12, pbLabel, 7, bold);
  const pbVal = `+${s.proficiencyBonus}`;
  text(first, 27 + (175 - bold.widthOfTextAtSize(pbVal, 15)) / 2, pbTop - 27, pbVal, 15, bold);

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
    str: 54,
    dex: 72,
    con: 54,
    int: 92,
    wis: 92,
    cha: 82,
  };

  let curAbY = pbBottom - 6;
  for (const key of Object.keys(names) as AbilityKey[]) {
    const height = abilityHeights[key];
    const top = curAbY;
    const box = { x: 27, y: top - height, width: 175, height };

    drawFantasyFrame(first, box);
    drawCardHeader(first, box.x, top, box.width, names[key]);

    const score = String(s.abilities[key]);
    const modifier = sign(s.abilityMods[key]);
    const leftCenter = box.x + 24;

    text(first, leftCenter - font.widthOfTextAtSize(score, 9.5) / 2, top - 29, score, 9.5);
    first.drawText(modifier, {
      x: leftCenter - bold.widthOfTextAtSize(modifier, 15) / 2,
      y: top - 44,
      size: 15,
      font: bold,
      color: INK,
    });

    first.drawLine({
      start: { x: box.x + 48, y: top - 24 },
      end: { x: box.x + 48, y: top - height + 6 },
      thickness: 0.4,
      color: rgb(0.8, 0.8, 0.8),
    });

    const rows = [
      { label: 'Tiro salvezza', value: s.savingThrows[key].value, marker: '' },
      ...groups[key].map((sk) => {
        const v = s.skills[sk];
        return { label: SKILL_LABELS[sk], value: v.value, marker: v.expertise ? 'M' : v.proficient ? 'C' : '-' };
      }),
    ];

    rows.forEach((row, idx) => {
      const rowY = top - 31 - idx * 10;
      const mText = row.marker ? `${row.marker} ` : '';
      text(first, box.x + 52, rowY, mText, 6.5, bold);
      fit(first, box.x + 62, rowY, row.label, 90, 7);
      text(first, box.x + 155, rowY, sign(row.value), 7.5, bold);
    });

    curAbY -= height + 4;
  }

  // Passive Perception Box
  const ppBoxH = 34;
  const ppTop = curAbY - 3;
  const ppBottom = ppTop - ppBoxH;
  drawFantasyFrame(first, { x: 27, y: ppBottom, width: 175, height: ppBoxH });
  const ppLabel = 'PERCEZIONE PASSIVA';
  text(first, 27 + (175 - bold.widthOfTextAtSize(ppLabel, 7)) / 2, ppTop - 11, ppLabel, 7, bold);
  const ppVal = `${s.passivePerception}`;
  text(first, 27 + (175 - bold.widthOfTextAtSize(ppVal, 14)) / 2, ppTop - 25, ppVal, 14, bold);

  // Senses / Inspiration Notes
  const sensesBoxH = 34;
  const sensesTop = ppBottom - 5;
  const sensesBottom = sensesTop - sensesBoxH;
  drawFantasyFrame(first, { x: 27, y: sensesBottom, width: 175, height: sensesBoxH });
  const combinedRaceText = `${s.raceTraitsMd} ${s.subraceTraitsMd ?? ''}`;
  const hasDarkvision = /scurovisione|darkvision|luce fioca/i.test(combinedRaceText);
  const dvRange = /36\s*metri|36\s*m|120\s*ft/i.test(combinedRaceText) ? '36 m' : '18 m';
  const senseText = hasDarkvision ? `Scurovisione ${dvRange}` : 'Visione normale';
  text(first, 36, sensesTop - 14, senseText, 7.5, bold);
  text(first, 36, sensesTop - 26, 'C: competenza  M: maestria | Ispiraz. [  ]', 6.8);

  // CENTER COLUMN: Defense (3 separate boxes) + HP & Hit Dice + Death Saves + Attacks + Combat Resources
  const defBoxH = 48;
  const defTop = bodyTopY;
  const defBottom = defTop - defBoxH;

  drawFantasyFrame(first, { x: 212, y: defBottom, width: 52, height: defBoxH });
  text(first, 212 + (52 - bold.widthOfTextAtSize('CA', 7)) / 2, defTop - 13, 'CA', 7, bold);
  const caVal = `${s.armorClass}`;
  first.drawText(caVal, {
    x: 212 + (52 - bold.widthOfTextAtSize(caVal, 17)) / 2,
    y: defTop - 36,
    size: 17,
    font: bold,
    color: INK,
  });

  drawFantasyFrame(first, { x: 268, y: defBottom, width: 52, height: defBoxH });
  const initLbl = 'INIZIATIVA';
  text(first, 268 + (52 - bold.widthOfTextAtSize(initLbl, 6)) / 2, defTop - 13, initLbl, 6, bold);
  const initVal = `${sign(s.initiative)}`;
  text(first, 268 + (52 - bold.widthOfTextAtSize(initVal, 17)) / 2, defTop - 36, initVal, 17, bold);

  // Velocità box with clean multi-line fitting for conditional speed notes like "(+3 m senza armatura)"
  drawFantasyFrame(first, { x: 324, y: defBottom, width: 56, height: defBoxH });
  const spdLbl = 'VELOCITÀ';
  text(first, 324 + (56 - bold.widthOfTextAtSize(spdLbl, 6)) / 2, defTop - 13, spdLbl, 6, bold);
  const spdClean = clean(s.speed);
  const spdMatch = spdClean.match(/^([^(]+?)\s*(\(.+\))?$/);
  const spdPrimary = (spdMatch?.[1] ?? spdClean).trim();
  const spdSecondary = spdMatch?.[2]?.trim() ?? '';
  if (spdSecondary) {
    const pSize = Math.min(11, (48 / Math.max(1, bold.widthOfTextAtSize(spdPrimary, 1))));
    text(first, 324 + (56 - bold.widthOfTextAtSize(spdPrimary, pSize)) / 2, defTop - 27, spdPrimary, pSize, bold);
    const noteLines = wrapSheetText(spdSecondary, font, 5.2, 48).slice(0, 2);
    noteLines.forEach((nl, idx) => {
      text(first, 324 + (56 - font.widthOfTextAtSize(nl, 5.2)) / 2, defTop - 36 - idx * 6, nl, 5.2);
    });
  } else {
    const pSize = Math.min(13, (48 / Math.max(1, bold.widthOfTextAtSize(spdPrimary, 1))));
    text(first, 324 + (56 - bold.widthOfTextAtSize(spdPrimary, pSize)) / 2, defTop - 33, spdPrimary, pSize, bold);
  }

  // Distinct HP & Hit Dice Box
  const hpBoxH = 96;
  const hpTop = defBottom - 6;
  const hpBottom = hpTop - hpBoxH;
  frame(first, 212, hpTop, 168, hpBoxH, 'PUNTI FERITA E DADI VITA');
  const hpInnerBoxW = 48;
  const hpInnerBoxH = 30;
  const hpY = hpTop - 54;
  first.drawRectangle({ x: 218, y: hpY, width: hpInnerBoxW, height: hpInnerBoxH, color: rgb(0, 0, 0) });
  first.drawText('MAX', {
    x: 218 + (hpInnerBoxW - bold.widthOfTextAtSize('MAX', 6.5)) / 2,
    y: hpY + hpInnerBoxH - 9,
    size: 6.5,
    font: bold,
    color: rgb(0.8, 0.8, 0.8),
  });
  first.drawText(`${s.hpMax}`, {
    x: 218 + (hpInnerBoxW - bold.widthOfTextAtSize(`${s.hpMax}`, 13)) / 2,
    y: hpY + 5,
    size: 13,
    font: bold,
    color: rgb(1, 1, 1),
  });

  first.drawRectangle({
    x: 271,
    y: hpY,
    width: 50,
    height: hpInnerBoxH,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
  });
  text(first, 271 + (50 - bold.widthOfTextAtSize('ATTUALI', 6.5)) / 2, hpY + hpInnerBoxH - 9, 'ATTUALI', 6.5, bold);
  first.drawLine({ start: { x: 275, y: hpY + 7 }, end: { x: 317, y: hpY + 7 }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) });

  first.drawRectangle({
    x: 326,
    y: hpY,
    width: 48,
    height: hpInnerBoxH,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
  });
  text(first, 326 + (48 - bold.widthOfTextAtSize('TEMP', 6.5)) / 2, hpY + hpInnerBoxH - 9, 'TEMP', 6.5, bold);
  first.drawLine({ start: { x: 330, y: hpY + 7 }, end: { x: 370, y: hpY + 7 }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) });

  text(first, 222, hpY - 14, `Dadi Vita: ${s.hitDiceTotal} ${s.hitDie}`, 8, bold);
  text(first, 222, hpY - 26, 'Dadi Vita spesi: ________________', 7.5);

  // Salvezze da Morte
  const dsBoxH = 56;
  const dsTop = hpBottom - 6;
  const dsBottom = dsTop - dsBoxH;
  frame(first, 212, dsTop, 168, dsBoxH, 'SALVEZZE DA MORTE');
  text(first, 224, dsTop - 29, 'Successi', 7.5);
  drawFantasyTracker(first, { x: 288, y: dsTop - 35, width: 80, height: 14 }, 3);
  text(first, 224, dsTop - 45, 'Fallimenti', 7.5);
  drawFantasyTracker(first, { x: 288, y: dsTop - 51, width: 80, height: 14 }, 3);

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
  const attacksBoxH = Math.max(64, 30 + attackRowsH + 6);
  const atkTop = dsBottom - 6;
  const atkBottom = atkTop - attacksBoxH;
  frame(first, 212, atkTop, 168, attacksBoxH, 'ATTACCHI');
  let curAtkY = atkTop - 28;
  page1Weapons.forEach((a) => {
    const resolvedDmg = resolveDamageFormula(a.damage, s.abilityMods);
    const rowStr = `${a.name} ${a.toHit} / ${resolvedDmg} (${a.type.slice(0, 4)}.)`;
    fit(first, 220, curAtkY, rowStr, 152, 7.6, bold);
    curAtkY -= 13;
  });
  if (extraAttacksCount > 1) {
    text(first, 220, curAtkY + 1, `Attacco Extra: ${extraAttacksCount} attacchi per azione`, 6.9);
  }

  // Class Combat Resources (Page 1, placed dynamically 6pt below ATTACCHI)
  const resTop = atkBottom - 6;
  const roguePsionicTrackerRows = rogue?.resources.psionicDice
    ? Math.ceil(rogue.resources.psionicDice.count / 10)
    : 1;
  const resH = rogue?.resources.psionicDice ? (roguePsionicTrackerRows > 1 ? 124 : 116) : 112;
  if (artificer) {
    const state = artificer.state;
    const attuned = state.assignments.filter((a) => a.state === 'attuned' || a.state === 'carried-attuned').length;
    frame(first, 212, resTop, 168, resH, 'RISORSE DI CLASSE');
    const intMod = Math.max(1, s.abilityMods.int);
    if (s.level >= 7) {
      text(first, 224, resTop - 28, `Lampo di Genio: ${intMod} usi / lungo`, 7.8, bold);
      drawFantasyTracker(first, { x: 224, y: resTop - 45, width: 140, height: 16 }, intMod);
      fit(first, 224, resTop - 59, `Reazione (visibile 9 m): +${intMod} a prova o TS`, 144, 7);
    } else {
      text(first, 224, resTop - 28, 'Inventore Arcano / Strumenti', 8, bold);
      fit(first, 224, resTop - 44, `Azione: magia lieve in max ${intMod} ogg. Minuscoli`, 144, 7);
    }
    text(first, 224, resTop - 72, `Infusioni attive: ${state.assignments.length}/${state.itemLimit}`, 7.8, bold);
    text(first, 224, resTop - 84, `Sintonia usata: ${attuned}/${state.attunementLimit}`, 7.5);
    text(first, 224, resTop - 98, 'Incantesimi e slot sulle pagine seguenti.', 6.8);
  } else if (bard) {
    frame(first, 212, resTop, 168, resH, 'ISPIRAZIONE BARDICA');
    drawFantasyShield(first, { x: 226, y: resTop - 85, width: 40, height: 48 }, bard.die, bold);
    drawFantasyTracker(first, { x: 279, y: resTop - 70, width: 96, height: 30 }, bard.uses);
    text(first, 277, resTop - 80, `${bard.uses} utilizzi (${bard.die})`);
    text(first, 222, resTop - 96, s.level >= 5 ? 'Recupero: riposo breve o lungo' : 'Recupero: riposo lungo', 7.3);
  } else if (barbarian) {
    frame(first, 212, resTop, 168, resH, 'IRA E COMBATTIMENTO');
    drawFantasyShield(first, { x: 226, y: resTop - 85, width: 40, height: 48 }, `+${barbarian.rage.damage}`, bold);
    if (barbarian.rage.uses !== null)
      drawFantasyTracker(first, { x: 279, y: resTop - 70, width: 96, height: 30 }, barbarian.rage.uses);
    text(first, 277, resTop - 80, barbarian.rage.uses === null ? 'Usi illimitati' : `${barbarian.rage.uses} utilizzi`);
    text(first, 222, resTop - 96, 'Recupero: riposo lungo', 7.5);
  } else if (cleric) {
    frame(first, 212, resTop, 168, resH, s.level >= 2 ? 'INCANALARE DIVINITÀ' : 'POTERE DIVINO');
    const cdUses = s.level >= 18 ? 3 : s.level >= 6 ? 2 : s.level >= 2 ? 1 : 0;
    if (cdUses > 0) {
      text(first, 224, resTop - 28, `Incanalare Divinità: ${cdUses} usi / riposo`, 8, bold);
      drawFantasyTracker(first, { x: 224, y: resTop - 46, width: 140, height: 16 }, cdUses);
      fit(first, 224, resTop - 64, `Dominio: ${s.classSubclass ?? '-'}`, 144, 7.8, bold);
      if (s.level >= 5) {
        text(first, 224, resTop - 78, `Distruggere Non Morti: GS ${cleric.undeadCr ?? '-'}`, 7.8, bold);
      }
      text(first, 224, resTop - 96, 'Recupero: riposo breve o lungo', 7.2);
    } else {
      fit(first, 224, resTop - 32, `Dominio: ${s.classSubclass ?? '-'}`, 144, 8, bold);
      text(first, 224, resTop - 50, `Incantesimi preparabili: ${s.spellsPrepared}`, 7.8);
      text(first, 224, resTop - 68, 'Magie di dominio sempre preparate.', 7.5);
      text(first, 224, resTop - 96, 'Incantesimi e slot sulle pagine seguenti.', 6.8);
    }
  } else if (druid) {
    frame(first, 212, resTop, 168, resH, s.level >= 2 ? 'FORMA SELVATICA' : 'MAGIA DRUIDICA');
    if (s.level >= 2) {
      const wsUses = s.level >= 20 ? 'Illimitati' : '2 usi / riposo';
      text(first, 224, resTop - 28, `Forma Selvatica: ${wsUses}`, 8, bold);
      if (s.level < 20) {
        drawFantasyTracker(first, { x: 224, y: resTop - 46, width: 140, height: 16 }, 2);
      }
      const moon = /circolo della luna/i.test(s.classSubclass ?? '');
      const maxCr = moon ? (s.level >= 6 ? Math.floor(s.level / 3) : 1) : s.level >= 8 ? 1 : s.level >= 4 ? 0.5 : 0.25;
      const crLabel = maxCr === 0.25 ? '1/4' : maxCr === 0.5 ? '1/2' : String(maxCr);
      fit(first, 224, resTop - 64, `GS Max: ${crLabel} (${s.level >= 8 ? 'Volo/Nuoto' : s.level >= 4 ? 'Nuoto' : 'Terra'})`, 144, 7.2);
      text(first, 224, resTop - 78, 'Linguaggio Druidico conosciuto.', 7.5);
      text(first, 224, resTop - 96, 'Recupero: riposo breve o lungo', 7.2);
    } else {
      text(first, 224, resTop - 32, `Incantesimi preparabili: ${s.spellsPrepared}`, 8, bold);
      text(first, 224, resTop - 50, `Trucchetti conosciuti: ${druid.cantrips}`, 7.8);
      text(first, 224, resTop - 68, 'Linguaggio Druidico conosciuto.', 7.2);
      text(first, 224, resTop - 96, 'Incantesimi e slot sulle pagine seguenti.', 6.8);
    }
  } else if (fighter) {
    const res = fighter.resources;
    frame(first, 212, resTop, 168, resH, 'RISORSE MARZIALI');
    text(first, 224, resTop - 28, `Recuperare Energie: ${res.secondWind}`, 7.8, bold);
    fit(first, 224, resTop - 40, 'Azione bonus (1 uso / riposo breve o lungo)', 144, 7);
    drawFantasyTracker(first, { x: 224, y: resTop - 56, width: 140, height: 16 }, 1);
    if (res.actionSurge > 0) {
      text(first, 224, resTop - 70, `Azione Impetuosa: ${res.actionSurge} usi / riposo`, 7.8, bold);
      drawFantasyTracker(first, { x: 224, y: resTop - 85, width: 140, height: 16 }, res.actionSurge);
      text(first, 224, resTop - 97, 'Recupero: riposo breve o lungo', 7.2);
    } else {
      const st = options.fighterChoices?.fightingStyle ?? '-';
      fit(first, 224, resTop - 74, `Stile: ${st}`, 144, 7.6, bold);
      text(first, 224, resTop - 96, 'Recupero: riposo breve o lungo', 7.2);
    }
  } else if (rogue) {
    const res = rogue.resources;
    if (res.psionicDice) {
      frame(first, 212, resTop, 168, resH, 'RISORSE PSIONICHE & FURTIVO');
      text(first, 222, resTop - 28, 'Attacco Furtivo:', 7.5, bold);
      text(first, 282, resTop - 28, `${res.sneakAttackDamage} (${res.sneakAttackDice}d6)`, 7.5, bold);
      fit(first, 222, resTop - 38, '1 v/turno con vant./alleato (arma acc./dist.)', 148, 6.2);

      const pCount = res.psionicDice.count;
      const pDie = res.psionicDice.die;
      text(first, 222, resTop - 49, `Energia Psionica: ${pCount} dadi ${pDie}`, 7.5, bold);
      const trackerH = roguePsionicTrackerRows > 1 ? 22 : 12;
      drawFantasyTracker(first, { x: 222, y: resTop - 51 - trackerH, width: 148, height: trackerH }, pCount);
      const belowTrackerY = resTop - 51 - trackerH;
      fit(first, 222, belowTrackerY - 9, 'Recupero riserva: tutti i dadi al riposo lungo', 148, 6.4);

      text(first, 222, belowTrackerY - 19, 'Ripresa Psionica: recupera 1 dado con az. bonus', 6.6, bold);
      drawFantasyTracker(first, { x: 222, y: belowTrackerY - 31, width: 14, height: 10 }, 1);
      text(first, 240, belowTrackerY - 28, '1 v/riposo breve o lungo', 6.5);

      drawFantasyTracker(first, { x: 222, y: belowTrackerY - 44, width: 14, height: 10 }, 1);
      fit(first, 240, belowTrackerY - 41, 'Sussurri: 1° uso gratis / riposo lungo (poi 1 dado)', 128, 6.2);
    } else {
      frame(first, 212, resTop, 168, resH, 'ATTACCO FURTIVO');
      drawFantasyShield(first, { x: 224, y: resTop - 68, width: 42, height: 42 }, res.sneakAttackDamage, bold);
      text(first, 276, resTop - 46, `Danno: ${res.sneakAttackDamage}`, 9.5, bold);
      text(first, 276, resTop - 58, `Dadi: ${res.sneakAttackDice}d6`, 8);
      fit(first, 222, resTop - 78, '1 v/turno: vantaggio o alleato entro 1,5 m', 148, 6.8);
      fit(first, 222, resTop - 90, 'Richiede arma accurata o a distanza', 148, 6.8);
    }
  } else if (monk) {
    const res = monk.resources;
    frame(first, 212, resTop, 168, resH, s.level >= 2 ? 'PUNTI KI E ARTI MARZIALI' : 'ARTI MARZIALI');
    drawFantasyShield(first, { x: 224, y: resTop - 82, width: 44, height: 44 }, res.martialArtsDie, bold);
    if (res.kiPoints > 0) {
      text(first, 276, resTop - 50, `Punti Ki: ${res.kiPoints}`, 9.5, bold);
      text(first, 276, resTop - 64, `CD Ki: ${res.kiSaveDc}`, 8.5); // Ki DC is preserved (martial ability)
      drawFantasyTracker(first, { x: 270, y: resTop - 80, width: 100, height: 16 }, res.kiPoints);
      text(first, 222, resTop - 96, 'Recupero Ki: riposo breve o lungo', 7.2);
    } else {
      text(first, 276, resTop - 54, `Dado Arti: ${res.martialArtsDie}`, 8.5, bold);
      text(first, 276, resTop - 68, '1 att. senz\'armi bonus', 7.2);
      text(first, 222, resTop - 96, 'Senza armatura e senza scudo', 7);
    }
  } else if (paladin) {
    const res = paladin.resources;
    frame(first, 212, resTop, 168, resH, 'RISORSE DEL PALADINO');
    text(first, 224, resTop - 28, `Imposizione Mani: ${res.layOnHandsPool} PF`, 8, bold);
    fit(first, 224, resTop - 40, `Riserva PF: ${res.layOnHandsPool} (5 PF curano veleno)`, 144, 6.8);
    text(first, 224, resTop - 55, `Senso del Divino: ${res.divineSenseUses} usi / lungo`, 7.8, bold);
    drawFantasyTracker(first, { x: 224, y: resTop - 70, width: 140, height: 16 }, res.divineSenseUses);
    if (res.channelDivinityUses > 0) {
      text(first, 224, resTop - 84, `Incanalare Divinità: ${res.channelDivinityUses} uso / riposo breve`, 7.3);
    }
    text(first, 224, resTop - 96, s.level >= 2 ? 'Punizione Divina e magie nelle pagg. seguenti.' : 'Recupero risorse a riposo lungo.', 6.8);
  } else if (ranger) {
    const res = ranger.resources;
    frame(first, 212, resTop, 168, resH, 'RISORSE DEL RANGER');
    text(first, 224, resTop - 28, 'Nemico Prescelto:', 7.8, bold);
    fit(first, 224, resTop - 40, res.favoredEnemies.join(', ') || 'Nessuno', 144, 7);
    text(first, 224, resTop - 54, 'Esploratore Nato (Terreni):', 7.8, bold);
    fit(first, 224, resTop - 66, res.favoredTerrains.join(', ') || 'Nessuno', 144, 7);
    if (s.level >= 3) {
      fit(first, 224, resTop - 80, `Archetipo: ${s.classSubclass ?? 'Ranger'}`, 144, 7.5, bold);
    }
    text(first, 224, resTop - 96, 'Magie e capacità nelle pagine seguenti.', 6.8);
  } else if (sorcerer) {
    const res = sorcerer.resources;
    frame(first, 212, resTop, 168, resH, s.level >= 2 ? 'PUNTI STREGONERIA' : 'MAGIA INNATA');
    if (res.sorceryPoints > 0) {
      text(first, 224, resTop - 28, `Punti Stregoneria: ${res.sorceryPoints}`, 8.5, bold);
      drawFantasyTracker(first, { x: 224, y: resTop - 46, width: 140, height: 16 }, res.sorceryPoints);
      if (s.level >= 3) {
        text(first, 224, resTop - 64, `Metamagia: ${res.metamagic.length} opzioni note`, 7.8);
      }
      fit(first, 224, resTop - 78, 'Converti punti <-> slot con azione bonus', 144, 6.8);
      text(first, 224, resTop - 96, 'Recupero Punti: riposo lungo', 7.2);
    } else {
      fit(first, 224, resTop - 32, `Origine: ${s.classSubclass ?? '-'}`, 144, 8, bold);
      text(first, 224, resTop - 50, `Trucchetti: ${res.cantripsKnown} | Inc. noti: ${res.spellsKnown}`, 7.5);
      text(first, 224, resTop - 68, 'Privilegi di origine draconica / magica', 7.2);
      text(first, 224, resTop - 96, 'Incantesimi e slot nelle pagine seguenti.', 6.8);
    }
  } else if (warlock) {
    const res = warlock.resources;
    frame(first, 212, resTop, 168, resH, 'MAGIA DEL PATTO');
    text(first, 224, resTop - 28, `Slot del Patto: ${res.pactSlotsCount} di ${res.pactSlotLevel}° Liv.`, 8.5, bold);
    drawFantasyTracker(first, { x: 224, y: resTop - 46, width: 140, height: 16 }, res.pactSlotsCount);
    if (s.level >= 2) {
      text(first, 224, resTop - 64, `Suppliche Occulte: ${res.invocationsCount} note`, 7.8);
    }
    if (s.level >= 3 && res.pactBoon) {
      fit(first, 224, resTop - 78, `Dono del Patto: ${res.pactBoon.name}`, 144, 7.5);
    }
    text(first, 224, resTop - 96, 'Recupero Slot: riposo breve o lungo', 7.2);
  } else if (wizard) {
    const res = wizard.resources;
    frame(first, 212, resTop, 168, resH, 'RECUPERO ARCANO');
    text(first, 224, resTop - 28, `Recupero Arcano: ${res.arcaneRecoveryLevels} liv. slot`, 7.8, bold);
    fit(first, 224, resTop - 40, '1 volta/giorno al termine di un riposo breve', 144, 7.2);
    text(first, 224, resTop - 54, `Incantesimi Preparabili: ${res.spellsPrepared}`, 7.8, bold);
    if (res.arcaneWardHp) {
      text(first, 224, resTop - 68, `Barriera Arcana: ${res.arcaneWardHp} PF`, 7.8, bold);
    } else if (res.portentDiceCount) {
      text(first, 224, resTop - 68, `Presagio: ${res.portentDiceCount} d20 dopo riposo lungo`, 7.8, bold);
    } else if (res.bladesongUses) {
      text(first, 224, resTop - 68, `Canto Lama: ${res.bladesongUses} usi (+${res.bladesongAcBonus} CA)`, 7.8, bold);
    } else {
      fit(first, 224, resTop - 68, `Tradizione: ${s.classSubclass ?? 'Mago'}`, 144, 7.8, bold);
    }
    text(first, 224, resTop - 80, `Trucchetti conosciuti: ${res.cantripsKnown}`, 7.5);
    text(first, 224, resTop - 96, 'Incantesimi e rituali nelle pagine seguenti.', 6.8);
  }

  const resBottom = resTop - resH;
  const centerRemainingTop = resBottom - 6;
  const centerRemainingBottom = 42;
  const centerRemainingH = centerRemainingTop - centerRemainingBottom;

  // --- CANDIDATE CONTENT FOR PAGE 1 PROMOTION & PAGE 2+ CONTINUITY ---
  // Subclass features (level-gated)
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
  const artificerInfusionTitleSet = new Set((artificer?.state.known ?? []).map((k) => k.title));

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
      if (
        normTitle.includes('incremento') ||
        normTitle.includes('aumento') ||
        normTitle.includes('punteggi') ||
        normTitle.includes('punteggio') ||
        normTitle.includes('ability score')
      ) {
        return true;
      }
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

  // Infusions (Artificer)
  const appliedInfusions = artificer?.state.assignments ?? [];
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

    const knownDef = artificer?.state.known.find((k) => k.id === inf.infusionId);
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

  // --- ASSEMBLE ADAPTIVE CANDIDATE BLOCKS (STABLE IDS & PRIORITIES 1..5) ---
  const candidateBlocks: AdaptiveBlock[] = [];

  // Priority 1: Subclass operative features (level-gated)
  if (s.classSubclass && rawSubclassFeatures.length > 0) {
    for (const sf of rawSubclassFeatures) {
      if (sf.level > s.level) continue;
      const summarized = summarizeResolvedFeature(sf, s);
      if (!summarized) continue;
      candidateBlocks.push({
        id: `sf-${canonicalFeatureKey(summarized.title)}`,
        title: summarized.title,
        priority: 1,
        category: 'subclass_feature',
        body: summarized.body,
      });
    }
  }

  // Priority 1: Subclass-specific operative abilities for Artificer
  if (artificer) {
    const sub = (s.classSubclass ?? '').toLowerCase();
    if (s.level >= 3 && (sub.includes('fabbro da battaglia') || sub.includes('battle smith'))) {
      candidateBlocks.push({
        id: 'sf-pronto-per-la-battaglia',
        title: 'Pronto per la Battaglia',
        priority: 1,
        category: 'subclass_feature',
        body: "Ottieni competenza nelle armi da guerra. Quando attacchi con un'arma magica, puoi usare il modificatore di Intelligenza invece di Forza o Destrezza per i tiri per colpire e per i danni.",
      });
    } else if (s.level >= 3 && (sub.includes('armaiolo') || sub.includes('armorer'))) {
      const isInfiltrator = s.weaponRows.some((w) => w.name.includes('Fulmini'));
      candidateBlocks.push({
        id: 'sf-armatura-arcana',
        title: `Armatura Arcana (${isInfiltrator ? 'Infiltrato' : 'Custode'})`,
        priority: 1,
        category: 'subclass_feature',
        body: isInfiltrator
          ? 'Lanciatore di Fulmini (gittata 27/90 m, 1d6 da fulmine, +1d6 extra 1 volta/turno), Passo Veloce (+1,5 m velocità) e Campo Smorzante (vantaggio a Furtività).'
          : 'Guanti Tonanti (mischia, 1d8 da tuono; bersaglio colpito ha svantaggio ai TpC contro bersagli diversi da te) e Campo Difensivo (azione bonus: PF temp pari al livello, BC usi/riposo lungo).',
      });
    } else if (s.level >= 3 && (sub.includes('alchimista') || sub.includes('alchemist'))) {
      candidateBlocks.push({
        id: 'sf-elisir-sperimentale',
        title: 'Elisir Sperimentale',
        priority: 1,
        category: 'subclass_feature',
        body: `Fine riposo lungo (con scorte da alchimista): crei ${s.level >= 15 ? 3 : s.level >= 6 ? 2 : 1} elisir casuale (d6: Guarigione, Rapidità, Resilienza, Audacia, Volo o Trasformazione). Puoi spendere 1 slot incantesimo per crearne uno scelto. Bere/somministrare richiede 1 azione.`,
      });
    } else if (s.level >= 3 && (sub.includes('artigliere') || sub.includes('artillerist'))) {
      candidateBlocks.push({
        id: 'sf-cannone-occulto',
        title: 'Cannone Occulto',
        priority: 1,
        category: 'subclass_feature',
        body: 'Azione (con strumenti da falegname o da fabbro): crei 1 Cannone Occulto Piccolo o Minuscolo entro 1,5 m (1 gratis/riposo lungo o spendendo 1 slot; dura 1 ora). Nel tuo turno usi azione bonus per attivarlo entro 18 m (vedi scheda Compagno).',
      });
    }
  }

  // Priority 1: Key operative reference features (level-gated, excluding fighting styles)
  const rawReferenceCards: PrintFeature[] = bard
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
        /campione/i.test(s.classSubclass ?? ''),
        false
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
    : artificer
    ? artificerReferenceCards(s.level)
    : [];

  for (const rc of rawReferenceCards) {
    const key = canonicalFeatureKey(rc.title);
    if (candidateBlocks.some((b) => b.id === `sf-${key}` || b.id === `rc-${key}`)) continue;
    const isStyle = key.startsWith('stile');
    candidateBlocks.push({
      id: `rc-${key}`,
      title: rc.title,
      priority: isStyle ? 2 : 1,
      category: isStyle ? 'chosen_option' : 'class_feature',
      body: rc.body,
    });
  }

  // Priority 2: Chosen fighting style for Ranger (which is tracked in ranger.resources.fightingStyle)
  if (ranger && ranger.resources.fightingStyle) {
    const st = ranger.resources.fightingStyle;
    candidateBlocks.push({
      id: 'opt-style-ranger',
      title: 'Stile di Combattimento',
      priority: 2,
      category: 'chosen_option',
      body: `${st}: ${FIGHTING_STYLE_DESCRIPTIONS[st as PhbFightingStyle] ?? 'Stile di combattimento del Ranger.'}`,
    });
  }

  // Priority 2: Artificer Active Infusions
  if (artificer && s.level >= 2 && appliedInfusions.length > 0) {
    candidateBlocks.push({
      id: 'opt-artificer-infusions-active',
      title: 'OGGETTI INFUSI (ATTIVI)',
      priority: 2,
      category: 'chosen_option',
      isInfusionTable: true,
      items: appliedInfusions.map((inf) => ({ kind: 'infusionRow' as const, row: getInfusionRow(inf) })),
    });
  }

  // Priority 2: Warlock chosen Invocations and Pact Boon
  if (warlock && s.level >= 2 && warlock.resources.invocations.length > 0) {
    candidateBlocks.push({
      id: 'opt-warlock-invocations',
      title: 'SUPPLICHE OCCULTE (SCELTE)',
      priority: 2,
      category: 'chosen_option',
      items: warlock.resources.invocations.map((inv) => ({
        kind: 'inline' as const,
        label: `• ${inv.name}`,
        body: inv.desc,
        indentContinuation: 8,
      })),
    });
  }
  if (warlock && s.level >= 3 && warlock.resources.pactBoon) {
    candidateBlocks.push({
      id: 'opt-warlock-pact-boon',
      title: `Dono del Patto: ${warlock.resources.pactBoon.name}`,
      priority: 2,
      category: 'chosen_option',
      body: warlock.resources.pactBoon.desc,
    });
  }

  // Priority 2: Sorcerer chosen Metamagic
  if (sorcerer && s.level >= 3 && sorcerer.resources.metamagic.length > 0) {
    candidateBlocks.push({
      id: 'opt-sorcerer-metamagic',
      title: 'OPZIONI DI METAMAGIA (SCELTE)',
      priority: 2,
      category: 'chosen_option',
      items: sorcerer.resources.metamagic.map((mm) => ({
        kind: 'inline' as const,
        label: `• ${mm.name} (${mm.cost} pt)`,
        body: mm.desc,
        indentContinuation: 8,
      })),
    });
  }

  // Priority 3: Operational racial traits
  const operationalRacialTraits = getOperationalRacialTraits(s.raceTraitsMd, s.subraceTraitsMd, s.spells);
  if (operationalRacialTraits.length > 0) {
    candidateBlocks.push({
      id: 'traits-racial-all',
      title: `TRATTI RAZZIALI (${(s.subraceLabel ?? s.raceLabel).toUpperCase()})`,
      priority: 3,
      category: 'racial_trait',
      items: operationalRacialTraits,
    });
  }

  // Priority 4: Languages & Proficiencies
  const profItems = buildProficiencyItems();
  candidateBlocks.push({
    id: 'proficiencies-all',
    title: 'LINGUAGGI E COMPETENZE',
    priority: 4,
    category: 'proficiency',
    items: profItems,
  });

  // Priority 5: Inventory & Equipment
  if (invItems.length > 0) {
    candidateBlocks.push({
      id: 'inventory-all',
      title: 'INVENTARIO ED EQUIPAGGIAMENTO',
      priority: 5,
      category: 'inventory',
      items: invItems.map((it) => ({
        kind: 'bullet' as const,
        text: it.replace(/^\*\s*/, '').trim(),
      })),
    });
  }

  // --- PLAN PAGE 1 SLOTS ---
  const page1Slots: AvailableSlot[] = [
    {
      id: 'right_col',
      x: 390,
      width: 178,
      topY: bodyTopY,
      bottomY: 42,
      maxHeight: bodyTopY - 42,
    },
  ];
  if (centerRemainingH >= 55) {
    page1Slots.push({
      id: 'center_bottom',
      x: 212,
      width: 168,
      topY: centerRemainingTop,
      bottomY: 42,
      maxHeight: centerRemainingH,
    });
  }

  const { placed, unplaced, placedBlockIds } = planAdaptivePage1(
    candidateBlocks,
    page1Slots,
    font,
    bold,
    7
  );

  for (const pl of placed) {
    renderPlacedBlockOnPage1(first, pl, font, bold, text);
  }

  const seenFeatureKeys = new Set<string>();
  for (const pid of placedBlockIds) {
    seenFeatureKeys.add(pid);
  }
  for (const pl of placed) {
    seenFeatureKeys.add(canonicalFeatureKey(pl.block.title));
  }
  if (placedBlockIds.has('opt-style-1') || placedBlockIds.has('opt-style-paladin') || placedBlockIds.has('opt-style-ranger')) {
    seenFeatureKeys.add('stile di combattimento');
  }
  if (placedBlockIds.has('opt-style-2')) {
    seenFeatureKeys.add('stile di combattimento aggiuntivo');
  }
  if (placedBlockIds.has('opt-warlock-pact-boon')) {
    seenFeatureKeys.add('dono del patto');
  }

  // --- PAGE 2+: DYNAMIC TWO-COLUMN FLOW FOR UNPLACED CAPACITÀ, RAZZA, SOTTOCLASSE E DOTAZIONE ---
  const classFeatureItems: FlowItem[] = [];

  // Add any unplaced features from candidate blocks
  for (const un of unplaced) {
    if (un.category === 'subclass_feature' || un.category === 'class_feature') {
      const key = canonicalFeatureKey(un.title);
      if (!seenFeatureKeys.has(key)) {
        seenFeatureKeys.add(key);
        classFeatureItems.push({ kind: 'feature', title: un.title, body: un.body ?? '' });
      }
    }
  }

  // Add any other model features not already placed or covered
  for (const feat of model.features) {
    if (feat.level > s.level) continue;
    if (subclassTitleSet.has(feat.title)) continue;
    if (artificer && artificerInfusionTitleSet.has(feat.title)) continue;
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

  const leftSections: FlowSection[] = [];
  if (classFeatureItems.length > 0) {
    leftSections.push({ title: 'PRIVILEGI DI CLASSE', items: classFeatureItems });
  }
  if (!placedBlockIds.has('traits-racial-all') && operationalRacialTraits.length > 0) {
    leftSections.push({
      title: `TRATTI RAZZIALI (${(s.subraceLabel ?? s.raceLabel).toUpperCase()})`,
      items: operationalRacialTraits,
    });
  }
  if (!placedBlockIds.has('proficiencies-all')) {
    leftSections.push({
      title: 'LINGUAGGI E COMPETENZE',
      items: profItems,
    });
  }

  const rightSections: FlowSection[] = [];

  // Artificer Infusions
  if (artificer && s.level >= 2) {
    if (!placedBlockIds.has('opt-artificer-infusions-active')) {
      const infRows: FlowItem[] =
        appliedInfusions.length > 0
          ? appliedInfusions.map((inf) => ({ kind: 'infusionRow', row: getInfusionRow(inf) }))
          : [{ kind: 'bullet', text: 'Nessun oggetto infuso attualmente assegnato.' }];

      rightSections.push({
        title: 'OGGETTI INFUSI (ATTIVI)',
        hasInfusionHeader: appliedInfusions.length > 0,
        items: infRows,
      });
    }

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
  } else {
    // Subclass features for other classes
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

    // Warlock Invocations
    if (warlock && s.level >= 2 && !placedBlockIds.has('opt-warlock-invocations')) {
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

    // Sorcerer Metamagic
    if (sorcerer && s.level >= 3 && !placedBlockIds.has('opt-sorcerer-metamagic') && sorcerer.resources.metamagic.length > 0) {
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
  if (!placedBlockIds.has('inventory-all')) {
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
  }

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
        isSplitLabel?: boolean;
        labelLines?: string[];
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
        const labelStr = `${item.label}:`;
        const labelW = bold.widthOfTextAtSize(clean(labelStr), 7.4);
        const contIndent = item.indentContinuation ?? 0;
        const bodyText = item.body ?? '';

        if (labelW + 45 > innerW) {
          const labelLines = wrapSheetText(labelStr, bold, 7.4, innerW);
          const bodyLines = wrapSheetText(bodyText, font, 7.1, innerW - contIndent);
          out.push({
            kind: 'inline',
            isSplitLabel: true,
            labelLines,
            labelStr,
            labelW,
            lines: bodyLines,
            indentContinuation: contIndent,
            height: (labelLines.length + Math.max(1, bodyLines.length)) * 8.8 + 3.5,
          });
        } else {
          const firstAvail = innerW - (labelW + 3);
          const contAvail = innerW - contIndent;
          const lines = wrapInlineBody(bodyText, font, 7.1, firstAvail, contAvail);
          out.push({
            kind: 'inline',
            labelStr,
            labelW,
            lines,
            indentContinuation: contIndent,
            height: Math.max(1, lines.length) * 8.8 + 3.2,
          });
        }
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

  let flowPage: PDFPage | null = null;
  let flowCol: 0 | 1 = 0;
  let flowY = FLOW_TOP_Y;

  const getOrCreateFlowPage = (): PDFPage => {
    if (!flowPage) {
      flowPage = newSubsequentPage('CAPACITÀ, RAZZA E DOTAZIONE');
      flowCol = 0;
      flowY = FLOW_TOP_Y;
    }
    return flowPage;
  };

  const advanceColumnOrPage = () => {
    if (!flowPage) {
      getOrCreateFlowPage();
      return;
    }
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
      const page = getOrCreateFlowPage();
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
      frame(page, colX, flowY, colW, accH, boxTitle);
      let drawY = flowY - 30;

      if (section.hasInfusionHeader) {
        page.drawRectangle({
          x: colX + 6,
          y: drawY - 14,
          width: colW - 12,
          height: 14,
          color: rgb(0.95, 0.95, 0.95),
        });
        text(page, colX + 10, drawY - 10, 'Infusione / Oggetto', 7, bold);
        text(page, colX + 118, drawY - 10, 'Sint.', 7, bold);
        text(page, colX + 146, drawY - 10, 'Effetto Operativo', 7, bold);
        drawY -= 18;
      }

      for (let i = 0; i < count; i++) {
        const it = measured[i];
        if (it.kind === 'feature') {
          text(page, colX + 8, drawY, it.title, 7.8, bold);
          drawY -= 9.5;
          it.lines.forEach((l) => {
            text(page, colX + 8, drawY, l, 7.2);
            drawY -= 8.9;
          });
          drawY -= 4.5;
        } else if (it.kind === 'inline') {
          if (it.isSplitLabel && it.labelLines) {
            it.labelLines.forEach((ll) => {
              text(page, colX + 8, drawY, ll, 7.4, bold);
              drawY -= 8.8;
            });
            it.lines.forEach((l) => {
              text(page, colX + 8 + it.indentContinuation, drawY, l, 7.1);
              drawY -= 8.8;
            });
            drawY -= 3.5;
          } else {
            text(page, colX + 8, drawY, it.labelStr, 7.4, bold);
            it.lines.forEach((l, idx) => {
              const xOff = idx === 0 ? it.labelW + 3 : it.indentContinuation;
              text(page, colX + 8 + xOff, drawY - idx * 8.8, l, 7.1);
            });
            drawY -= it.height;
          }
        } else if (it.kind === 'bullet') {
          it.lines.forEach((l, idx) => {
            text(page, colX + 8 + (idx === 0 ? 0 : 7), drawY - idx * 8.8, l, 7.1);
          });
          drawY -= it.height;
        } else if (it.kind === 'infusionRow') {
          const rx = colX + 6;
          const rw = colW - 12;
          page.drawRectangle({
            x: rx,
            y: drawY - it.rowHeight,
            width: rw,
            height: it.rowHeight,
            borderColor: rgb(0.65, 0.65, 0.65),
            borderWidth: 0.5,
          });
          page.drawLine({
            start: { x: colX + 116, y: drawY },
            end: { x: colX + 116, y: drawY - it.rowHeight },
            color: rgb(0.8, 0.8, 0.8),
            thickness: 0.4,
          });
          page.drawLine({
            start: { x: colX + 142, y: drawY },
            end: { x: colX + 142, y: drawY - it.rowHeight },
            color: rgb(0.8, 0.8, 0.8),
            thickness: 0.4,
          });
          it.titleLines.forEach((tl, idx) => {
            text(page, rx + 4, drawY - 10.5 - idx * 9, tl, 7.6, bold);
          });
          const itemStartY = drawY - 10.5 - it.titleLines.length * 9 - 1.5;
          it.itemLines.forEach((il, idx) => {
            text(page, rx + 4, itemStartY - idx * 8.2, il, 6.8);
          });
          text(page, colX + 121, drawY - 10.5, it.sintonia, 7.3, bold);
          it.effLines.forEach((el, idx) => {
            text(page, colX + 146, drawY - 10.5 - idx * 8.6, el, 7.0);
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
  if (flowPage && flowCol === 0 && flowY < FLOW_TOP_Y) {
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
        color: rgb(0.95, 0.95, 0.95),
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
