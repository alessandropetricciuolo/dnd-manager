import { buildGeneratedCharacterSheet } from '../../../src/lib/sheet-generator/build-engine';
import { mapGeneratedSheetToPdfFields } from '../../../src/lib/sheet-generator/sheet-mapper';
import { artificerInfusionManualSections } from '../../../src/lib/sheet-generator/artificer-print-model';

// Run with the same tsx loader as the generator unit tests; Playwright's own loader cannot follow nested dynamic TS imports.
async function main(){
 const {sheet}=await buildGeneratedCharacterSheet({characterName:'Artefice V1 PDF',raceSlug:'umano',subraceSlug:null,classLabel:'Artefice',classSubclass:null,backgroundSlug:'sapiente',level:2,alignment:null,age:null,height:null,weight:null,sex:null});
 process.stdout.write(JSON.stringify({fields:mapGeneratedSheetToPdfFields(sheet),quickManualSections:artificerInfusionManualSections(sheet)}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
