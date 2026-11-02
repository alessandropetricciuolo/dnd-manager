import { matchSupplementSubclass, supplementSubclassesForClass } from '@/lib/character-subclass-catalog';
import type { SubclassCatalogEntry } from '@/lib/character-subclass-catalog';
import type { PhbFightingStyle } from './class-choice-catalog';
import { PHB_FIGHTING_STYLE_OPTIONS } from './class-choice-catalog';
import type { SkillKey } from './types';

export const FIGHTER_FIGHTING_STYLES = PHB_FIGHTING_STYLE_OPTIONS;

export const FIGHTER_CLASS_LEVELS: Record<string, number> = {
  'STILE DI COMBATTIMENTO': 1,
  'RECUPERARE ENERGIE': 1,
  'AZIONE IMPETUOSA': 2,
  'ARCHETIPO MARZIALE': 3,
  'AUMENTO DEI PUNTEGGI DI CARATTERISTICA': 4,
  'ATTACCO EXTRA': 5,
  'INDOMITO': 9,
};

export const FIGHTER_ARCHETYPE_FEATURES: Record<string, Array<[string, number]>> = {
  'phb-guerriero-campione': [
    ['CRITICO MIGLIORATO', 3],
    ['ATLETA STRAORDINARIO', 7],
    ['STILE DI COMBATTIMENTO AGGIUNTIVO', 10],
    ['CRITICO SUPERIORE', 15],
    ['SOPRAVVISSUTO', 18],
  ],
  'phb-guerriero-maestro-battaglia': [
    ['SUPERIORITÀ IN COMBATTIMENTO', 3],
    ['STUDIOSO DI GUERRA', 3],
    ['MANOVRE', 3],
    ['CONOSCI IL TUO NEMICO', 7],
    ['SUPERIORITÀ IN COMBATTIMENTO MIGLIORATA', 10],
    ['IMPLACABILE', 15],
  ],
  'phb-guerriero-cavaliere-mistico': [
    ['INCANTESIMI', 3],
    ['ARMA VINCOLATA', 3],
    ['MAGIA DA GUERRA', 7],
    ['COLPO MISTICO', 10],
    ['CARICA ARCANA', 15],
    ['MAGIA DA GUERRA MIGLIORATA', 18],
  ],
  'xge-guerriero-arciere-arcano': [
    ['CONOSCENZE DELL’ARCIERE ARCANO', 3],
    ['TIRO ARCANO', 3],
    ['OPZIONI DI TIRO ARCANO', 3],
    ['FRECCIA MAGICA', 7],
    ['TIRO CURVO', 7],
    ['TIRO SEMPRE PRONTO', 15],
  ],
  'xge-guerriero-cavaliere-errante': [
    ['COMPETENZA BONUS', 3],
    ['NATO IN SELLA', 3],
    ['MARCHIO INCROLLABILE', 3],
    ['MANOVRA PROTETTRICE', 7],
    ['MANTENERE LA POSIZIONE', 10],
    ['CARICA FEROCE', 15],
    ['DIFENSORE VIGILE', 18],
  ],
  'xge-guerriero-samurai': [
    ['COMPETENZA BONUS', 3],
    ['SPIRITO COMBATTIVO', 3],
    ['CORTIGIANO ELEGANTE', 7],
    ['SPIRITO INSTANCABILE', 10],
    ['COLPO RAPIDO', 15],
    ['FORZA DI FRONTE ALLA MORTE', 18],
  ],
  'tce-guerriero-runico': [
    ['COMPETENZE BONUS', 3],
    ['INTAGLIATORE DI RUNE', 3],
    ['POTENZA DEL GIGANTE', 3],
    ['SCUDO RUNICO', 7],
    ['STATURA TORREGGIANTE', 10],
    ['MAESTRO DELLE RUNE', 15],
    ['COLOSSO RUNICO', 18],
  ],
  'tce-guerriero-psionico': [
    ['POTERE PSIONICO', 3],
    ['ADEPTO TELECINETICO', 7],
    ['SCUDO MENTALE', 10],
    ['BALUARDO DELLA FORZA', 15],
    ['MAESTRO DELLA TELECINESI', 18],
  ],
};

export const ARCANE_ARCHER_SKILLS: SkillKey[] = ['arcana', 'nature'];
export const ARCANE_ARCHER_CANTRIPS = ['Prestidigitazione', 'Artificio Druidico'] as const;

export const CAVALIER_SKILLS: SkillKey[] = ['animal_handling', 'performance', 'insight', 'persuasion', 'history'];
export const SAMURAI_SKILLS: SkillKey[] = ['performance', 'insight', 'persuasion', 'history'];

export type FighterChoices = {
  fightingStyle?: PhbFightingStyle;
  secondFightingStyle?: PhbFightingStyle;
  maneuvers?: string[];
  arcaneShots?: string[];
  runes?: string[];
  arcaneArcherSkill?: 'arcana' | 'nature';
  arcaneArcherCantrip?: typeof ARCANE_ARCHER_CANTRIPS[number];
  cavalierSkill?: SkillKey;
  cavalierLanguage?: string;
  samuraiSkill?: SkillKey;
  samuraiLanguage?: string;
  samuraiSave?: 'int' | 'cha';
  battleMasterTool?: string;
};

export const supportedFighterArchetypes = () =>
  supplementSubclassesForClass('Guerriero').filter((a) => FIGHTER_ARCHETYPE_FEATURES[a.slug]);

export function fighterArchetypeFromLabel(label: string | null | undefined): SubclassCatalogEntry | null {
  if (!label) return null;
  const a = matchSupplementSubclass('Guerriero', label);
  return a && FIGHTER_ARCHETYPE_FEATURES[a.slug] ? a : null;
}
