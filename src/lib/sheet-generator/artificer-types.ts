import type { GeneratedCharacterSheet } from './types';
export type ArtificerItemKind='armor'|'shield'|'weapon'|'ammunition'|'thrown'|'focus'|'robe'|'helmet'|'boots'|'ring'|'crystal'|'replica';
export type ArtificerItem={id:string;label:string;kinds:ArtificerItemKind[];armorPart?:boolean;weaponIndex?:number;costNote?:string};
export type ArtificerInfusion={id:string;title:string;level:number;attunement:boolean;targets:ArtificerItemKind[];body:string;source:string;replica?:string;replicaBody?:string};
export type ArtificerAssignment={infusionId:string;itemId:string;state:'self'|'attuned'|'carried'|'carried-attuned'|'other';resistance?:string};
export type ArtificerChoices={known?:string[];assignments?:ArtificerAssignment[];armorModel?:'Guardiano'|'Infiltrato';armor?:'scaglie'|'pelli'|'cuoio'|'cotta'|'nessuna';shield?:boolean};
export type ArtificerEvidence={classFeatures:Array<{title:string;body:string;level:number;source:string}>;specialistFeatures:Array<{title:string;body:string;level:number;source:string}>;infusions:ArtificerInfusion[];knownLimit:number;itemLimit:number;cantrips:number;slots:GeneratedCharacterSheet['spellSlots'];specialistSpells:Array<{name:string;level:number;unlock:number}>};
export type ArtificerState={knownLimit:number;itemLimit:number;armorBonusSlots:number;attunementLimit:number;known:ArtificerInfusion[];assignments:Array<ArtificerAssignment&{title:string;itemLabel:string;requiresAttunement:boolean;source:string}>;armorModel?:'Guardiano'|'Infiltrato';notes:string[];features:ArtificerEvidence['classFeatures']};
