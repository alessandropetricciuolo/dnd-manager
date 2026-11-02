import { loadClericEvidence, addClericGrantedSpells } from '@/lib/server/cleric-source';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { getRequestAuthContext } from '@/utils/supabase/request-auth-context';
import { generateSheetAction } from '@/lib/actions/generator-actions';
import {
  reconcileV2ExportPayload,
  ReconcileChoicesError,
} from '@/lib/sheet-generator/reconcile-v2-choices';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';
import { loadBarbarianEvidence, addBarbarianGrantedSpells } from '@/lib/server/barbarian-source';
import { TOTEM_ANIMALS, STORM_ENVIRONMENTS } from '@/lib/sheet-generator/barbarian-paths';
import { ALL_SKILL_KEYS } from '@/lib/sheet-generator/skill-rules';
import { BARD_FIGHTING_STYLES } from '@/lib/sheet-generator/bard-colleges';
import { loadBardCollegeFeatures, addBardCollegeGrantedSpells } from '@/lib/server/bard-college-source';
import { addDruidGrantedSpells, loadDruidEvidence } from '@/lib/server/druid-source';
import { DRUID_LAND_TERRAINS } from '@/lib/sheet-generator/druid-circles';
import { DRUID_CANTRIPS } from '@/lib/sheet-generator/cleric-domains';
import { loadFighterEvidence, addFighterGrantedSpells } from '@/lib/server/fighter-source';
import { FIGHTER_FIGHTING_STYLES, ARCANE_ARCHER_CANTRIPS } from '@/lib/sheet-generator/fighter-archetypes';
import { loadRogueEvidence, addRogueGrantedSpells } from '@/lib/server/rogue-source';
import { MASTERMIND_GAMING_SETS } from '@/lib/sheet-generator/rogue-archetypes';
import { loadWizardEvidence, addWizardGrantedSpells } from '@/lib/server/wizard-source';
import { BLADESINGER_WEAPONS } from '@/lib/sheet-generator/wizard-traditions';
import { loadMonkEvidence, addMonkGrantedSpells } from '@/lib/server/monk-source';
import { KENSEI_MELEE_WEAPONS, KENSEI_RANGED_WEAPONS } from '@/lib/sheet-generator/monk-traditions';
import { loadPaladinEvidence, addPaladinGrantedSpells } from '@/lib/server/paladin-source';
import { PALADIN_FIGHTING_STYLES } from '@/lib/sheet-generator/paladin-oaths';
import { loadRangerEvidence, addRangerGrantedSpells } from '@/lib/server/ranger-source';
import { RANGER_FIGHTING_STYLES, RANGER_BEAST_COMPANIONS } from '@/lib/sheet-generator/ranger-archetypes';
import { loadSorcererEvidence, addSorcererGrantedSpells } from '@/lib/server/sorcerer-source';
import { loadWarlockEvidence, addWarlockGrantedSpells } from '@/lib/server/warlock-source';
import { WARLOCK_PACT_BOONS, GENIE_KINDS } from '@/lib/sheet-generator/warlock-patrons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({
  input: z.record(z.string().max(48_000)).refine((v) => Object.keys(v).length <= 30),
  bonusSkills: z.array(z.enum(ALL_SKILL_KEYS)).max(3).default([]),
  fightingStyle: z.enum(BARD_FIGHTING_STYLES).optional(),
  clericChoices:z.object({skills:z.array(z.enum(ALL_SKILL_KEYS)).max(2).optional(),languages:z.array(z.string().min(1).max(64)).max(2).optional(),druidCantrip:z.string().min(1).max(64).optional()}).strict().optional(),
  barbarianChoices:z.object({totemSpirit:z.enum(TOTEM_ANIMALS).optional(),totemAspect:z.enum(TOTEM_ANIMALS).optional(),totemAttunement:z.enum(TOTEM_ANIMALS).optional(),storm:z.enum(STORM_ENVIRONMENTS).optional(),zealotDamage:z.enum(['Radiosi','Necrotici']).optional()}).strict().optional(),
  druidChoices:z.object({landTerrain:z.enum(DRUID_LAND_TERRAINS).optional(),landCantrip:z.enum(DRUID_CANTRIPS).optional()}).strict().optional(),
  fighterChoices:z.object({
    fightingStyle:z.enum(FIGHTER_FIGHTING_STYLES).optional(),
    secondFightingStyle:z.enum(FIGHTER_FIGHTING_STYLES).optional(),
    maneuvers:z.array(z.string().min(1).max(64)).max(9).optional(),
    arcaneShots:z.array(z.string().min(1).max(64)).max(6).optional(),
    runes:z.array(z.string().min(1).max(64)).max(5).optional(),
    arcaneArcherSkill:z.enum(['arcana','nature']).optional(),
    arcaneArcherCantrip:z.enum(ARCANE_ARCHER_CANTRIPS).optional(),
    cavalierSkill:z.enum(ALL_SKILL_KEYS).optional(),
    cavalierLanguage:z.string().min(1).max(64).optional(),
    samuraiSkill:z.enum(ALL_SKILL_KEYS).optional(),
    samuraiLanguage:z.string().min(1).max(64).optional(),
    samuraiSave:z.enum(['int','cha']).optional(),
    battleMasterTool:z.string().min(1).max(64).optional(),
  }).strict().optional(),
  rogueChoices:z.object({
    mastermindGamingSet:z.enum(MASTERMIND_GAMING_SETS).optional(),
    mastermindLanguages:z.tuple([z.string().min(1).max(64),z.string().min(1).max(64)]).optional(),
    phantomWhispersSkill:z.enum(ALL_SKILL_KEYS).optional(),
    arcaneTricksterCantrip:z.string().min(1).max(64).optional(),
  }).strict().optional(),
  wizardChoices:z.object({
    bladesingerWeapon:z.enum(BLADESINGER_WEAPONS).optional(),
  }).strict().optional(),
  monkChoices:z.object({
    kenseiMeleeWeapon:z.enum(KENSEI_MELEE_WEAPONS).optional(),
    kenseiRangedWeapon:z.enum(KENSEI_RANGED_WEAPONS).optional(),
    mercyMask:z.string().min(1).max(64).optional(),
  }).strict().optional(),
  paladinChoices:z.object({
    fightingStyle:z.enum(PALADIN_FIGHTING_STYLES).optional(),
  }).strict().optional(),
  rangerChoices:z.object({
    fightingStyle:z.enum(RANGER_FIGHTING_STYLES).optional(),
    favoredEnemies:z.array(z.string().min(1).max(64)).max(3).optional(),
    favoredTerrains:z.array(z.string().min(1).max(64)).max(3).optional(),
    beastCompanion:z.enum(RANGER_BEAST_COMPANIONS).optional(),
    feyWandererSkill:z.enum(['Inganno','Intrattenere','Persuasione']).optional(),
    hunterPrey:z.enum(["Devastatore dell'Orda",'Sterminatore di Colossi','Uccisore di Giganti']).optional(),
    defensiveTactics:z.enum(['Difesa dal Multiattacco',"Sfuggire all'Orda","Volontà d'Acciaio"]).optional(),
    multiattack:z.enum(['Attacco Turbinante','Raffica']).optional(),
    superiorHunterDefense:z.enum(['Elusione','Opporsi alla Marea','Schivata Prodigiosa']).optional(),
  }).strict().optional(),
  sorcererChoices:z.object({
    metamagic:z.array(z.string().min(1).max(64)).max(4).optional(),
    draconicAncestry:z.string().min(1).max(64).optional(),
    divineAffinity:z.enum(['Bene','Male','Legge','Caos','Neutralità']).optional(),
  }).strict().optional(),
  warlockChoices:z.object({
    pactBoon:z.enum(WARLOCK_PACT_BOONS).optional(),
    invocations:z.array(z.string().min(1).max(64)).max(8).optional(),
    mysticArcanum:z.record(z.string(),z.string().min(1).max(64)).optional(),
    hexbladeWeapon:z.string().min(1).max(64).optional(),
    genieKind:z.enum(GENIE_KINDS).optional(),
  }).strict().optional(),
});
export async function POST(req: Request) {
  const { user, profile } = await getRequestAuthContext();
  if (!user) return Response.json({ error: 'Accesso richiesto.' }, { status: 401 });
  if (!['gm', 'admin'].includes(profile?.role ?? '')) return Response.json({ error: 'Riservato a Master e Admin.' }, { status: 403 });
  const raw = await req.text();
  if (Buffer.byteLength(raw) > 120_000) return Response.json({ error: 'Richiesta troppo grande.' }, { status: 413 });
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return Response.json({ error: 'Richiesta non valida.' }, { status: 400 }); }
  const parsed = schema.safeParse(json);
  if (!parsed.success || !['Bardo','Barbaro','Chierico','Artefice','Druido','Guerriero','Ladro','Mago','Monaco','Paladino','Ranger','Stregone','Warlock'].includes(parsed.data.input.classLabel)) return Response.json({ error: 'La V2 richiede i dati di una classe supportata.' }, { status: 400 });
  const form = new FormData();
  for (const [key, value] of Object.entries(parsed.data.input)) form.set(key, value);

  // Unify and reconcile confirmed choices with build overrides via shared production function
  let reconciled;
  try {
    reconciled = reconcileV2ExportPayload(parsed.data);
  } catch (err) {
    if (err instanceof ReconcileChoicesError) {
      return Response.json({ error: err.message }, { status: err.statusCode });
    }
    return Response.json({ error: err instanceof Error ? err.message : 'Errore validazione scelte.' }, { status: 400 });
  }

  const { effectiveOverrides } = reconciled;
  form.set('buildOverridesJson', JSON.stringify(effectiveOverrides));

  // Rebuild from manuals: client-supplied rule text or sheet values are never accepted.
  const result = await generateSheetAction(form);
  if (!result.success || !result.sheet) return Response.json({ error: result.message }, { status: 400 });
  try {
    const logo = await fs.readFile(path.join(process.cwd(), 'public/logo.png'));
    const origin=new URL(req.url).origin;
    const bard=result.sheet.classLabel==='Bardo',barbarian=result.sheet.classLabel==='Barbaro',cleric=result.sheet.classLabel==='Chierico',druid=result.sheet.classLabel==='Druido',fighter=result.sheet.classLabel==='Guerriero',rogue=result.sheet.classLabel==='Ladro',wizard=result.sheet.classLabel==='Mago',monk=result.sheet.classLabel==='Monaco',paladin=result.sheet.classLabel==='Paladino',ranger=result.sheet.classLabel==='Ranger',sorcerer=result.sheet.classLabel==='Stregone',warlock=result.sheet.classLabel==='Warlock';
    if((!barbarian&&Object.keys(parsed.data.barbarianChoices??{}).length)||(!cleric&&Object.keys(parsed.data.clericChoices??{}).length)||(!fighter&&Object.keys(parsed.data.fighterChoices??{}).length)||(!rogue&&Object.keys(parsed.data.rogueChoices??{}).length)||(!wizard&&Object.keys(parsed.data.wizardChoices??{}).length)||(!monk&&Object.keys(parsed.data.monkChoices??{}).length)||(!paladin&&Object.keys(parsed.data.paladinChoices??{}).length)||(!ranger&&Object.keys(parsed.data.rangerChoices??{}).length)||(!sorcerer&&Object.keys(parsed.data.sorcererChoices??{}).length)||(!warlock&&Object.keys(parsed.data.warlockChoices??{}).length)||(!bard&&(parsed.data.bonusSkills.length||parsed.data.fightingStyle)))throw new Error('Scelte non compatibili con la classe.');
    const clericEvidence=cleric?await loadClericEvidence(result.sheet,origin):undefined;
    const druidEvidence=druid?await loadDruidEvidence(result.sheet,origin,parsed.data.druidChoices):undefined;
    const fighterEvidence=fighter?await loadFighterEvidence(result.sheet,origin,parsed.data.fighterChoices):undefined;
    const rogueEvidence=rogue?await loadRogueEvidence(result.sheet,origin,parsed.data.rogueChoices):undefined;
    const wizardEvidence=wizard?await loadWizardEvidence(result.sheet,origin,parsed.data.wizardChoices):undefined;
    const monkEvidence=monk?await loadMonkEvidence(result.sheet,origin,parsed.data.monkChoices):undefined;
    const paladinEvidence=paladin?await loadPaladinEvidence(result.sheet,origin,parsed.data.paladinChoices):undefined;
    const rangerEvidence=ranger?await loadRangerEvidence(result.sheet,origin,parsed.data.rangerChoices):undefined;
    const sorcererEvidence=sorcerer?await loadSorcererEvidence(result.sheet,origin,parsed.data.sorcererChoices):undefined;
    const warlockEvidence=warlock?await loadWarlockEvidence(result.sheet,origin,parsed.data.warlockChoices):undefined;
    if(!druid&&Object.keys(parsed.data.druidChoices??{}).length)throw new Error('Le scelte del Circolo Druidico non sono compatibili con questa classe.');
    if(!fighter&&Object.keys(parsed.data.fighterChoices??{}).length)throw new Error('Le scelte del Guerriero non sono compatibili con questa classe.');
    if(!rogue&&Object.keys(parsed.data.rogueChoices??{}).length)throw new Error('Le scelte del Ladro non sono compatibili con questa classe.');
    if(!wizard&&Object.keys(parsed.data.wizardChoices??{}).length)throw new Error('Le scelte del Mago non sono compatibili con questa classe.');
    if(!monk&&Object.keys(parsed.data.monkChoices??{}).length)throw new Error('Le scelte del Monaco non sono compatibili con questa classe.');
    if(!paladin&&Object.keys(parsed.data.paladinChoices??{}).length)throw new Error('Le scelte del Paladino non sono compatibili con questa classe.');
    if(!ranger&&Object.keys(parsed.data.rangerChoices??{}).length)throw new Error('Le scelte del Ranger non sono compatibili con questa classe.');
    if(!sorcerer&&Object.keys(parsed.data.sorcererChoices??{}).length)throw new Error('Le scelte dello Stregone non sono compatibili con questa classe.');
    if(!warlock&&Object.keys(parsed.data.warlockChoices??{}).length)throw new Error('Le scelte del Warlock non sono compatibili con questa classe.');
    const sheet=result.sheet.classLabel==='Artefice'?result.sheet:warlock?addWarlockGrantedSpells(result.sheet,warlockEvidence!):sorcerer?addSorcererGrantedSpells(result.sheet,sorcererEvidence!):ranger?addRangerGrantedSpells(result.sheet,rangerEvidence!):paladin?addPaladinGrantedSpells(result.sheet,paladinEvidence!):monk?addMonkGrantedSpells(result.sheet,monkEvidence!):wizard?addWizardGrantedSpells(result.sheet,wizardEvidence!):fighter?await addFighterGrantedSpells(result.sheet,fighterEvidence!,parsed.data.fighterChoices,parsed.data.input.torneoMode==='on'||parsed.data.input.torneoMode==='true'):rogue?await addRogueGrantedSpells(result.sheet,rogueEvidence!,parsed.data.rogueChoices,parsed.data.input.torneoMode==='on'||parsed.data.input.torneoMode==='true'):druid?await addDruidGrantedSpells(result.sheet,druidEvidence!,parsed.data.input.torneoMode==='on'||parsed.data.input.torneoMode==='true'):bard?await addBardCollegeGrantedSpells(result.sheet,origin):barbarian?await addBarbarianGrantedSpells(result.sheet,origin):cleric?addClericGrantedSpells(result.sheet,clericEvidence!,parsed.data.clericChoices,parsed.data.input.torneoMode==='on'||parsed.data.input.torneoMode==='true'):result.sheet;
    const collegeFeatures=bard?await loadBardCollegeFeatures(sheet,origin):undefined;
    const barbarianEvidence=barbarian?await loadBarbarianEvidence(sheet,origin):undefined;
    const bytes = await renderCharacterSheetV2(sheet, logo, {
      warlockEvidence,warlockChoices:reconciled.warlockChoices ?? parsed.data.warlockChoices,
      sorcererEvidence,sorcererChoices:reconciled.sorcererChoices ?? parsed.data.sorcererChoices,
      rangerEvidence,rangerChoices:reconciled.rangerChoices ?? parsed.data.rangerChoices,
      clericEvidence,clericChoices:reconciled.clericChoices ?? parsed.data.clericChoices,
      druidEvidence,
      fighterEvidence,fighterChoices:reconciled.fighterChoices ?? parsed.data.fighterChoices,
      rogueEvidence,rogueChoices:reconciled.rogueChoices ?? parsed.data.rogueChoices,
      wizardEvidence,wizardChoices:reconciled.wizardChoices ?? parsed.data.wizardChoices,
      monkEvidence,monkChoices:reconciled.monkChoices ?? parsed.data.monkChoices,
      paladinEvidence,paladinChoices:reconciled.paladinChoices ?? parsed.data.paladinChoices,
      barbarianEvidence,barbarianChoices:reconciled.barbarianChoices ?? parsed.data.barbarianChoices,
      bonusSkills: reconciled.bonusSkills,
      collegeFeatures,
      fightingStyle: reconciled.fightingStyle as any,
      story: result.includeBackgroundStoryInPdf ? result.characterStory ?? '' : '',
      quickManualSections: result.quickManualSections ?? [],
    });
    return new Response(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="scheda-${sheet.classLabel.toLocaleLowerCase('it')}-v2.pdf"`, 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[sheet-pdf-v2]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Generazione PDF V2 non riuscita.' }, { status: 422 });
  }
}
