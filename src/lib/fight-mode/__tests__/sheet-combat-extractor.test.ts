import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractStructuredPcCombatData,
  parseMonsterActionSuggestions,
} from "../sheet-combat-extractor";

test("extractStructuredPcCombatData estrae armi e incantesimi strutturati ignorando spellsListMd", () => {
  const rawPcSnapshot = {
    character_sheet: {
      weaponRows: [
        { weapon: "Spada Lunga", toHit: "+5", damage: "1d8+3", damageType: "tagliente" },
        { weapon: "Arco Corto", toHit: "+4", damage: "1d6+2", damageType: "perforante" },
      ],
      spellSaveDc: 14,
      spellAttackBonus: 6,
      spells: [
        { name: "Benedizione", level: 1, concentration: true, ritual: false },
        { name: "Cura Ferite", level: 1, concentration: false, ritual: false },
        { name: "Individuazione del Magico", level: 1, concentration: true, ritual: true },
      ],
    },
    // spellsListMd contiene il compendio intero della classe che deve essere categoricamente ignorato
    spellsListMd: `
# Compendio Chierico (50 incantesimi)
- Guida (Trucchetto)
- Fiamma Sacra (Trucchetto)
- Infliggi Ferite (Liv. 1)
- Scudo della Fede (Liv. 1)
- Santuario (Liv. 1)
- Rianimare Morti (Liv. 5)
`,
  };

  const result = extractStructuredPcCombatData(rawPcSnapshot, "Chierico");

  assert.equal(result.source, "sheet");
  assert.equal(result.spellSaveDc, 14);
  assert.equal(result.spellAttackBonus, 6);
  assert.equal(result.weapons.length, 2);
  assert.equal(result.weapons[0].name, "Spada Lunga");
  assert.equal(result.weapons[0].toHit, "+5");
  assert.equal(result.weapons[1].name, "Arco Corto");

  // Verifica che siano stati estratti SOLO i 3 incantesimi da character_sheet.spells e ZERO da spellsListMd
  assert.equal(result.spells.length, 3);
  assert.deepEqual(
    result.spells.map((s) => s.name),
    ["Benedizione", "Cura Ferite", "Individuazione del Magico"]
  );
  assert.equal(result.spells[0].concentration, true);
  assert.equal(result.spells[2].ritual, true);

  // Verifica disclaimer richiesto (Consegna 2 - Vincolo 6)
  assert.match(result.disclaimer, /non necessariamente preparat/i);
});

test("extractStructuredPcCombatData gestisce fallback pulito se character_sheet è assente", () => {
  const emptySnapshot = { spellsListMd: "# Qualcosa" };
  const result = extractStructuredPcCombatData(emptySnapshot, "Guerriero");

  assert.equal(result.source, "fallback");
  assert.equal(result.spellSaveDc, null);
  assert.equal(result.spellAttackBonus, null);
  assert.equal(result.spells.length, 0);
  assert.ok(result.weapons.length > 0, "Dovrebbe generare armi fallback per Guerriero");
});

test("parseMonsterActionSuggestions deduce suggerimenti con CD, caratteristica e timing fine/inizio turno", () => {
  const statblock = `
# Serpente Velenoso Gigante
CA 14, PF 32

### Azioni
**Morso**. Attacco con arma da mischia: +6 a colpire, portata 1,5 m, un bersaglio. Colpito: 6 (1d4 + 4) danni perforanti e il bersaglio deve effettuare un tiro salvezza su Costituzione con CD 11. Se fallisce, il bersaglio è avvelenato per 1 minuto. Il bersaglio può ripetere il tiro salvezza alla fine di ciascuno dei suoi turni, terminando l'effetto su di sé con un successo.

**Costrizione**. Attacco con arma: +4 a colpire. Colpito: 5 danni contundenti e il bersaglio è afferrato e trattenuto (CD 12 per fuggire all'inizio del suo turno).
`;

  const suggestions = parseMonsterActionSuggestions(statblock);

  assert.ok(suggestions.length >= 2, `Attesi almeno 2 suggerimenti, ottenuti: ${suggestions.length}`);

  const bite = suggestions.find((s) => s.actionName.toLowerCase().includes("morso"));
  assert.ok(bite, "Suggerimento per Morso presente");
  assert.equal(bite.statusId, "avvelenato");
  assert.equal(bite.dc, 11);
  assert.equal(bite.ability, "cos");
  assert.equal(bite.timing, "turn_end");
  assert.ok(bite.originalSentence.includes("CD 11"));

  const constrict = suggestions.find((s) => s.actionName.toLowerCase().includes("costrizione"));
  assert.ok(constrict, "Suggerimento per Costrizione presente");
  assert.ok(constrict.statusId === "afferrato" || constrict.statusId === "trattenuto");
  assert.equal(constrict.timing, undefined, "Un TS per fuggire non è un TS ripetuto dell'effetto");
});

test("un TS iniziale e danni a inizio turno non inventano un TS ripetuto", () => {
  const [suggestion] = parseMonsterActionSuggestions(`**Morso**. Il bersaglio deve superare un TS su Costituzione CD 13 o è avvelenato. All'inizio di ogni turno subisce 1d6 danni da veleno.`);
  assert.equal(suggestion.initialSaveDc, 13);
  assert.equal(suggestion.initialSaveAbility, "cos");
  assert.equal(suggestion.timing, undefined);
  assert.equal(suggestion.durationTurns, undefined, "Durata assente nel testo resta sconosciuta");
});

test("scheda presente senza armi non inventa statistiche di classe", () => {
  const result = extractStructuredPcCombatData({ character_sheet: {} }, "Guerriero");
  assert.equal(result.source, "sheet");
  assert.deepEqual(result.weapons, []);
});

test("armi strutturate incomplete mantengono i valori sconosciuti", () => {
  const result = extractStructuredPcCombatData({ character_sheet: { weaponRows: [{ name: "Arma misteriosa" }] } });
  assert.deepEqual(result.weapons, [{ name: "Arma misteriosa", toHit: null, damage: null, type: null }]);
});

test("parseMonsterActionSuggestions filtra rigorosamente immunità e negazioni (zero falsi positivi)", () => {
  const statblockImmune = `
# Golem di Ferro
CA 20, PF 210

**Immunità alle Condizioni**: accecato, affascinato, assordato, indebolimento, spaventato, paralizzato, pietrificato, avvelenato.

### Tratti
**Forma Immutabile**. Il golem è immune a qualsiasi incantesimo o effetto che alteri la sua forma.
**Resistenza alla Magia**. Il golem ha vantaggio ai tiri salvezza contro incantesimi e altri effetti magici.
Non può essere affascinato o spaventato in alcun modo.

### Azioni
**Maglio**. Attacco con arma da mischia: +13 a colpire, portata 3 m, un bersaglio. Colpito: 20 (3d8 + 7) danni contundenti.
**Soffio Velenoso (Ricarica 5-6)**. Il golem esala gas velenoso in un cono di 4,5 metri. Ogni creatura in quell'area deve superare un TS su Costituzione con CD 19 o subire 45 danni da veleno ed essere avvelenata.
`;

  const suggestions = parseMonsterActionSuggestions(statblockImmune);

  // Le immunità alle condizioni NON devono essere interpretate come capacità del golem di accecare, affascinare, ecc.
  const falsePositives = suggestions.filter((s) =>
    ["accecato", "affascinato", "assordato", "indebolimento", "spaventato", "paralizzato", "pietrificato"].includes(
      s.statusId
    )
  );
  assert.equal(
    falsePositives.length,
    0,
    `Trovati falsi positivi da immunità: ${JSON.stringify(falsePositives)}`
  );

  // Invece l'azione reale "Soffio Velenoso" deve essere suggerita regolarmente
  const poisonBreath = suggestions.find((s) => s.actionName.toLowerCase().includes("soffio"));
  assert.ok(poisonBreath, "Soffio Velenoso deve essere suggerito come azione legittima");
  assert.equal(poisonBreath.statusId, "avvelenato");
  assert.equal(poisonBreath.dc, 19);
  assert.equal(poisonBreath.ability, "cos");
});
