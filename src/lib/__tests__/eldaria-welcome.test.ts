import assert from "node:assert/strict";
import { test } from "node:test";
import { getEldariaGuideSections } from "../eldaria-welcome";
import { getHeadingsFromMarkdown } from "../primer-toc";

test("legacy Eldaria guide keeps the rules, adds an index and omits the inauguration", () => {
  const source = [
    "**[Progressione] Meccanica Punti Esperienza (PE)**",
    "",
    "La progressione avviene tramite PE.",
    "",
    "[Combattimento] Critici e Consumabili",
    "",
    "Regola originale sulle pozioni.",
    "",
    "Compendio di Eldaria: ",
    "La gilda ha appena aperto i battenti.",
  ].join("\r\n");

  const { rules, welcome } = getEldariaGuideSections(source);
  assert.equal(welcome, null);
  assert.deepEqual(getHeadingsFromMarkdown(rules).map(({ text }) => text), [
    "[Progressione] Meccanica Punti Esperienza (PE)",
    "[Combattimento] Critici e Consumabili",
  ]);
  assert.match(rules, /La progressione avviene tramite PE\./);
  assert.match(rules, /Regola originale sulle pozioni\./);
  assert.doesNotMatch(rules, /appena aperto/);
});

test("the GM can add an introduction after the saved legacy primer", () => {
  const source = "## Regole\nTesto delle regole.\n\nCompendio di Eldaria:\nVecchio testo.\n\n## Benvenuto in Eldaria\n\nIntroduzione aggiornata.";
  assert.deepEqual(getEldariaGuideSections(source), {
    rules: "## Regole\nTesto delle regole.",
    welcome: "Introduzione aggiornata.",
  });
});
