import type { PDFPage, PDFFont } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import { drawFantasyFrame, drawFantasyBanner, drawFantasyTracker } from './fantasy-sheet-graphics';
import { sanitizeTextForStandardPdfFont } from './winansi-text';
import type { RangerBeastCompanion } from '@/lib/sheet-generator/ranger-archetypes';

export interface CompanionStatBlockData {
  title: string;
  typeSubtitle: string;
  ac: number;
  acNotes?: string;
  hpMax: number;
  hitDice: string;
  speed: string;
  abilities: Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', { score: number; mod: number }>;
  savingThrows?: string;
  skills?: string;
  damageImmunities?: string;
  conditionImmunities?: string;
  senses?: string;
  languages?: string;
  proficiencyBonusNotice?: string;
  traits: Array<{ name: string; text: string }>;
  commandRules: string;
  actions: Array<{
    name: string;
    toHit?: string;
    reachOrRange?: string;
    hitDamage?: string;
    text: string;
    uses?: number;
  }>;
  reactions: Array<{
    name: string;
    text: string;
  }>;
  recoveryNotes?: string[];
}

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** Wrap text into lines fitting within max width */
function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const result: string[] = [];
  for (const para of text.split('\n')) {
    let current = '';
    for (const word of para.trim().split(/\s+/).filter(Boolean)) {
      const test = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) {
        current = test;
      } else {
        if (current) result.push(current);
        current = word;
      }
    }
    if (current) result.push(current);
  }
  return result;
}

/**
 * Measures the exact vertical height needed by `drawCompanionStatBlock` at width `W`
 * so callers never clip or draw text below the outer frame.
 */
export function measureCompanionStatBlockHeight(
  data: CompanionStatBlockData,
  font: PDFFont,
  bold: PDFFont,
  width: number,
  options?: { hideTopBanner?: boolean }
): number {
  const clean = (v: unknown) => sanitizeTextForStandardPdfFont(String(v ?? ''));
  const W = width;
  let used = options?.hideTopBanner ? 14 : 34;

  // Subtitle + divider + defense boxes + abilities grid
  used += 12 + 8 + 40 + 36;

  const measureDetail = (label: string, value: string) => {
    const lText = clean(`${label}: `);
    const vText = clean(value);
    const lW = bold.widthOfTextAtSize(lText, 7.5);
    const lines = wrapLines(vText, font, 7.5, Math.max(40, W - 24 - lW));
    used += Math.max(1, lines.length) * 9.5 + 2;
  };

  if (data.savingThrows) measureDetail('Tiri Salvezza', data.savingThrows);
  if (data.skills) measureDetail('Abilità', data.skills);
  if (data.damageImmunities) measureDetail('Immunità ai Danni', data.damageImmunities);
  if (data.conditionImmunities) measureDetail('Immunità alle Condizioni', data.conditionImmunities);
  if (data.senses) measureDetail('Sensi', data.senses);
  if (data.languages) measureDetail('Linguaggi', data.languages);
  if (data.proficiencyBonusNotice) measureDetail('Bonus di Competenza', data.proficiencyBonusNotice);

  used += 4 + 8;

  for (const trait of data.traits) {
    const title = clean(`${trait.name}. `);
    const tW = bold.widthOfTextAtSize(title, 8);
    const lines = wrapLines(clean(trait.text), font, 8, Math.max(40, W - 24 - tW));
    used += Math.max(1, lines.length) * 10 + 4;
  }

  if (data.commandRules) {
    const cmdTitle = clean('Regola di Comando: ');
    const cW = bold.widthOfTextAtSize(cmdTitle, 8);
    const lines = wrapLines(clean(data.commandRules), font, 8, Math.max(40, W - 24 - cW));
    used += Math.max(1, lines.length) * 10 + 6;
  }

  // AZIONI header
  used += 20;
  for (const act of data.actions) {
    const header = clean(`${act.name}. `);
    const hW = bold.widthOfTextAtSize(header, 8);
    if (act.uses) {
      const lines = wrapLines(clean(act.text), font, 8, W - 24);
      used += 11 + Math.max(1, lines.length) * 10 + 6;
    } else {
      const lines = wrapLines(clean(act.text), font, 8, Math.max(40, W - 24 - hW));
      used += Math.max(1, lines.length) * 10 + 6;
    }
  }

  if (data.reactions.length > 0) {
    used += 20;
    for (const reac of data.reactions) {
      const lines = wrapLines(clean(reac.text), font, 8, W - 24);
      used += 10 + Math.max(1, lines.length) * 10 + 5;
    }
  }

  if (data.recoveryNotes && data.recoveryNotes.length > 0) {
    used += 10;
    for (const note of data.recoveryNotes) {
      const lines = wrapLines(clean(`• ${note}`), font, 7.5, W - 24);
      used += Math.max(1, lines.length) * 9.5 + 2;
    }
  }

  return Math.ceil(used + 12);
}

/**
 * Draws a complete, structured fantasy mini-statblock for companions
 * (Steel Defender, Homunculus, Beast, Eldritch Cannon, etc.) onto a page.
 */
export function drawCompanionStatBlock(
  page: PDFPage,
  box: { x: number; y: number; width: number; height: number },
  data: CompanionStatBlockData,
  font: PDFFont,
  bold: PDFFont,
  options?: { hideTopBanner?: boolean }
) {
  const clean = (v: unknown) => sanitizeTextForStandardPdfFont(String(v ?? ''));
  const { x, y, width: W, height: H } = box;
  const top = y + H;

  // Outer fantasy frame
  drawFantasyFrame(page, { x, y, width: W, height: H });

  // Top Title banner (only if not hidden by page section banner)
  let curY = top - 14;
  if (!options?.hideTopBanner) {
    drawFantasyBanner(page, { x: x + 8, y: top - 24, width: W - 16, height: 22 }, data.title, bold, 11);
    curY = top - 34;
  }

  // Subtitle: Type, Size, Alignment
  const subText = clean(data.typeSubtitle);
  page.drawText(subText, { x: x + 12, y: curY, size: 8, font, color: rgb(0.25, 0.25, 0.25) });
  curY -= 12;

  // Horizontal divider
  page.drawLine({ start: { x: x + 10, y: curY }, end: { x: x + W - 10, y: curY }, thickness: 0.6, color: rgb(0.5, 0.5, 0.5) });
  curY -= 8;

  // Defense / HP / Speed Row (3 distinct mini-boxes: CA, PF, Velocità)
  const colW = (W - 24) / 3;
  // Box 1: CA
  page.drawRectangle({ x: x + 10, y: curY - 32, width: colW - 4, height: 32, borderColor: rgb(0.4, 0.4, 0.4), borderWidth: 0.5 });
  page.drawText('CLASSE ARMATURA', { x: x + 14, y: curY - 10, size: 6.5, font: bold });
  const acStr = String(data.ac);
  page.drawText(acStr, { x: x + 14, y: curY - 26, size: 14, font: bold });
  if (data.acNotes) {
    const acNoteText = clean(data.acNotes);
    const acX = x + 18 + bold.widthOfTextAtSize(acStr, 14);
    const maxNoteW = Math.max(20, x + 10 + colW - 8 - acX);
    let noteSize = 7;
    while (noteSize > 5.5 && font.widthOfTextAtSize(acNoteText, noteSize) > maxNoteW) noteSize -= 0.5;
    page.drawText(acNoteText, { x: acX, y: curY - 24, size: noteSize, font });
  }

  // Box 2: PF
  page.drawRectangle({ x: x + 10 + colW, y: curY - 32, width: colW - 4, height: 32, borderColor: rgb(0.4, 0.4, 0.4), borderWidth: 0.5 });
  page.drawText('PUNTI FERITA', { x: x + 14 + colW, y: curY - 10, size: 6.5, font: bold });
  const hpStr = `${data.hpMax}`;
  page.drawText(hpStr, { x: x + 14 + colW, y: curY - 26, size: 14, font: bold });
  const hdNote = clean(`(${data.hitDice}) | Att.: ___`);
  const hpNoteX = x + 18 + colW + bold.widthOfTextAtSize(hpStr, 14);
  const maxHpNoteW = Math.max(20, x + 10 + colW * 2 - 8 - hpNoteX);
  let hpNoteSize = 6.8;
  while (hpNoteSize > 5.5 && font.widthOfTextAtSize(hdNote, hpNoteSize) > maxHpNoteW) hpNoteSize -= 0.4;
  page.drawText(hdNote, { x: hpNoteX, y: curY - 24, size: hpNoteSize, font });

  // Box 3: Velocità (auto-fit font or wrap 2 lines cleanly inside box)
  page.drawRectangle({ x: x + 10 + colW * 2, y: curY - 32, width: colW, height: 32, borderColor: rgb(0.4, 0.4, 0.4), borderWidth: 0.5 });
  page.drawText('VELOCITÀ', { x: x + 14 + colW * 2, y: curY - 10, size: 6.5, font: bold });
  const speedStr = clean(data.speed);
  const maxSpeedW = colW - 10;
  let speedSize = 10.5;
  while (speedSize > 7.2 && bold.widthOfTextAtSize(speedStr, speedSize) > maxSpeedW) {
    speedSize -= 0.5;
  }
  if (bold.widthOfTextAtSize(speedStr, speedSize) <= maxSpeedW) {
    page.drawText(speedStr, { x: x + 14 + colW * 2, y: curY - 25, size: speedSize, font: bold });
  } else {
    const spLines = wrapLines(speedStr, bold, 7, maxSpeedW).slice(0, 2);
    spLines.forEach((sl, idx) => {
      page.drawText(sl, { x: x + 14 + colW * 2, y: curY - 19 - idx * 8.5, size: 7, font: bold });
    });
  }

  curY -= 40;

  // Abilities Grid (6 stats: FOR, DES, COS, INT, SAG, CAR)
  const statKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
  const statLabels = { str: 'FOR', dex: 'DES', con: 'COS', int: 'INT', wis: 'SAG', cha: 'CAR' };
  const statW = (W - 20) / 6;

  page.drawRectangle({ x: x + 10, y: curY - 28, width: W - 20, height: 28, borderColor: rgb(0.4, 0.4, 0.4), borderWidth: 0.5 });
  statKeys.forEach((key, idx) => {
    const sx = x + 10 + idx * statW;
    const stat = data.abilities[key];
    const lbl = statLabels[key];
    const valStr = `${stat.score} (${sign(stat.mod)})`;
    page.drawText(lbl, { x: sx + (statW - bold.widthOfTextAtSize(lbl, 7)) / 2, y: curY - 10, size: 7, font: bold });
    page.drawText(valStr, { x: sx + (statW - font.widthOfTextAtSize(valStr, 8)) / 2, y: curY - 22, size: 8, font });
    if (idx > 0) {
      page.drawLine({ start: { x: sx, y: curY }, end: { x: sx, y: curY - 28 }, thickness: 0.4, color: rgb(0.6, 0.6, 0.6) });
    }
  });

  curY -= 36;

  // Stats / Senses / Immunities block
  const printDetail = (label: string, value: string) => {
    const lText = clean(`${label}: `);
    const vText = clean(value);
    const lW = bold.widthOfTextAtSize(lText, 7.5);
    page.drawText(lText, { x: x + 12, y: curY, size: 7.5, font: bold });
    const lines = wrapLines(vText, font, 7.5, Math.max(40, W - 24 - lW));
    lines.forEach((line, i) => {
      page.drawText(line, { x: x + 12 + (i === 0 ? lW : 0), y: curY - i * 9.5, size: 7.5, font });
    });
    curY -= Math.max(1, lines.length) * 9.5 + 2;
  };

  if (data.savingThrows) printDetail('Tiri Salvezza', data.savingThrows);
  if (data.skills) printDetail('Abilità', data.skills);
  if (data.damageImmunities) printDetail('Immunità ai Danni', data.damageImmunities);
  if (data.conditionImmunities) printDetail('Immunità alle Condizioni', data.conditionImmunities);
  if (data.senses) printDetail('Sensi', data.senses);
  if (data.languages) printDetail('Linguaggi', data.languages);
  if (data.proficiencyBonusNotice) printDetail('Bonus di Competenza', data.proficiencyBonusNotice);

  curY -= 4;
  page.drawLine({ start: { x: x + 10, y: curY }, end: { x: x + W - 10, y: curY }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
  curY -= 8;

  // Tratti Speciali & Regole di Comando
  data.traits.forEach((trait) => {
    const title = clean(`${trait.name}. `);
    const tW = bold.widthOfTextAtSize(title, 8);
    page.drawText(title, { x: x + 12, y: curY, size: 8, font: bold });
    const lines = wrapLines(clean(trait.text), font, 8, Math.max(40, W - 24 - tW));
    lines.forEach((l, i) => {
      page.drawText(l, { x: x + 12 + (i === 0 ? tW : 0), y: curY - i * 10, size: 8, font });
    });
    curY -= Math.max(1, lines.length) * 10 + 4;
  });

  if (data.commandRules) {
    const cmdTitle = clean('Regola di Comando: ');
    const cW = bold.widthOfTextAtSize(cmdTitle, 8);
    page.drawText(cmdTitle, { x: x + 12, y: curY, size: 8, font: bold });
    const lines = wrapLines(clean(data.commandRules), font, 8, Math.max(40, W - 24 - cW));
    lines.forEach((l, i) => {
      page.drawText(l, { x: x + 12 + (i === 0 ? cW : 0), y: curY - i * 10, size: 8, font });
    });
    curY -= Math.max(1, lines.length) * 10 + 6;
  }

  // Section: AZIONI
  page.drawRectangle({ x: x + 10, y: curY - 14, width: W - 20, height: 14, color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0.4, 0.4, 0.4), borderWidth: 0.4 });
  page.drawText('AZIONI', { x: x + 14, y: curY - 11, size: 8, font: bold });
  curY -= 20;

  data.actions.forEach((act) => {
    const header = clean(`${act.name}. `);
    const hW = bold.widthOfTextAtSize(header, 8);
    page.drawText(header, { x: x + 12, y: curY, size: 8, font: bold });
    if (act.uses) {
      drawFantasyTracker(page, { x: x + W - 70, y: curY - 3, width: 56, height: 16 }, act.uses);
      page.drawText(`(${act.uses} usi/giorno)`, { x: x + W - 142, y: curY + 1, size: 7, font });
      curY -= 11;
      const lines = wrapLines(clean(act.text), font, 8, W - 24);
      lines.forEach((l, i) => {
        page.drawText(l, { x: x + 12, y: curY - i * 10, size: 8, font });
      });
      curY -= Math.max(1, lines.length) * 10 + 6;
    } else {
      const lines = wrapLines(clean(act.text), font, 8, Math.max(40, W - 24 - hW));
      lines.forEach((l, i) => {
        page.drawText(l, { x: x + 12 + (i === 0 ? hW : 0), y: curY - i * 10, size: 8, font });
      });
      curY -= Math.max(1, lines.length) * 10 + 6;
    }
  });

  // Section: REAZIONI
  if (data.reactions.length > 0) {
    page.drawRectangle({ x: x + 10, y: curY - 14, width: W - 20, height: 14, color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0.4, 0.4, 0.4), borderWidth: 0.4 });
    page.drawText('REAZIONI', { x: x + 14, y: curY - 11, size: 8, font: bold });
    curY -= 20;

    data.reactions.forEach((reac) => {
      page.drawText(clean(reac.name), { x: x + 12, y: curY, size: 8, font: bold });
      curY -= 10;
      const lines = wrapLines(clean(reac.text), font, 8, W - 24);
      lines.forEach((l, i) => {
        page.drawText(l, { x: x + 12, y: curY - i * 10, size: 8, font });
      });
      curY -= Math.max(1, lines.length) * 10 + 5;
    });
  }

  // Section: RIANIMAZIONE E RIPRISTINO
  if (data.recoveryNotes && data.recoveryNotes.length > 0) {
    curY -= 2;
    page.drawLine({ start: { x: x + 10, y: curY }, end: { x: x + W - 10, y: curY }, thickness: 0.4, color: rgb(0.6, 0.6, 0.6) });
    curY -= 8;
    data.recoveryNotes.forEach((note) => {
      const lines = wrapLines(clean(`• ${note}`), font, 7.5, W - 24);
      lines.forEach((l, i) => {
        page.drawText(l, { x: x + 12, y: curY - i * 9.5, size: 7.5, font });
      });
      curY -= Math.max(1, lines.length) * 9.5 + 2;
    });
  }
}

/**
 * Builds the resolved stat block for the Artificer's Steel Defender (Fabbro da battaglia).
 */
export function buildSteelDefenderStatBlock(
  artificerLevel: number,
  intMod: number,
  pb: number,
  spellAttack: number,
  languages: string[]
): CompanionStatBlockData {
  const hp = 2 + intMod + 5 * artificerLevel;
  const langText =
    languages.length > 0
      ? `Comprende ${languages.join(', ')} ma non parla`
      : 'Comprende i linguaggi del creatore ma non parla';

  return {
    title: "DIFENSORE D'ACCIAIO",
    typeSubtitle: 'Costrutto Medio, Neutrale',
    ac: 15,
    acNotes: '(armatura naturale)',
    hpMax: hp,
    hitDice: `${artificerLevel}d8`,
    speed: '12 m',
    abilities: {
      str: { score: 14, mod: 2 },
      dex: { score: 12, mod: 1 },
      con: { score: 14, mod: 2 },
      int: { score: 4, mod: -3 },
      wis: { score: 10, mod: 0 },
      cha: { score: 6, mod: -2 },
    },
    savingThrows: `Destrezza +${1 + pb}, Costituzione +${2 + pb}`,
    skills: `Atletica +${2 + pb}, Percezione +${0 + pb * 2}`,
    damageImmunities: 'Veleno',
    conditionImmunities: 'Affascinato, Avvelenato, Esausto',
    senses: `Scurovisione 18 m, Percezione passiva ${10 + pb * 2}`,
    languages: langText,
    proficiencyBonusNotice: `+${pb} (pari a quello dell'artefice)`,
    traits: [
      {
        name: 'Vigile',
        text: 'Il difensore non può essere sorpreso.',
      },
    ],
    commandRules:
      "In combattimento agisce nello stesso conteggio di iniziativa, subito dopo il tuo turno. Può muoversi e usare la sua reazione da solo; l'unica azione che compie nel proprio turno è la Schivata, a meno che tu non spenda un'azione bonus nel tuo turno per comandargli un'altra azione (tra quelle del blocco o Scatto, Disimpegno, Aiuto). Se sei incapacitato, agisce liberamente.",
    actions: [
      {
        name: 'Squarcio Rinforzato',
        text: `Attacco con arma da mischia: ${sign(spellAttack)} per colpire, portata 1,5 m, un bersaglio. Colpito: 1d8 + ${pb} danni da forza.`,
      },
      {
        name: 'Riparazione',
        uses: 3,
        text: `Il difensore tocca se stesso, un altro costrutto o un oggetto entro 1,5 m: il bersaglio recupera 2d8 + ${pb} Punti Ferita.`,
      },
    ],
    reactions: [
      {
        name: 'Devia Attacco',
        text: 'Il difensore impone svantaggio al tiro per colpire di una creatura nel suo campo visivo entro 1,5 metri, purché il tiro sia effettuato contro una creatura diversa dal difensore.',
      },
    ],
    recoveryNotes: [
      "Se l'incantesimo Riparare (Mending) viene lanciato su di esso, recupera 2d6 Punti Ferita.",
      "Se è morto da meno di 1 ora: l'artefice con un'azione e arnesi da fabbro può spendere 1 slot di 1° livello o superiore per rianimarlo dopo 1 minuto con tutti i PF.",
      "Al termine di un riposo lungo, con gli arnesi da fabbro puoi costruire un nuovo difensore d'acciaio.",
    ],
  };
}

/**
 * Builds the resolved stat block for the Artificer's Homunculus Servant (Servo Omuncolo).
 */
export function buildHomunculusStatBlock(
  artificerLevel: number,
  intMod: number,
  pb: number,
  spellAttack: number,
  languages: string[]
): CompanionStatBlockData {
  const hp = 1 + intMod + artificerLevel;
  const langText =
    languages.length > 0
      ? `Comprende ${languages.join(', ')} ma non parla`
      : 'Comprende i linguaggi del creatore ma non parla';

  return {
    title: 'SERVO OMUNCOLO',
    typeSubtitle: 'Costrutto Minuscolo, Neutrale',
    ac: 13,
    acNotes: '(armatura naturale)',
    hpMax: hp,
    hitDice: `${artificerLevel}d4`,
    speed: '6 m, volare 9 m',
    abilities: {
      str: { score: 4, mod: -3 },
      dex: { score: 15, mod: 2 },
      con: { score: 12, mod: 1 },
      int: { score: 10, mod: 0 },
      wis: { score: 10, mod: 0 },
      cha: { score: 7, mod: -2 },
    },
    savingThrows: `Destrezza +${2 + pb}`,
    skills: `Furtività +${2 + pb}, Percezione +${pb * 2}`,
    damageImmunities: 'Veleno',
    conditionImmunities: 'Avvelenato, Esausto',
    senses: `Scurovisione 18 m, Percezione passiva ${10 + pb * 2}`,
    languages: langText,
    proficiencyBonusNotice: `+${pb} (pari a quello dell'artefice)`,
    traits: [
      {
        name: 'Elusione',
        text: "Se l'omuncolo è soggetto a un effetto che permette un tiro salvezza su Destrezza per dimezzare i danni, non subisce alcun danno se supera il tiro, e solo la metà se lo fallisce.",
      },
    ],
    commandRules:
      "In combattimento condivide la tua iniziativa e agisce subito dopo il tuo turno. Può muoversi e usare la sua reazione da solo; l'unica azione che compie nel proprio turno è la Schivata, a meno che tu non usi un'azione bonus per comandargli un'altra azione (tra quelle del blocco o Scatto, Disimpegno, Aiuto). Se sei incapacitato, agisce liberamente.",
    actions: [
      {
        name: 'Colpo di Forza',
        text: `Attacco con arma a distanza: ${sign(spellAttack)} per colpire, gittata 9 m, un bersaglio nel campo visivo. Colpito: 1d4 + ${pb} danni da forza.`,
      },
    ],
    reactions: [
      {
        name: 'Incanalare Magia',
        text: "L'omuncolo trasmette un incantesimo con gittata a contatto lanciato dall'artefice. L'omuncolo deve trovarsi entro 36 metri dall'artefice.",
      },
    ],
    recoveryNotes: [
      "Se l'incantesimo Riparare (Mending) viene lanciato su di esso, recupera 2d6 Punti Ferita.",
      'Se muore, svanisce lasciando intatto il cuore di gemma o cristallo da 100 mo.',
    ],
  };
}

/**
 * Builds the resolved stat block for the Artificer Artillerist's Eldritch Cannon (Cannone Occulto).
 */
export function buildEldritchCannonStatBlock(
  artificerLevel: number,
  intMod: number,
  spellSaveDc: number,
  spellAttack: number
): CompanionStatBlockData {
  const hp = 5 * artificerLevel;
  const dmgDice = artificerLevel >= 9 ? '3d8' : '2d8';
  const maxCannons = artificerLevel >= 15 ? 2 : 1;

  return {
    title: 'CANNONE OCCULTO',
    typeSubtitle: `Oggetto Magico Piccolo o Minuscolo (${maxCannons === 2 ? 'fino a 2 simultanei' : '1 attivo'})`,
    ac: 18,
    hpMax: hp,
    hitDice: '—',
    speed: '4,5 m, scalare 4,5 m (se con gambe)',
    abilities: {
      str: { score: 10, mod: 0 },
      dex: { score: 10, mod: 0 },
      con: { score: 10, mod: 0 },
      int: { score: 10, mod: 0 },
      wis: { score: 10, mod: 0 },
      cha: { score: 10, mod: 0 },
    },
    damageImmunities: 'Psichico, Veleno',
    conditionImmunities: 'Tutte le condizioni (oggetto magico)',
    traits: [
      {
        name: 'Modello Scelto alla Creazione',
        text: 'Quando crei il cannone (1 azione con strumenti da intagliatore o fabbro; 1/riposo lungo gratis, poi 1 slot incantesimo; dura 1 ora), scegli taglia (Piccola o Minuscola impugnabile) e modalità: Lanciafiamme, Balista di Forza o Protettore.',
      },
    ],
    commandRules:
      "Nel tuo turno puoi usare un'azione bonus entro 18 m dal cannone per attivarlo e farlo camminare/scalare fino a 4,5 m verso uno spazio libero (se dotato di gambe).",
    actions: [
      {
        name: 'Lanciafiamme',
        text: `Cono di 4,5 m: ogni creatura effettua TS Destrezza CD ${spellSaveDc}; fallito ${dmgDice} danni da fuoco, superato metà danni. Incendia oggetti infiammabili non indossati o trasportati.`,
      },
      {
        name: 'Balista di Forza',
        text: `Attacco magico a distanza: ${sign(spellAttack)} per colpire, gittata 36 m, 1 bersaglio. Colpito: ${dmgDice} danni da forza e spinto di 1,5 m in direzione opposta.`,
      },
      {
        name: 'Protettore',
        text: `Il cannone e ogni creatura a tua scelta entro 3 m da esso ottengono 1d8 + ${Math.max(1, intMod)} Punti Ferita temporanei.`,
      },
      ...(artificerLevel >= 9
        ? [
            {
              name: 'Detonazione (Cannone Esplosivo)',
              text: `Con 1 azione entro 18 m ordini al cannone di autodistruggersi: ogni creatura entro 6 m effettua TS Destrezza CD ${spellSaveDc} (3d8 danni da forza, metà se superato).`,
            },
          ]
        : []),
    ],
    reactions: [],
    recoveryNotes: [
      "Se l'incantesimo Riparare (Mending) viene lanciato su di esso, recupera 2d6 Punti Ferita.",
      ...(artificerLevel >= 15
        ? ['Posizione Fortificata: tu e i tuoi alleati entro 3 m dal cannone avete mezza copertura (+2 CA e TS Des).']
        : []),
    ],
  };
}

/**
 * Builds the resolved stat block for the Ranger Beast Master companion, strictly separating:
 * - PHB Appendice D beasts (`Lupo`, `Pantera`, `Mastino`, `Falco`, `Cinghiale`) with PHB `Compagno del Ranger` rules;
 * - Tasha `Compagno Primordiale` (`Bestia della Terra`, `Bestia del Cielo`, `Bestia del Mare`) with TCoE rules.
 */
export function buildBeastCompanionStatBlock(
  rangerLevel: number,
  wisMod: number,
  pb: number,
  languages: string[],
  chosenOption: RangerBeastCompanion = 'Lupo'
): CompanionStatBlockData {
  const spellAttack = pb + wisMod;
  const spellSaveDc = 8 + pb + wisMod;
  const langList = languages.length > 0 ? languages.join(', ') : 'i linguaggi del ranger';

  // === TASHA: COMPAGNO PRIMORDIALE ===
  if (
    chosenOption === 'Bestia della Terra' ||
    chosenOption === 'Bestia del Cielo' ||
    chosenOption === 'Bestia del Mare'
  ) {
    const tashaCommandRules =
      "In combattimento agisce durante il tuo turno. Può muoversi e usare la reazione da sola, ma l'unica azione che compie è la Schivata, a meno che tu non spenda un'azione bonus per ordinarle un'altra azione, oppure sacrifichi uno dei tuoi attacchi durante l'azione di Attacco per farle eseguire l'azione di Attacco." +
      (rangerLevel >= 7
        ? ' Addestramento Straordinario (7°): i suoi attacchi sono considerati magici.'
        : '') +
      (rangerLevel >= 11
        ? ' Furia Bestiale (11°): quando le ordini l’azione di Attacco, può effettuare 2 attacchi.'
        : '') +
      (rangerLevel >= 15
        ? ' Condividere Incantesimi (15°): gli incantesimi lanciati su te stesso influenzano anche la bestia se entro 9 m.'
        : '') +
      ' Se sei incapacitato, agisce liberamente.';

    const tashaRecovery = [
      "Se è morta nell'ultima ora, puoi usare 1 azione per toccarla e spendere 1 slot incantesimo di 1° livello o superiore: torna in vita dopo 1 minuto con tutti i PF.",
      'Al termine di un riposo lungo puoi evocare una bestia primordiale diversa entro 1,5 m.',
    ];

    if (chosenOption === 'Bestia del Cielo') {
      return {
        title: 'COMPAGNO PRIMORDIALE: BESTIA DEL CIELO',
        typeSubtitle: 'Bestia Piccola, Neutrale (Tasha)',
        ac: 13 + pb,
        acNotes: '(armatura nat.)',
        hpMax: 4 + 4 * rangerLevel,
        hitDice: `${rangerLevel}d6`,
        speed: '3 m, volare 18 m',
        abilities: {
          str: { score: 6, mod: -2 },
          dex: { score: 16, mod: 3 },
          con: { score: 13, mod: 1 },
          int: { score: 8, mod: -1 },
          wis: { score: 14, mod: 2 },
          cha: { score: 11, mod: 0 },
        },
        senses: `Scurovisione 18 m, Percezione passiva ${12 + pb}`,
        languages: `Comprende ${langList}`,
        proficiencyBonusNotice: `+${pb} (Legame Primordiale: +${pb} a tutte le prove e ai TS)`,
        traits: [
          {
            name: 'Sfuggente',
            text: "La bestia non provoca attacchi d'opportunità quando esce volando dalla portata di un nemico.",
          },
          {
            name: 'Legame Primordiale',
            text: `Somma il tuo bonus di competenza (+${pb}) a qualsiasi prova di caratteristica o tiro salvezza effettuato dalla bestia.`,
          },
        ],
        commandRules: tashaCommandRules,
        actions: [
          {
            name: 'Sbrandellare',
            text: `Attacco con arma da mischia: ${sign(spellAttack)} per colpire, portata 1,5 m, un bersaglio. Colpito: 1d4 + ${3 + pb} danni taglienti.`,
          },
        ],
        reactions: [],
        recoveryNotes: tashaRecovery,
      };
    }

    if (chosenOption === 'Bestia del Mare') {
      return {
        title: 'COMPAGNO PRIMORDIALE: BESTIA DEL MARE',
        typeSubtitle: 'Bestia Media, Neutrale (Tasha)',
        ac: 13 + pb,
        acNotes: '(armatura nat.)',
        hpMax: 5 + 5 * rangerLevel,
        hitDice: `${rangerLevel}d8`,
        speed: '1,5 m, nuotare 18 m',
        abilities: {
          str: { score: 14, mod: 2 },
          dex: { score: 14, mod: 2 },
          con: { score: 15, mod: 2 },
          int: { score: 8, mod: -1 },
          wis: { score: 14, mod: 2 },
          cha: { score: 11, mod: 0 },
        },
        senses: `Scurovisione 18 m, Percezione passiva ${12 + pb}`,
        languages: `Comprende ${langList}`,
        proficiencyBonusNotice: `+${pb} (Legame Primordiale: +${pb} a tutte le prove e ai TS)`,
        traits: [
          {
            name: 'Anfibia',
            text: 'La bestia può respirare in aria e in acqua.',
          },
          {
            name: 'Legame Primordiale',
            text: `Somma il tuo bonus di competenza (+${pb}) a qualsiasi prova di caratteristica o tiro salvezza effettuato dalla bestia.`,
          },
        ],
        commandRules: tashaCommandRules,
        actions: [
          {
            name: 'Colpo Afferrante',
            text: `Attacco con arma da mischia: ${sign(spellAttack)} per colpire, portata 1,5 m, un bersaglio. Colpito: 1d6 + ${2 + pb} danni contundenti o perforanti e il bersaglio è afferrato (CD ${spellSaveDc} per sfuggire; max 1 bersaglio afferrato).`,
          },
        ],
        reactions: [],
        recoveryNotes: tashaRecovery,
      };
    }

    // Bestia della Terra
    return {
      title: 'COMPAGNO PRIMORDIALE: BESTIA DELLA TERRA',
      typeSubtitle: 'Bestia Media, Neutrale (Tasha)',
      ac: 13 + pb,
      acNotes: '(armatura nat.)',
      hpMax: 5 + 5 * rangerLevel,
      hitDice: `${rangerLevel}d8`,
      speed: '12 m, scalare 12 m',
      abilities: {
        str: { score: 14, mod: 2 },
        dex: { score: 14, mod: 2 },
        con: { score: 15, mod: 2 },
        int: { score: 8, mod: -1 },
        wis: { score: 14, mod: 2 },
        cha: { score: 11, mod: 0 },
      },
      senses: `Scurovisione 18 m, Percezione passiva ${12 + pb}`,
      languages: `Comprende ${langList}`,
      proficiencyBonusNotice: `+${pb} (Legame Primordiale: +${pb} a tutte le prove e ai TS)`,
      traits: [
        {
          name: 'Carica',
          text: `Se si muove di almeno 6 m in linea retta verso un bersaglio e lo colpisce con Dilaniare nello stesso turno, infligge +1d6 danni taglienti extra e la creatura deve superare TS Forza CD ${spellSaveDc} o cadere prona.`,
        },
        {
          name: 'Legame Primordiale',
          text: `Somma il tuo bonus di competenza (+${pb}) a qualsiasi prova di caratteristica o tiro salvezza effettuato dalla bestia.`,
        },
      ],
      commandRules: tashaCommandRules,
      actions: [
        {
          name: 'Dilaniare',
          text: `Attacco con arma da mischia: ${sign(spellAttack)} per colpire, portata 1,5 m, un bersaglio. Colpito: 1d8 + ${2 + pb} danni taglienti.`,
        },
      ],
      reactions: [],
      recoveryNotes: tashaRecovery,
    };
  }

  // === PHB APPENDICE D: COMPAGNO DEL RANGER ===
  const phbCommandRules =
    'Svolge il turno alla tua iniziativa. Movimento ordinato verbalmente senza azione; usi la tua azione per ordinarle Attacco, Aiuto, Disimpegno, Scatto o Schivata.' +
    (rangerLevel >= 5
      ? ' Con Attacco Extra puoi effettuare 1 attacco con arma quando le ordini Attacco.'
      : '') +
    (rangerLevel >= 7
      ? ' Addestramento Straordinario (7°): nei turni in cui non attacca, con 1 azione bonus le ordini Aiuto, Disimpegno, Scatto o Schivata (e i suoi attacchi sono magici).'
      : '') +
    (rangerLevel >= 11
      ? ' Furia Bestiale (11°): quando le ordini Attacco, effettua 2 attacchi.'
      : '') +
    (rangerLevel >= 15
      ? ' Condividere Incantesimi (15°): gli incantesimi lanciati su te stesso influenzano anche la bestia entro 9 m.'
      : '') +
    ' Usa la reazione autonomamente; se sei incapacitato agisce da sola.';

  const phbRecovery = [
    'Può spendere Dadi Vita durante un riposo breve per recuperare Punti Ferita.',
    'Se muore, puoi ottenere un nuovo compagno trascorrendo 8 ore a instaurare un legame magico con una bestia non ostile idonea (GS <= 1/4, taglia Media o inferiore).',
  ];

  if (chosenOption === 'Pantera') {
    return {
      title: 'COMPAGNO DEL RANGER: PANTERA',
      typeSubtitle: 'Bestia Media, Senza Allineamento (PHB GS 1/4)',
      ac: 12 + pb,
      acNotes: `(12 + BC ${pb})`,
      hpMax: Math.max(13, 4 * rangerLevel),
      hitDice: '3d8',
      speed: '15 m, scalare 12 m',
      abilities: {
        str: { score: 14, mod: 2 },
        dex: { score: 15, mod: 2 },
        con: { score: 10, mod: 0 },
        int: { score: 3, mod: -4 },
        wis: { score: 14, mod: 2 },
        cha: { score: 7, mod: -2 },
      },
      skills: `Furtività +${6 + pb}, Percezione +${4 + pb}`,
      senses: `Percezione passiva ${14 + pb}`,
      languages: '—',
      proficiencyBonusNotice: `+${pb} applicato a CA, TpC, danni e abilità competenti`,
      traits: [
        {
          name: 'Olfatto Acuto',
          text: "Vantaggio alle prove di Saggezza (Percezione) basate sull'olfatto.",
        },
        {
          name: 'Balzo',
          text: 'Se si muove di almeno 6 m in linea retta verso un bersaglio subito prima di colpirlo con gli artigli, il bersaglio deve superare TS Forza CD 12 o cadere prono; se è prono, la pantera può effettuare 1 attacco con il morso come azione bonus.',
        },
      ],
      commandRules: phbCommandRules,
      actions: [
        {
          name: 'Morso',
          text: `Attacco con arma da mischia: +${4 + pb} per colpire, portata 1,5 m, un bersaglio. Colpito: 1d6 + ${2 + pb} danni perforanti.`,
        },
        {
          name: 'Artigli',
          text: `Attacco con arma da mischia: +${4 + pb} per colpire, portata 1,5 m, un bersaglio. Colpito: 1d4 + ${2 + pb} danni taglienti.`,
        },
      ],
      reactions: [],
      recoveryNotes: phbRecovery,
    };
  }

  if (chosenOption === 'Mastino') {
    return {
      title: 'COMPAGNO DEL RANGER: MASTINO',
      typeSubtitle: 'Bestia Media, Senza Allineamento (PHB GS 1/8)',
      ac: 12 + pb,
      acNotes: `(12 + BC ${pb})`,
      hpMax: Math.max(5, 4 * rangerLevel),
      hitDice: '1d8 + 1',
      speed: '12 m',
      abilities: {
        str: { score: 13, mod: 1 },
        dex: { score: 14, mod: 2 },
        con: { score: 12, mod: 1 },
        int: { score: 3, mod: -4 },
        wis: { score: 12, mod: 1 },
        cha: { score: 7, mod: -2 },
      },
      skills: `Percezione +${3 + pb}`,
      senses: `Percezione passiva ${13 + pb}`,
      languages: '—',
      proficiencyBonusNotice: `+${pb} applicato a CA, TpC, danni e abilità competenti`,
      traits: [
        {
          name: 'Olfatto e Udito Acuti',
          text: "Vantaggio alle prove di Saggezza (Percezione) basate sull'olfatto e sull'udito.",
        },
      ],
      commandRules: phbCommandRules,
      actions: [
        {
          name: 'Morso',
          text: `Attacco con arma da mischia: +${3 + pb} per colpire, portata 1,5 m, un bersaglio. Colpito: 1d6 + ${1 + pb} danni perforanti; se è una creatura, TS Forza CD 11 o cade prona.`,
        },
      ],
      reactions: [],
      recoveryNotes: phbRecovery,
    };
  }

  if (chosenOption === 'Falco') {
    return {
      title: 'COMPAGNO DEL RANGER: FALCO',
      typeSubtitle: 'Bestia Minuscola, Senza Allineamento (PHB GS 0)',
      ac: 13 + pb,
      acNotes: `(13 + BC ${pb})`,
      hpMax: Math.max(1, 4 * rangerLevel),
      hitDice: '1d4 - 1',
      speed: '3 m, volare 18 m',
      abilities: {
        str: { score: 5, mod: -3 },
        dex: { score: 16, mod: 3 },
        con: { score: 8, mod: -1 },
        int: { score: 2, mod: -4 },
        wis: { score: 14, mod: 2 },
        cha: { score: 6, mod: -2 },
      },
      skills: `Percezione +${4 + pb}`,
      senses: `Percezione passiva ${14 + pb}`,
      languages: '—',
      proficiencyBonusNotice: `+${pb} applicato a CA, TpC, danni e abilità competenti`,
      traits: [
        {
          name: 'Vista Acuta',
          text: 'Vantaggio alle prove di Saggezza (Percezione) basate sulla vista.',
        },
      ],
      commandRules: phbCommandRules,
      actions: [
        {
          name: 'Speroni',
          text: `Attacco con arma da mischia: +${5 + pb} per colpire, portata 1,5 m, un bersaglio. Colpito: ${1 + pb} danni taglienti.`,
        },
      ],
      reactions: [],
      recoveryNotes: phbRecovery,
    };
  }

  if (chosenOption === 'Cinghiale') {
    return {
      title: 'COMPAGNO DEL RANGER: CINGHIALE',
      typeSubtitle: 'Bestia Media, Senza Allineamento (PHB GS 1/4)',
      ac: 11 + pb,
      acNotes: `(arm. nat. + BC)`,
      hpMax: Math.max(11, 4 * rangerLevel),
      hitDice: '2d8 + 2',
      speed: '12 m',
      abilities: {
        str: { score: 13, mod: 1 },
        dex: { score: 11, mod: 0 },
        con: { score: 12, mod: 1 },
        int: { score: 2, mod: -4 },
        wis: { score: 9, mod: -1 },
        cha: { score: 5, mod: -3 },
      },
      senses: `Percezione passiva 9`,
      languages: '—',
      proficiencyBonusNotice: `+${pb} applicato a CA, TpC e danni`,
      traits: [
        {
          name: 'Carica',
          text: 'Se si muove di almeno 6 m in linea retta verso una creatura subito prima di colpirla con le zanne, infligge +1d6 danni taglienti extra e il bersaglio deve superare TS Forza CD 11 o cadere prono.',
        },
        {
          name: 'Implacabile (1/riposo breve o lungo)',
          text: 'Se subisce 7 o meno danni che lo porterebbero a 0 PF, scende invece a 1 PF.',
        },
      ],
      commandRules: phbCommandRules,
      actions: [
        {
          name: 'Zanne',
          text: `Attacco con arma da mischia: +${3 + pb} per colpire, portata 1,5 m, un bersaglio. Colpito: 1d6 + ${1 + pb} danni taglienti.`,
        },
      ],
      reactions: [],
      recoveryNotes: phbRecovery,
    };
  }

  // Default PHB Appendice D: Lupo
  return {
    title: 'COMPAGNO DEL RANGER: LUPO',
    typeSubtitle: 'Bestia Media, Senza Allineamento (PHB GS 1/4)',
    ac: 13 + pb,
    acNotes: `(arm. nat. + BC)`,
    hpMax: Math.max(11, 4 * rangerLevel),
    hitDice: '2d8 + 2',
    speed: '12 m',
    abilities: {
      str: { score: 12, mod: 1 },
      dex: { score: 15, mod: 2 },
      con: { score: 12, mod: 1 },
      int: { score: 3, mod: -4 },
      wis: { score: 12, mod: 1 },
      cha: { score: 6, mod: -2 },
    },
    skills: `Furtività +${4 + pb}, Percezione +${3 + pb}`,
    senses: `Percezione passiva ${13 + pb}`,
    languages: '—',
    proficiencyBonusNotice: `+${pb} applicato a CA, TpC, danni e abilità competenti`,
    traits: [
      {
        name: 'Olfatto e Udito Acuti',
        text: "Vantaggio alle prove di Saggezza (Percezione) basate sull'olfatto e sull'udito.",
      },
      {
        name: 'Tattiche del Branco',
        text: 'Vantaggio ai tiri per colpire contro una creatura se almeno un alleato non incapacitato si trova entro 1,5 m da essa.',
      },
    ],
    commandRules: phbCommandRules,
    actions: [
      {
        name: 'Morso',
        text: `Attacco con arma da mischia: +${4 + pb} per colpire, portata 1,5 m, un bersaglio. Colpito: 2d4 + ${2 + pb} danni perforanti; se il bersaglio è una creatura, deve superare TS Forza CD 11 o cadere prono.`,
      },
    ],
    reactions: [],
    recoveryNotes: phbRecovery,
  };
}
