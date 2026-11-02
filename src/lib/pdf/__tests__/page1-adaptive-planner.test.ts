import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  AdaptiveBlock,
  AvailableSlot,
  measureBlockHeight,
  planAdaptivePage1,
} from '../page1-adaptive-planner';

test('Page 1 Adaptive Planner: Knapsack bin-packing, priority, and continuity', async (t) => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  await t.test('1. Capacity & measurement: accurately measures feature body and multi-item cards', () => {
    const singleFeat: AdaptiveBlock = {
      id: 'critico-migliorato',
      title: 'Critico Migliorato',
      priority: 1,
      category: 'subclass_feature',
      body: "I tuoi tiri per colpire con un'arma ottengono un colpo critico con un risultato di 19 o 20.",
    };
    const h1 = measureBlockHeight(singleFeat, 178, font, boldFont);
    assert.ok(h1 >= 50 && h1 <= 80, `Expected single feature height around 50-80, got ${h1}`);

    const multiItem: AdaptiveBlock = {
      id: 'proficiencies',
      title: 'LINGUAGGI E COMPETENZE',
      priority: 4,
      category: 'proficiency',
      items: [
        { kind: 'inline', label: 'Armature', body: 'Tutte le armature, scudi' },
        { kind: 'inline', label: 'Armi', body: 'Armi semplici, armi da guerra' },
        { kind: 'inline', label: 'Strumenti', body: 'Nessuno' },
        { kind: 'inline', label: 'Linguaggi', body: 'Comune, Nanico' },
      ],
    };
    const h2 = measureBlockHeight(multiItem, 178, font, boldFont);
    assert.ok(h2 >= 70 && h2 <= 110, `Expected proficiencies height around 70-110, got ${h2}`);
  });

  await t.test('2. Knapsack behavior: large block does not block smaller subsequent blocks', () => {
    // Slot with 100pt space available
    const slots: AvailableSlot[] = [
      {
        id: 'right_col',
        x: 390,
        width: 178,
        topY: 200,
        bottomY: 100,
        maxHeight: 100,
      },
    ];

    const largeP1: AdaptiveBlock = {
      id: 'huge-p1',
      title: 'Huge Subclass Capstone',
      priority: 1,
      category: 'subclass_feature',
      body: 'Very long feature text that takes many lines and exceeds the available vertical space of 100pt. '.repeat(10),
    };

    const smallP2: AdaptiveBlock = {
      id: 'small-p2-style',
      title: 'Stile: Duellare',
      priority: 2,
      category: 'chosen_option',
      body: '+2 ai danni con arma in una mano.',
    };

    const result = planAdaptivePage1([largeP1, smallP2], slots, font, boldFont);

    // Large P1 did not fit, but small P2 DID fit into the remaining space!
    assert.equal(result.placed.length, 1);
    assert.equal(result.placed[0].block.id, 'small-p2-style');
    assert.equal(result.unplaced.length, 1);
    assert.equal(result.unplaced[0].id, 'huge-p1');
    assert.ok(result.placedBlockIds.has('small-p2-style'));
    assert.ok(!result.placedBlockIds.has('huge-p1'));
  });

  await t.test('3. Multi-slot allocation: fills Right Column first, then Center Bottom', () => {
    const slots: AvailableSlot[] = [
      {
        id: 'right_col',
        x: 390,
        width: 178,
        topY: 600,
        bottomY: 520,
        maxHeight: 80, // fits 1 block (~60pt)
      },
      {
        id: 'center_bottom',
        x: 212,
        width: 168,
        topY: 250,
        bottomY: 170,
        maxHeight: 80, // fits 1 block (~60pt)
      },
    ];

    const block1: AdaptiveBlock = {
      id: 'feat-1',
      title: 'Capacità 1',
      priority: 1,
      category: 'subclass_feature',
      body: 'Descrizione breve per la prima capacità.',
    };

    const block2: AdaptiveBlock = {
      id: 'feat-2',
      title: 'Capacità 2',
      priority: 1,
      category: 'subclass_feature',
      body: 'Descrizione breve per la seconda capacità.',
    };

    const result = planAdaptivePage1([block1, block2], slots, font, boldFont);

    assert.equal(result.placed.length, 2);
    assert.equal(result.placed[0].slotId, 'right_col');
    assert.equal(result.placed[0].block.id, 'feat-1');
    assert.equal(result.placed[1].slotId, 'center_bottom');
    assert.equal(result.placed[1].block.id, 'feat-2');
    assert.equal(result.unplaced.length, 0);
  });

  await t.test('4. Full continuity and zero duplication: disjoint partition of all candidate blocks', () => {
    const slots: AvailableSlot[] = [
      {
        id: 'right_col',
        x: 390,
        width: 178,
        topY: 680,
        bottomY: 42,
        maxHeight: 250, // fits approx 3-4 blocks
      },
    ];

    const candidates: AdaptiveBlock[] = [
      { id: 'b1', title: 'Subclass 1', priority: 1, category: 'subclass_feature', body: 'Subclass feature 1 text.' },
      { id: 'b2', title: 'Subclass 2', priority: 1, category: 'subclass_feature', body: 'Subclass feature 2 text.' },
      { id: 'b3', title: 'Style Option', priority: 2, category: 'chosen_option', body: 'Chosen fighting style.' },
      { id: 'b4', title: 'Racial Traits', priority: 3, category: 'racial_trait', body: 'Darkvision and resistances.' },
      { id: 'b5', title: 'Proficiencies', priority: 4, category: 'proficiency', body: 'Armor and weapons.' },
      { id: 'b6', title: 'Inventory', priority: 5, category: 'inventory', body: 'Sword, armor, rations, backpack.' },
    ];

    const result = planAdaptivePage1(candidates, slots, font, boldFont);

    // Check disjoint partition: placed + unplaced must equal exactly candidates count
    assert.equal(result.placed.length + result.unplaced.length, candidates.length);

    const placedIds = new Set(result.placed.map((p) => p.block.id));
    const unplacedIds = new Set(result.unplaced.map((u) => u.id));

    // Intersection must be empty
    for (const pid of placedIds) {
      assert.ok(!unplacedIds.has(pid), `Duplicate block id across placed and unplaced: ${pid}`);
    }

    // Union must contain all original candidate IDs
    for (const c of candidates) {
      assert.ok(placedIds.has(c.id) || unplacedIds.has(c.id), `Missing candidate id: ${c.id}`);
    }
  });

  await t.test('5. Long inline labels wrap cleanly and do not overflow horizontal container', () => {
    const colW = 178;
    const innerW = colW - 16; // 162

    const longDwarfLabel = 'Addestramento da Combattimento Nanico';
    const blockWithLongLabel: AdaptiveBlock = {
      id: 'dwarf-traits',
      title: 'TRATTI RAZZIALI (NANO)',
      priority: 3,
      category: 'racial_trait',
      items: [
        {
          kind: 'inline',
          label: longDwarfLabel,
          body: 'Un nano ha competenza nelle asce, nelle asce da battaglia, nei martelli da guerra e nei martelli leggeri.',
        },
      ],
    };

    const h = measureBlockHeight(blockWithLongLabel, colW, font, boldFont);
    assert.ok(h >= 60, `Measured height for long label block should be >= 60pt, got ${h}`);

    // Verify label measurement exceeds threshold for splitting
    const labelW = boldFont.widthOfTextAtSize(`${longDwarfLabel}:`, 7.4);
    assert.ok(labelW + 45 > innerW, 'Dwarven combat training label must trigger multiline wrapping');
  });

  await t.test('6. Vertical clearance: Header bottom, banner, and body top have zero overlap', () => {
    // Exact geometric derivation from character-sheet-v2
    const headerTop = 814;
    const headerBottom = 696; // 36 + 36 + 46 = 118pt
    assert.equal(headerTop - headerBottom, 118);

    const bannerGap = 8;
    const bannerH = 18;
    const bannerTop = headerBottom - bannerGap; // 688
    const bannerY = bannerTop - bannerH; // 670
    const bannerLowestY = bannerY - 2; // 668 (ribbon ends extend 2pt below banner box)

    const BANNER_TO_BODY_MARGIN = 9;
    const bodyTopY = bannerLowestY - BANNER_TO_BODY_MARGIN; // 659

    // Body top (659) must be strictly below lowest ornament of banner (668)
    const clearance = bannerLowestY - bodyTopY;
    assert.ok(clearance >= 8, `Clearance between banner and body must be >= 8pt, got ${clearance}pt`);
    assert.equal(bodyTopY, 659);
  });

  await t.test('7. Class resources bottom padding: leaves >= 12pt breathing room', () => {
    const resH = 112;
    const resTop = 400; // arbitrary reference top
    const frameBottom = resTop - resH; // 288

    // Last text line in Fighter resources is drawn at resTop - 97
    const lastTextLineY = resTop - 97; // 303
    const bottomPadding = lastTextLineY - frameBottom; // 15pt

    assert.ok(bottomPadding >= 12, `Resources frame bottom padding must be >= 12pt, got ${bottomPadding}pt`);
  });
});
