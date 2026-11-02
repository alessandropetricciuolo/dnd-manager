import type { SkillKey } from "./types";

export class ReconcileChoicesError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ReconcileChoicesError";
    this.statusCode = statusCode;
  }
}

export type ReconcileV2Input = {
  input: Record<string, string>;
  bonusSkills?: SkillKey[];
  fightingStyle?: string;
  clericChoices?: any;
  barbarianChoices?: any;
  druidChoices?: any;
  fighterChoices?: any;
  rogueChoices?: any;
  wizardChoices?: any;
  monkChoices?: any;
  paladinChoices?: any;
  rangerChoices?: any;
  sorcererChoices?: any;
  warlockChoices?: any;
};

export type ReconciledV2Output = {
  effectiveOverrides: Record<string, any>;
  fighterChoices?: any;
  paladinChoices?: any;
  rangerChoices?: any;
  warlockChoices?: any;
  sorcererChoices?: any;
  monkChoices?: any;
  clericChoices?: any;
  barbarianChoices?: any;
  druidChoices?: any;
  rogueChoices?: any;
  wizardChoices?: any;
  bonusSkills: SkillKey[];
  fightingStyle?: string;
};

/**
 * Funzione di produzione condivisa tra l'endpoint reale (/api/sheet-pdf-v2) e le verifiche di test.
 * Riconcilia coerentemente le scelte del client con le buildOverrides del motore D&D 5e.
 */
export function reconcileV2ExportPayload(payload: ReconcileV2Input): ReconciledV2Output {
  let rawOverrides: Record<string, any> = {};
  try {
    if (payload.input.buildOverridesJson) {
      rawOverrides = JSON.parse(payload.input.buildOverridesJson);
    }
  } catch {}

  const effectiveOverrides: Record<string, any> = { ...rawOverrides };
  const classLabel = payload.input.classLabel;
  const isChampion = /campione/i.test(payload.input.classSubclass ?? "");
  const level = Number.parseInt(payload.input.level ?? "1", 10) || 1;

  let fighterChoices = payload.fighterChoices ? { ...payload.fighterChoices } : undefined;
  let paladinChoices = payload.paladinChoices ? { ...payload.paladinChoices } : undefined;
  let rangerChoices = payload.rangerChoices ? { ...payload.rangerChoices } : undefined;
  let warlockChoices = payload.warlockChoices ? { ...payload.warlockChoices } : undefined;
  const sorcererChoices = payload.sorcererChoices ? { ...payload.sorcererChoices } : undefined;
  const monkChoices = payload.monkChoices ? { ...payload.monkChoices } : undefined;
  const clericChoices = payload.clericChoices ? { ...payload.clericChoices } : undefined;
  const barbarianChoices = payload.barbarianChoices ? { ...payload.barbarianChoices } : undefined;
  const druidChoices = payload.druidChoices ? { ...payload.druidChoices } : undefined;
  const rogueChoices = payload.rogueChoices ? { ...payload.rogueChoices } : undefined;
  const wizardChoices = payload.wizardChoices ? { ...payload.wizardChoices } : undefined;
  let fightingStyle = payload.fightingStyle;

  // 1. Guerriero & Guerriero Campione
  if (classLabel === "Guerriero") {
    if (!fighterChoices && (effectiveOverrides.fightingStyle || effectiveOverrides.fighter)) {
      fighterChoices = {
        ...(effectiveOverrides.fightingStyle ? { fightingStyle: effectiveOverrides.fightingStyle } : {}),
        ...(effectiveOverrides.secondFightingStyle ? { secondFightingStyle: effectiveOverrides.secondFightingStyle } : {}),
        ...effectiveOverrides.fighter,
      };
    }
    if (fighterChoices) {
      if (fighterChoices.fightingStyle) {
        effectiveOverrides.fightingStyle = fighterChoices.fightingStyle;
      }
      if (fighterChoices.secondFightingStyle) {
        if (!isChampion || level < 10) {
          throw new ReconcileChoicesError(
            "Lo stile di combattimento aggiuntivo è riservato al Guerriero Campione dal livello 10.",
            422
          );
        }
        if (fighterChoices.secondFightingStyle === fighterChoices.fightingStyle) {
          throw new ReconcileChoicesError(
            "Il secondo stile di combattimento deve essere diverso dal primo.",
            422
          );
        }
        effectiveOverrides.secondFightingStyle = fighterChoices.secondFightingStyle;
      }
    }
  }

  // 2. Paladino
  if (classLabel === "Paladino") {
    if (paladinChoices?.fightingStyle) {
      effectiveOverrides.fightingStyle = paladinChoices.fightingStyle;
    } else if (effectiveOverrides.fightingStyle) {
      paladinChoices = { ...paladinChoices, fightingStyle: effectiveOverrides.fightingStyle };
    }
  }

  // 3. Ranger
  if (classLabel === "Ranger") {
    if (rangerChoices?.fightingStyle) {
      effectiveOverrides.fightingStyle = rangerChoices.fightingStyle;
    } else if (effectiveOverrides.fightingStyle) {
      rangerChoices = { ...rangerChoices, fightingStyle: effectiveOverrides.fightingStyle };
    }
  }

  // 4. Bardo (Stile Spade e Competenze Sapienza)
  let bonusSkills: SkillKey[] = [];
  if (classLabel === "Bardo") {
    if (fightingStyle) {
      effectiveOverrides.fightingStyle = fightingStyle;
    } else if (effectiveOverrides.fightingStyle) {
      fightingStyle = effectiveOverrides.fightingStyle;
    }

    // Le tre competenze aggiuntive del Collegio della Sapienza restano separate dalle normali competenze di classe.
    // Non vengono mai unite a effectiveOverrides.classSkills prima della validazione del collegio.
    const isLoreBard = level >= 3 && /sapienza/i.test(payload.input.classSubclass ?? "");
    if (isLoreBard) {
      if (payload.bonusSkills && payload.bonusSkills.length > 0) {
        bonusSkills = [...new Set(payload.bonusSkills)] as SkillKey[];
      } else if (effectiveOverrides.bonusSkills && effectiveOverrides.bonusSkills.length > 0) {
        bonusSkills = [...new Set(effectiveOverrides.bonusSkills)] as SkillKey[];
      } else if (effectiveOverrides.bardBonusSkills && effectiveOverrides.bardBonusSkills.length > 0) {
        bonusSkills = [...new Set(effectiveOverrides.bardBonusSkills)] as SkillKey[];
      }
      effectiveOverrides.bonusSkills = bonusSkills;
    }
  }

  // 5. Warlock
  if (classLabel === "Warlock") {
    if (!warlockChoices && (effectiveOverrides.warlockPact || effectiveOverrides.warlockInvocations)) {
      warlockChoices = {
        ...(effectiveOverrides.warlockPact ? { pactBoon: effectiveOverrides.warlockPact } : {}),
        ...(effectiveOverrides.warlockInvocations ? { invocations: effectiveOverrides.warlockInvocations } : {}),
      };
    }
    if (warlockChoices) {
      if (warlockChoices.pactBoon) effectiveOverrides.warlockPact = warlockChoices.pactBoon;
      if (warlockChoices.invocations && warlockChoices.invocations.length > 0) {
        effectiveOverrides.warlockInvocations = warlockChoices.invocations;
      } else if (effectiveOverrides.warlockInvocations && effectiveOverrides.warlockInvocations.length > 0) {
        warlockChoices.invocations = effectiveOverrides.warlockInvocations;
      }
    }
  }

  return {
    effectiveOverrides,
    fighterChoices,
    paladinChoices,
    rangerChoices,
    warlockChoices,
    sorcererChoices,
    monkChoices,
    clericChoices,
    barbarianChoices,
    druidChoices,
    rogueChoices,
    wizardChoices,
    bonusSkills,
    fightingStyle,
  };
}
