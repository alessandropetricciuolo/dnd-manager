import assert from "node:assert/strict";
import test from "node:test";
import {
  createCharacterSheetV1,
  resolveCharacterMaxHp,
  resolveCharacterSpellSlots,
  resolveEffectiveCharacterFields,
  syncCharacterSheetWithRegistry,
} from "../character-sheet";
import {
  executeLevelUpCharacterWithCas,
  mergeRecomputedSnapshot,
  prepareLongCharacterSheetPatch,
  validateCharacterLevelAndSubclass,
} from "../character-sheet-mutations";
import {
  applySheetCheckUpdate,
  buildLongSheetSubmission,
  createInitialLongEditorState,
} from "../long-sheet-editor-model";
import {
  applyMobileCharacterOperation,
  saveMobileCharacterState,
  type MobileCharacterRecord,
} from "../mobile-character-state";
import {
  deriveMobileCharacterStats,
  projectMobileCharacter,
} from "../../../mobile/src/lib/character-projection";
import type { CharacterRulesSnapshotV1 } from "../character-rules-snapshot";

function stubRulesSnapshot(level: number, classLabel = "Mago"): CharacterRulesSnapshotV1 {
  return {
    version: 1,
    computedAt: "2026-11-25T08:00:00.000Z",
    level,
    raceSlug: "elfo",
    subraceSlug: "alto-elfo",
    classLabel,
    classSubclass: level >= 3 ? "Scuola di Evocazione" : null,
    backgroundSlug: "sapiente",
    raceTraitsMd: "Scurovisione",
    subraceTraitsMd: "Trucchetto",
    classPrivilegesMd: `Privilegi livello ${level}`,
    classSubclassMd: level >= 3 ? "Scolpire Incantesimi" : null,
    spellcastingMd: "Incantesimi da Mago",
    spellsListMd: "### TRUCCHETTI\nLuce",
    spellsDetailsMd: { Luce: "Illumina" },
    backgroundRulesMd: "Ricercatore",
    warnings: [],
    spellSlots: [{ level: 1, count: level >= 2 ? 3 : 2 }],
    cantripsKnown: 3,
    spellcastingAbility: "int",
  };
}

test("Criterion 1: saveMobileCharacterState keeps hit_points null across inspiration, coins, and spellSlots, and preserves 0 when 0", async () => {
  let dbRecord: MobileCharacterRecord = {
    id: "char-long-null-hp",
    campaign_id: "camp-long",
    assigned_to: "player-1",
    updated_at: "2026-11-25T08:00:00.000Z",
    hit_points: null,
    coins_gp: 0,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      character_sheet: createCharacterSheetV1("manual", {
        characterName: "Seraphina",
        spellSlots: { 1: 2 },
      }),
    },
  };

  const makeDeps = () => ({
    getUser: async () => ({ id: "player-1" }),
    getCharacter: async () => ({ ...dbRecord }),
    getProfileRole: async () => "player",
    getCampaignGmId: async () => "gm-1",
    compareAndSwap: async (_id: string, expected: string, patch: any) => {
      if (dbRecord.updated_at !== expected) return null;
      dbRecord = {
        ...dbRecord,
        ...patch,
        updated_at: new Date(Date.parse(expected) + 1000).toISOString(),
      };
      return { ...dbRecord };
    },
  });

  // 1) Null HP stays null on inspiration, coins, spellSlot
  const r1 = await saveMobileCharacterState(
    dbRecord.id,
    "tok",
    { expectedUpdatedAt: dbRecord.updated_at, operation: { type: "toggleInspiration" } },
    makeDeps(),
  );
  assert.equal(r1.status, 200);
  assert.equal(dbRecord.hit_points, null);

  const r2 = await saveMobileCharacterState(
    dbRecord.id,
    "tok",
    { expectedUpdatedAt: dbRecord.updated_at, operation: { type: "coins", gp: 15, sp: 4, cp: 2 } },
    makeDeps(),
  );
  assert.equal(r2.status, 200);
  assert.equal(dbRecord.hit_points, null);
  assert.equal(dbRecord.coins_gp, 15);

  const r3 = await saveMobileCharacterState(
    dbRecord.id,
    "tok",
    { expectedUpdatedAt: dbRecord.updated_at, operation: { type: "spellSlot", level: 1, usedCount: 1 } },
    makeDeps(),
  );
  assert.equal(r3.status, 200);
  assert.equal(dbRecord.hit_points, null);
  assert.deepEqual((dbRecord.rules_snapshot as any).usedSpellSlots, { 1: 1 });

  // Without hpMax, direct HP change is still blocked with 422
  const rNoMax = await saveMobileCharacterState(
    dbRecord.id,
    "tok",
    { expectedUpdatedAt: dbRecord.updated_at, operation: { type: "hp", hitPoints: 5 } },
    makeDeps(),
  );
  assert.equal(rNoMax.status, 422);
  assert.equal(dbRecord.hit_points, null);

  // 2) Explicit 0 HP stays 0 across inspiration, coins, spellSlot
  dbRecord = {
    ...dbRecord,
    hit_points: 0,
    rules_snapshot: {
      ...dbRecord.rules_snapshot,
      character_sheet: createCharacterSheetV1("manual", {
        characterName: "Seraphina",
        hpMax: 18,
        spellSlots: { 1: 2 },
      }),
    },
  };

  for (const op of [
    { type: "toggleInspiration" as const },
    { type: "coins" as const, gp: 20, sp: 0, cp: 0 },
    { type: "spellSlot" as const, level: 1, usedCount: 2 },
  ]) {
    const res = await saveMobileCharacterState(
      dbRecord.id,
      "tok",
      { expectedUpdatedAt: dbRecord.updated_at, operation: op },
      makeDeps(),
    );
    assert.equal(res.status, 200);
    assert.equal(dbRecord.hit_points, 0);
  }
});

test("Criterion 2: discordant columns vs snapshot resolve identically across Web, Mobile (iOS/Android), and Server", () => {
  // Case A: Discordant manual/legacy row (registry has updated class/AC/level; character_sheet has canonical hpMax)
  const discordantRow = {
    id: "char-discordant",
    campaign_id: "camp-long",
    name: "Kaelen Rinomato",
    character_class: "Paladino",
    class_subclass: "Giuramento di Devozione",
    armor_class: 19,
    hit_points: 22,
    level: 4,
    rules_snapshot: {
      max_hp: 14, // stale legacy max_hp
      spellSlots: [{ level: 1, count: 1 }], // stale legacy slots
      character_sheet: createCharacterSheetV1("manual", {
        characterName: "Kaelen Vecchio",
        classLabel: "Guerriero",
        classSubclass: "Campione",
        armorClass: 16,
        level: 2,
        hpMax: 36,
        spellSlots: { 1: 3 },
      }),
    },
  };

  const web = resolveEffectiveCharacterFields(discordantRow);
  const mobile = projectMobileCharacter(discordantRow);
  const serverAfterHeal = applyMobileCharacterOperation(
    {
      hit_points: discordantRow.hit_points,
      coins_gp: 0,
      coins_sp: 0,
      coins_cp: 0,
      rules_snapshot: discordantRow.rules_snapshot,
    },
    { type: "hp", hitPoints: 35 },
  );

  assert.equal(web.name, "Kaelen Rinomato");
  assert.equal(mobile.name, "Kaelen Rinomato");
  assert.equal(web.characterClass, "Paladino");
  assert.equal(mobile.character_class, "Paladino");
  assert.equal(web.classSubclass, "Giuramento di Devozione");
  assert.equal(mobile.class_subclass, "Giuramento di Devozione");
  assert.equal(web.armorClass, 19);
  assert.equal(mobile.armor_class, 19);
  assert.equal(web.level, 4);
  assert.equal(mobile.level, 4);
  assert.equal(web.maxHp, 36);
  assert.equal(mobile.rules_snapshot?.max_hp, 36);
  assert.equal(serverAfterHeal.hit_points, 35);
  assert.deepEqual(resolveCharacterSpellSlots(discordantRow.rules_snapshot), [{ level: 1, count: 3 }]);
  assert.deepEqual(mobile.rules_snapshot?.spellSlots, [{ level: 1, count: 3 }]);

  // Case B: Partial recovered PDF sheet (registry lacks AC/subclass; PDF level 5 differs from registry level 3)
  const recoveredPartialRow = {
    id: "char-recovered",
    campaign_id: "camp-long",
    name: "Lyra",
    character_class: null,
    class_subclass: null,
    armor_class: null,
    hit_points: 18,
    level: 3,
    rules_snapshot: {
      spellSlots: [{ level: 1, count: 4 }, { level: 2, count: 2 }],
      character_sheet: createCharacterSheetV1("recovered", {
        characterName: "Lyra del Bosco",
        classLabel: "Druido",
        armorClass: 15,
        level: 5,
        hpMax: 31,
        recovery: { sourceFile: "lyra.pdf", sha256: "123", recoveredAt: "2026-10-15T00:00:00Z" },
      }),
    },
  };

  const webRec = resolveEffectiveCharacterFields(recoveredPartialRow);
  const mobileRec = projectMobileCharacter(recoveredPartialRow);
  assert.equal(webRec.characterClass, "Druido");
  assert.equal(mobileRec.character_class, "Druido");
  assert.equal(webRec.armorClass, 15);
  assert.equal(mobileRec.armor_class, 15);
  assert.equal(webRec.level, 3);
  assert.equal(mobileRec.level, 3);
  assert.equal(webRec.hasRecoveredLevelMismatch, true);
  assert.equal(webRec.recoveredPdfLevel, 5);
  assert.equal((mobileRec.rules_snapshot as any)?.character_sheet?.level, 5);

  // GM edits via "Modifica personaggio": updates AC and registry level while preserving recovered PDF level 5
  const syncedRecovered = syncCharacterSheetWithRegistry(webRec.sheet!, {
    name: "Lyra",
    character_class: "Druido",
    class_subclass: "Circolo della Luna",
    armor_class: 17,
    level: 4,
  });
  assert.equal(syncedRecovered.source, "recovered");
  assert.equal(syncedRecovered.level, 5); // PDF level preserved!
  assert.equal(syncedRecovered.armorClass, 17);
  assert.equal(syncedRecovered.classSubclass, "Circolo della Luna");

  // Case C: Pre-structured PG without character_sheet
  const legacyRow = {
    id: "char-legacy",
    campaign_id: "camp-long",
    name: "Borin",
    character_class: "Chierico",
    class_subclass: null,
    armor_class: 18,
    hit_points: 10,
    level: 2,
    rules_snapshot: {
      ...stubRulesSnapshot(2, "Chierico"),
      max_hp: 17,
      abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 16, cha: 12 },
    },
  };
  const webLegacy = resolveEffectiveCharacterFields(legacyRow);
  const mobileLegacy = projectMobileCharacter(legacyRow);
  const mobileStats = deriveMobileCharacterStats(mobileLegacy);
  assert.equal(webLegacy.sheet, null);
  assert.equal(webLegacy.armorClass, 18);
  assert.equal(mobileLegacy.armor_class, 18);
  assert.equal(webLegacy.maxHp, 17);
  assert.equal(mobileLegacy.rules_snapshot?.max_hp, 17);
  assert.equal(mobileStats.abilityScores.find((a) => a.key === "wis")?.modifier, 3);
});

test("Criterion 2b: Long campaigns allow level correction and optional subclass; Quest/Oneshot/Torneo preserve strict constraints", () => {
  // Long campaign allows lowering level from 5 to 4 and saving level 4 without subclass
  const longDown = validateCharacterLevelAndSubclass({
    isLong: true,
    isCreate: false,
    prevLevel: 5,
    levelRaw: "4",
    classSubclass: null,
  });
  assert.deepEqual(longDown, { ok: true, level: 4 });

  // Quest/Oneshot/Torneo still reject lowering level and require subclass at level 3+
  const questDown = validateCharacterLevelAndSubclass({
    isLong: false,
    isCreate: false,
    prevLevel: 5,
    levelRaw: "4",
    classSubclass: "Campione",
  });
  assert.equal(questDown.ok, false);

  const questNoSub = validateCharacterLevelAndSubclass({
    isLong: false,
    isCreate: false,
    prevLevel: 2,
    levelRaw: "3",
    classSubclass: null,
  });
  assert.equal(questNoSub.ok, false);
});

test("Criterion 3: concurrent player resource spend during level-up recomputation is preserved via CAS", async () => {
  let dbRow: MobileCharacterRecord & {
    level: number;
    character_class: string | null;
    class_subclass: string | null;
    race_slug: string | null;
    subclass_slug: string | null;
    background_slug: string | null;
  } = {
    id: "char-race-cond",
    campaign_id: "camp-long",
    assigned_to: "player-1",
    updated_at: "2026-11-25T08:10:00.000Z",
    level: 2,
    character_class: "Mago",
    class_subclass: null,
    race_slug: "elfo",
    subclass_slug: "alto-elfo",
    background_slug: "sapiente",
    hit_points: 14,
    coins_gp: 10,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      ...stubRulesSnapshot(2, "Mago"),
      usedSpellSlots: { 1: 0 },
      inspiration: false,
      character_sheet: createCharacterSheetV1("manual", {
        characterName: "Aeris",
        classLabel: "Mago",
        level: 2,
        hpMax: 14,
        spellSlots: { 1: 3 },
      }),
    },
  };

  let casAttempts = 0;

  const levelUpResult = await executeLevelUpCharacterWithCas(dbRow.id, {
    getCharacter: async () => structuredClone(dbRow),
    getCampaignType: async () => "long",
    recomputeSnapshot: async ({ level }) => {
      // Simulate player spending a spell slot and activating inspiration WHILE GM recomputes rules!
      const playerDeps = {
        getUser: async () => ({ id: "player-1" }),
        getCharacter: async () => structuredClone(dbRow),
        getProfileRole: async () => "player",
        getCampaignGmId: async () => "gm-1",
        compareAndSwap: async (_id: string, expected: string, patch: any) => {
          if (dbRow.updated_at !== expected) return null;
          dbRow = {
            ...dbRow,
            ...patch,
            updated_at: "2026-11-25T08:10:02.000Z",
          };
          return structuredClone(dbRow);
        },
      };

      const slotRes = await saveMobileCharacterState(
        dbRow.id,
        "player-token",
        { expectedUpdatedAt: dbRow.updated_at, operation: { type: "spellSlot", level: 1, usedCount: 2 } },
        playerDeps,
      );
      assert.equal(slotRes.status, 200);

      const inspRes = await saveMobileCharacterState(
        dbRow.id,
        "player-token",
        { expectedUpdatedAt: dbRow.updated_at, operation: { type: "toggleInspiration" } },
        playerDeps,
      );
      assert.equal(inspRes.status, 200);

      return stubRulesSnapshot(level, "Mago");
    },
    compareAndSwap: async (_id, expectedUpdatedAt, patch) => {
      casAttempts += 1;
      if (dbRow.updated_at !== expectedUpdatedAt) return null;
      dbRow = {
        ...dbRow,
        level: patch.level,
        rules_snapshot: patch.rules_snapshot,
        updated_at: patch.updated_at,
      };
      return { id: dbRow.id };
    },
  });

  assert.equal(levelUpResult.success, true);
  assert.equal(casAttempts, 2); // First CAS blocked stale write; retry merged onto fresh player state!
  assert.equal(dbRow.level, 3);
  assert.deepEqual((dbRow.rules_snapshot as any).usedSpellSlots, { 1: 2 });
  assert.equal((dbRow.rules_snapshot as any).inspiration, true);
  assert.equal((dbRow.rules_snapshot as any).character_sheet.level, 3);

  // If another GM concurrently changed build/level during recompute, CAS reports conflict instead of overwriting
  const conflictResult = await executeLevelUpCharacterWithCas(dbRow.id, {
    getCharacter: async () => structuredClone(dbRow),
    getCampaignType: async () => "long",
    recomputeSnapshot: async ({ level }) => {
      dbRow = { ...dbRow, level: 4, updated_at: "2026-11-25T08:20:00.000Z" };
      return stubRulesSnapshot(level, "Mago");
    },
    compareAndSwap: async (_id, expectedUpdatedAt) => (dbRow.updated_at === expectedUpdatedAt ? { id: dbRow.id } : null),
  });
  assert.equal(conflictResult.success, false);
  if (!conflictResult.success) {
    assert.equal(conflictResult.conflict, true);
  }
});

test("Criterion 4: Long sheet editor preserves multiline drafts while typing, clears bonuses/AC/maxHP cleanly, and keeps explicit zero", () => {
  const initialCharacter = {
    id: "char-editor",
    campaign_id: "camp-long",
    name: "Thoran",
    character_class: "Guerriero",
    class_subclass: "Maestro di Battaglia",
    level: 5,
    armor_class: 18,
    hit_points: 20,
    background: "Veterano",
    updated_at: "2026-11-25T08:30:00.000Z",
    rules_snapshot: {
      max_hp: 44,
      character_sheet: createCharacterSheetV1("manual", {
        characterName: "Thoran",
        classLabel: "Guerriero",
        classSubclass: "Maestro di Battaglia",
        level: 5,
        armorClass: 18,
        hpMax: 44,
        savingThrows: { str: { value: 7, proficient: true }, con: { value: 6, proficient: true } },
        skills: { athletics: { value: 7, proficient: true }, stealth: { value: -1 } },
        inventory: ["Spada lunga"],
      }),
    },
  };

  const editorState = createInitialLongEditorState(initialCharacter);

  // 1) Typing multiline with trailing newline & pasting CRLF lines does not lose empty trailing lines mid-typing
  editorState.listDrafts.inventory = "Spada lunga\n";
  assert.equal(editorState.listDrafts.inventory.endsWith("\n"), true);
  editorState.listDrafts.inventory += "Scudo\r\n\r\n2x Pozione di guarigione\n";
  editorState.listDrafts.languages = "Comune\nNanico\n";

  // 2) Clearing a skill bonus and saving throw bonus deletes the entry instead of keeping old value
  editorState.sheet.skills = applySheetCheckUpdate(editorState.sheet.skills, "stealth", "value", "");
  editorState.sheet.savingThrows = applySheetCheckUpdate(editorState.sheet.savingThrows, "con", "value", "");
  assert.equal(editorState.sheet.skills?.stealth, undefined);
  assert.equal(editorState.sheet.savingThrows?.con, undefined);
  assert.equal(editorState.sheet.skills?.athletics?.value, 7);

  // 3) Clearing AC and Max HP removes both sheet values AND registry/legacy max_hp values
  editorState.armorClass = "";
  editorState.hpMax = "";

  const builtCleared = buildLongSheetSubmission({
    expectedUpdatedAt: initialCharacter.updated_at,
    ...editorState,
  });
  assert.equal(builtCleared.ok, true);
  if (!builtCleared.ok) return;

  const patchCleared = prepareLongCharacterSheetPatch(initialCharacter, builtCleared.payload);
  assert.equal(patchCleared.ok, true);
  if (!patchCleared.ok) return;

  const savedClearedRow = {
    ...initialCharacter,
    ...patchCleared.patch,
  };

  // Reopen editor & check Web, Mobile, and Server effective values after clearing!
  const reopened = createInitialLongEditorState(savedClearedRow);
  assert.deepEqual(reopened.sheet.inventory, ["Spada lunga", "Scudo", "2x Pozione di guarigione"]);
  assert.deepEqual(reopened.sheet.languages, ["Comune", "Nanico"]);
  assert.equal(reopened.armorClass, "");
  assert.equal(reopened.hpMax, "");
  assert.equal(reopened.sheet.skills?.stealth, undefined);
  assert.equal(reopened.sheet.savingThrows?.con, undefined);

  const webCleared = resolveEffectiveCharacterFields(savedClearedRow);
  const mobileCleared = projectMobileCharacter(savedClearedRow);
  assert.equal(webCleared.armorClass, null);
  assert.equal(mobileCleared.armor_class, null);
  assert.equal(webCleared.maxHp, null);
  assert.equal(mobileCleared.rules_snapshot?.max_hp, undefined);
  assert.equal(resolveCharacterMaxHp(savedClearedRow.rules_snapshot), null);

  // 4) Explicit zero (0) for bonus, AC, and Max HP is preserved as 0 (not treated as empty)
  reopened.armorClass = "0";
  reopened.hpMax = "0";
  reopened.sheet.skills = applySheetCheckUpdate(reopened.sheet.skills, "stealth", "value", "0");

  const builtZero = buildLongSheetSubmission({
    expectedUpdatedAt: String(savedClearedRow.updated_at),
    ...reopened,
  });
  assert.equal(builtZero.ok, true);
  if (!builtZero.ok) return;

  const patchZero = prepareLongCharacterSheetPatch(savedClearedRow as any, builtZero.payload);
  assert.equal(patchZero.ok, true);
  if (!patchZero.ok) return;

  const savedZeroRow = {
    ...savedClearedRow,
    ...patchZero.patch,
  };
  const webZero = resolveEffectiveCharacterFields(savedZeroRow);
  const mobileZero = projectMobileCharacter(savedZeroRow);
  assert.equal(webZero.armorClass, 0);
  assert.equal(mobileZero.armor_class, 0);
  assert.equal(webZero.maxHp, 0);
  assert.equal(mobileZero.rules_snapshot?.max_hp, 0);
  assert.equal(webZero.sheet?.skills?.stealth?.value, 0);
});

test("End-to-end partial Long PG assigned to player keeps Web, iOS/Android, and Server aligned across full lifecycle", async () => {
  // Step 1: GM creates partial Long PG assigned to player-1 (no current HP, no character_sheet yet)
  let row: any = {
    id: "char-e2e-long",
    campaign_id: "camp-long",
    assigned_to: "player-1",
    name: "Nyx",
    character_class: "Stregone",
    class_subclass: null,
    level: 3,
    armor_class: 13,
    hit_points: null,
    background: "Orfana dei vicoli",
    coins_gp: 10,
    coins_sp: 0,
    coins_cp: 0,
    updated_at: "2026-11-25T09:00:00.000Z",
    rules_snapshot: mergeRecomputedSnapshot(stubRulesSnapshot(3, "Stregone"), null),
  };

  const stateDeps = () => ({
    getUser: async () => ({ id: "player-1" }),
    getCharacter: async () => structuredClone(row),
    getProfileRole: async () => "player",
    getCampaignGmId: async () => "gm-1",
    compareAndSwap: async (_id: string, expected: string, patch: any) => {
      if (row.updated_at !== expected) return null;
      row = { ...row, ...patch, updated_at: new Date(Date.parse(expected) + 1000).toISOString() };
      return structuredClone(row);
    },
  });

  // Step 2: Player toggles inspiration before GM finishes compiling HP -> hit_points stays null!
  const insp = await saveMobileCharacterState(
    row.id,
    "tok",
    { expectedUpdatedAt: row.updated_at, operation: { type: "toggleInspiration" } },
    stateDeps(),
  );
  assert.equal(insp.status, 200);
  assert.equal(row.hit_points, null);

  // Step 3: GM compiles partial Long sheet (hpMax = 20, inventory, spell slots) and sets current HP = 20
  const editor = createInitialLongEditorState(row);
  editor.hpMax = "20";
  editor.listDrafts.inventory = "Pugnale\nFocus arcano";
  editor.sheet.spellSlots = { 1: 4, 2: 2 };
  const sub = buildLongSheetSubmission({ expectedUpdatedAt: row.updated_at, ...editor });
  assert.equal(sub.ok, true);
  if (!sub.ok) return;
  const gmPatch = prepareLongCharacterSheetPatch(row, sub.payload);
  assert.equal(gmPatch.ok, true);
  if (!gmPatch.ok) return;
  row = { ...row, ...gmPatch.patch, hit_points: 20 };

  // Step 4: Player takes damage & spends a level-2 spell slot during GM level-up
  const dmg = await saveMobileCharacterState(
    row.id,
    "tok",
    { expectedUpdatedAt: row.updated_at, operation: { type: "hp", hitPoints: 15, tempHp: 0 } },
    stateDeps(),
  );
  assert.equal(dmg.status, 200);

  const lvl = await executeLevelUpCharacterWithCas(row.id, {
    getCharacter: async () => structuredClone(row),
    getCampaignType: async () => "long",
    recomputeSnapshot: async ({ level }) => {
      await saveMobileCharacterState(
        row.id,
        "tok",
        { expectedUpdatedAt: row.updated_at, operation: { type: "spellSlot", level: 2, usedCount: 1 } },
        stateDeps(),
      );
      return stubRulesSnapshot(level, "Stregone");
    },
    compareAndSwap: async (_id, expected, patch) => {
      if (row.updated_at !== expected) return null;
      row = { ...row, ...patch };
      return { id: row.id };
    },
  });
  assert.equal(lvl.success, true);

  // Step 5: Verify final convergence across Web, Mobile (iOS/Android), and Server
  const webFinal = resolveEffectiveCharacterFields(row);
  const mobileFinal = projectMobileCharacter(row);
  assert.equal(webFinal.level, 4);
  assert.equal(mobileFinal.level, 4);
  assert.equal(webFinal.hitPoints, 15);
  assert.equal(mobileFinal.hit_points, 15);
  assert.equal(webFinal.maxHp, 20);
  assert.equal(mobileFinal.rules_snapshot?.max_hp, 20);
  assert.equal(row.rules_snapshot.inspiration, true);
  assert.deepEqual(row.rules_snapshot.usedSpellSlots, { 2: 1 });
  assert.deepEqual(mobileFinal.rules_snapshot?.inventory?.map((i: any) => i.name), ["Pugnale", "Focus arcano"]);
});

test("Phase B: deriveCharacterSheetRules computes 5e mods, saves, skills, Factotum, spell DC/attack, hit dice, and slots, and advances on level-up", async () => {
  const {
    deriveCharacterSheetRules,
    buildCalculatedWeaponRow,
  } = await import("../character-rules-calc");
  const { parseWeaponDamage } = await import("../../../mobile/src/lib/weapon-damage");
  const { spellSlotsForCharacter } = await import("../combat-spell-slots");
  const { searchCompendiumSpells } = await import("../server/compendium-spell-search");

  // 1) Bardo Lv 4: Factotum (+floor(PB/2) = +1 on unproficient skills), Expertise, CHA spellcasting
  const bardSheet = deriveCharacterSheetRules(
    createCharacterSheetV1("manual", {
      characterName: "Lorian",
      abilities: { str: 8, dex: 16, con: 14, int: 12, wis: 10, cha: 18 },
      skills: {
        persuasion: { value: 0, proficient: true, expertise: true },
        stealth: { value: 0, proficient: true },
      },
    }),
    { characterClass: "Bardo", level: 4, raceSlugOrLabel: "halfling", applyClassSaveDefaults: true },
  );

  assert.equal(bardSheet.proficiencyBonus, 2);
  assert.equal(bardSheet.speed, "7,5 m");
  assert.equal(bardSheet.hitDie, "d8");
  assert.equal(bardSheet.hitDiceTotal, 4);
  assert.equal(bardSheet.savingThrows?.dex?.proficient, true);
  assert.equal(bardSheet.savingThrows?.dex?.value, 5); // +3 DEX + 2 PB
  assert.equal(bardSheet.savingThrows?.cha?.value, 6); // +4 CHA + 2 PB
  assert.equal(bardSheet.savingThrows?.str?.value, -1);
  assert.equal(bardSheet.skills?.persuasion?.value, 8); // +4 CHA + 4 Expertise
  assert.equal(bardSheet.skills?.stealth?.value, 5); // +3 DEX + 2 PB
  assert.equal(bardSheet.skills?.athletics?.value, 0); // -1 STR + 1 Factotum!
  assert.equal(bardSheet.skills?.perception?.value, 1); // +0 WIS + 1 Factotum!
  assert.equal(bardSheet.passivePerception, 11);
  assert.equal(bardSheet.initiative, 3);
  assert.equal(bardSheet.spellcastingAbility, "cha");
  assert.equal(bardSheet.spellSaveDc, 14); // 8 + 2 + 4
  assert.equal(bardSheet.spellAttackBonus, 6); // 2 + 4
  assert.deepEqual(bardSheet.spellSlots, { 1: 4, 2: 3 });
  assert.equal(bardSheet.cantripsKnown, 3);

  // 2) Cavaliere Mistico Lv 4 (1/3 caster) & Warlock Lv 5 (Pact Magic) & Multiclass manual slot override
  const ekSheet = deriveCharacterSheetRules(
    createCharacterSheetV1("manual", {
      abilities: { str: 16, dex: 12, con: 14, int: 14, wis: 10, cha: 8 },
    }),
    { characterClass: "Guerriero", classSubclass: "Cavaliere Mistico", level: 4, applyClassSaveDefaults: true },
  );
  assert.equal(ekSheet.hitDie, "d10");
  assert.equal(ekSheet.spellcastingAbility, "int");
  assert.equal(ekSheet.spellSaveDc, 12);
  assert.deepEqual(ekSheet.spellSlots, { 1: 3 });

  const warlockCustomSlots = deriveCharacterSheetRules(
    createCharacterSheetV1("manual", {
      abilities: { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 18 },
      manualSpellSlotsOverride: true,
      spellSlots: { 1: 2, 3: 2 },
    }),
    { characterClass: "Warlock", level: 5 },
  );
  assert.deepEqual(warlockCustomSlots.spellSlots, { 1: 2, 3: 2 });

  // 3) Weapon preset calculator + versatile damage parser
  const longsword = buildCalculatedWeaponRow({
    name: "Spada lunga",
    damageDie: "1d8",
    versatileDie: "1d10",
    damageType: "taglienti",
    mode: "melee",
    proficient: true,
    magicBonus: 1,
    abilityMods: { str: 3, dex: 1 },
    proficiencyBonus: 2,
  });
  assert.equal(longsword.name, "Spada lunga +1");
  assert.equal(longsword.toHit, "+6");
  assert.equal(longsword.damage, "1d8+4 (1d10+4)");
  const parsedDmg = parseWeaponDamage(longsword.damage);
  assert.deepEqual(parsedDmg, { diceCount: 1, die: "d8", modifier: 4 });

  // 4) Level-up from Lv 4 -> Lv 5 automatically advances PB (+2 -> +3), DC, saves, hitDiceTotal, and unlocks Lv 3 slots
  let mageRow: any = {
    id: "mage-lvlup",
    campaign_id: "camp-long",
    assigned_to: "player-1",
    level: 4,
    character_class: "Mago",
    class_subclass: "Scuola di Invocazione",
    race_slug: "umano",
    subclass_slug: null,
    background_slug: "sapiente",
    updated_at: "2026-11-25T10:00:00.000Z",
    rules_snapshot: {
      ...stubRulesSnapshot(4, "Mago"),
      usedSpellSlots: { 1: 2 },
      hit_dice: { total: 4, current: 3, die: "d6" },
      character_sheet: deriveCharacterSheetRules(
        createCharacterSheetV1("manual", {
          characterName: "Gale",
          classLabel: "Mago",
          level: 4,
          hpMax: 26,
          abilities: { str: 8, dex: 14, con: 14, int: 18, wis: 12, cha: 10 },
          skills: { arcana: { value: 6, proficient: true } },
        }),
        { characterClass: "Mago", level: 4, applyClassSaveDefaults: true },
      ),
    },
  };

  const lvl5 = await executeLevelUpCharacterWithCas(mageRow.id, {
    getCharacter: async () => structuredClone(mageRow),
    getCampaignType: async () => "long",
    recomputeSnapshot: async ({ level }) => stubRulesSnapshot(level, "Mago"),
    compareAndSwap: async (_id, expected, patch) => {
      if (mageRow.updated_at !== expected) return null;
      mageRow = { ...mageRow, ...patch };
      return { id: mageRow.id };
    },
  });
  assert.equal(lvl5.success, true);
  const s5 = mageRow.rules_snapshot.character_sheet;
  assert.equal(s5.level, 5);
  assert.equal(s5.proficiencyBonus, 3);
  assert.equal(s5.skills.arcana.value, 7); // +4 INT + 3 PB
  assert.equal(s5.savingThrows.int.value, 7);
  assert.equal(s5.spellSaveDc, 15); // 8 + 3 + 4
  assert.equal(s5.hitDiceTotal, 5);
  assert.deepEqual(s5.spellSlots, { 1: 4, 2: 3, 3: 2 });
  assert.deepEqual(mageRow.rules_snapshot.hit_dice, { total: 5, current: 4, die: "d6" });

  // Combat spell slots helper reflects character_sheet.spellSlots and subtracts usedSpellSlots
  const combatSlots = spellSlotsForCharacter({
    rules_snapshot: mageRow.rules_snapshot,
    character_class: "Mago",
    level: 5,
  });
  assert.equal(combatSlots?.max.find((x) => x.level === 3)?.count, 2);
  assert.equal(combatSlots?.remaining.find((x) => x.level === 1)?.count, 2); // 4 max - 2 used!

  // Compendium search returns structured Italian spells
  const hits = await searchCompendiumSpells({ query: "Palla di Fuoco", limit: 5 });
  assert.equal(hits.length > 0, true);
  assert.equal(hits[0]?.level, 3);
});

test("Phase B: server enforces two-tier permissions and restricts player sheet-edit operations to Long campaigns only", async () => {
  let dbRecord: MobileCharacterRecord = {
    id: "char-perms",
    campaign_id: "camp-1",
    assigned_to: "player-1",
    updated_at: "2026-11-25T11:00:00.000Z",
    hit_points: 20,
    coins_gp: 5,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      max_hp: 25,
      character_sheet: createCharacterSheetV1("manual", {
        characterName: "Vex",
        hpMax: 25,
        abilities: { str: 10, dex: 18, con: 14, int: 12, wis: 14, cha: 10 },
      }),
    },
  };

  const makeDeps = (campaignType: string, actorId = "player-1", role = "player") => ({
    getUser: async () => ({ id: actorId }),
    getCharacter: async () => structuredClone(dbRecord),
    getProfileRole: async () => role,
    getCampaignGmId: async () => "gm-1",
    getCampaignType: async () => campaignType,
    compareAndSwap: async (_id: string, expected: string, patch: any) => {
      if (dbRecord.updated_at !== expected) return null;
      dbRecord = { ...dbRecord, ...patch, updated_at: new Date(Date.parse(expected) + 1000).toISOString() };
      return structuredClone(dbRecord);
    },
  });

  // 1) In Long campaign: assigned player can add weapons, spells, inventory, and bio notes
  const addWpLong = await saveMobileCharacterState(
    dbRecord.id,
    "tok",
    {
      expectedUpdatedAt: dbRecord.updated_at,
      operation: {
        type: "upsertWeapon",
        weapon: { name: "Arco lungo", toHit: "+6", damage: "1d8+4", type: "perforanti" },
      },
    },
    makeDeps("long", "player-1", "player"),
  );
  assert.equal(addWpLong.status, 200);

  // 2) In Oneshot / Quest campaign: player weapon/spell/inventory/bio edits are blocked with 403 long_campaign_only!
  for (const campType of ["oneshot", "quest"]) {
    const blocked = await saveMobileCharacterState(
      dbRecord.id,
      "tok",
      {
        expectedUpdatedAt: dbRecord.updated_at,
        operation: {
          type: "upsertSpell",
          spell: { name: "Marchio del Cacciatore", level: 1, summary: "+1d6 danni", concentration: true },
        },
      },
      makeDeps(campType, "player-1", "player"),
    );
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.error, "long_campaign_only");
  }

  // Operational resources (HP, coins) STILL work in Oneshot / Quest!
  const questHp = await saveMobileCharacterState(
    dbRecord.id,
    "tok",
    { expectedUpdatedAt: dbRecord.updated_at, operation: { type: "hp", hitPoints: 18 } },
    makeDeps("quest", "player-1", "player"),
  );
  assert.equal(questHp.status, 200);

  // 3) GM-only fields (abilities, skills, spellSlots, hpMax) cannot be modified via PATCH /state even in Long!
  for (const forbiddenOp of [
    { type: "setAbilities", abilities: { dex: 20 } },
    { type: "setSpellSlots", spellSlots: { 1: 9 } },
    { type: "upsertWeapon", weapon: { name: "Hack", toHit: "+99", damage: "1d8", type: "x" }, abilities: { str: 30 } },
  ]) {
    const res = await saveMobileCharacterState(
      dbRecord.id,
      "tok",
      { expectedUpdatedAt: dbRecord.updated_at, operation: forbiddenOp },
      makeDeps("long", "player-1", "player"),
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "invalid_request");
  }

  // 4) Unassigned player is blocked with 403 forbidden
  const stranger = await saveMobileCharacterState(
    dbRecord.id,
    "tok",
    { expectedUpdatedAt: dbRecord.updated_at, operation: { type: "updateInventory", items: ["Furto"] } },
    makeDeps("long", "player-2", "player"),
  );
  assert.equal(stranger.status, 403);
  assert.equal(stranger.body.error, "forbidden");
});
