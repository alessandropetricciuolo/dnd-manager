import fs from 'node:fs';
import { buildGeneratedCharacterSheet } from '../../src/lib/sheet-generator/build-engine';

async function main() {
  const result = await buildGeneratedCharacterSheet({
    characterName: 'Liro - Bardo di esempio', raceSlug: 'halfling', subraceSlug: null,
    classLabel: 'Bardo', classSubclass: 'Collegio della Sapienza', backgroundSlug: 'artista',
    level: 5, alignment: null, age: null, height: null, weight: null, sex: null,
  });
  fs.writeFileSync('output/pdf/bardo-prototipo/dati-generatore.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ warnings: result.warnings, skills: result.sheet.skills, subclass: result.sheet.subclassFeaturesMd?.slice(0,200) }));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
