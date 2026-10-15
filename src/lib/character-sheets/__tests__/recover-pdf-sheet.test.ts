import test from "node:test";import assert from "node:assert/strict";
import {recoverCharacterSheetFromPdfFields as recover} from "../recover-pdf-sheet";
const source={sourceFile:"campaign/saved.pdf",sha256:"abc",recoveredAt:"2026-10-15T00:00:00Z"};
test("PDF recovery uses exact checks, preserves partialness and does not infer slot maxima from capped checkboxes",()=>{
 const s=recover({CharacterName:"Existing hero",ClassLevel:"Mago 5",HPMax:"31",STR:"8",STRmod:"-1",ST_INT:"+7",ST_INT_Prof:true,ARC:"+10",ARC_Prof:true,ARC_Exp:true,Slot_L1_1:true,Wpn1_Name:"Staff",Wpn1_Dmg:"1d6+FOR",Wpn1_Atk:"+3",Wpn1_Type:"bludgeoning",Inventory:"• Focus\n• Book",Cantrip_1:"Light",Row_1_Name:"Shield",Row_1_Lvl:"1",Row_1_Desc:"Reaction",Row_1_V:true},source)!;
 assert.equal(s.source,"recovered");assert.equal(s.level,5);assert.deepEqual(s.abilities,{str:8});assert.deepEqual(s.skills?.arcana,{value:10,proficient:true,expertise:true});assert.equal(s.savingThrows?.int?.value,7);assert.equal(s.spellSlots,undefined);assert.equal(s.armorClass,undefined);assert.equal(s.weaponRows?.[0].damage,"1d6+FOR");assert.deepEqual(s.inventory,["Focus","Book"]);assert.equal(s.spells?.[0].level,0);assert.equal(s.spells?.[1].level,1);assert.equal(s.spells?.[1].verbal,true);
});
test("empty template is not a recovered character; ambiguous bare values in modifier fields are not treated as scores",()=>{
 assert.equal(recover({},source),null);
 assert.equal(recover({CharacterName:"Blank"},source)?.characterName,"Blank");
 const s=recover({CharacterName:"Partial",HPMax:"15",STRmod:"10",Wpn1_Name:"Whip"},source)!;assert.equal(s.abilities,undefined);assert.equal(s.abilityMods,undefined);assert.equal(s.hpMax,15);
});
test("partial source PDFs with inventory or spells remain recoverable without fabricated checkbox flags",()=>{
 const inventory=recover({CharacterName:"Partial",Inventory:"Rope"},source)!;
 assert.deepEqual(inventory.inventory,["Rope"]);
 const partial=recover({Row_1_Name:"Shield",Row_1_Lvl:"1",Row_1_Desc:"Reaction",ARC:"+5",STR:"10",STRmod:"0"},source)!;
 assert.deepEqual(partial.spells?.[0],{name:"Shield",level:1,summary:"Reaction"});
 assert.deepEqual(partial.skills?.arcana,{value:5});
 assert.deepEqual(partial.abilities,{str:10});
 assert.deepEqual(partial.abilityMods,{str:0});
});
