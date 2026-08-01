import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PHB_CONDITIONS } from "@/lib/manuals/phb-conditions";
import {
  expectedPhbConditionSlugs,
  extractPhbConditionsFromMarkdown,
} from "@/lib/manuals/rules-catalog/extract-phb-conditions";

test("extractPhbConditionsFromMarkdown: 15 condizioni + overview da PHB MD", () => {
  const phb = readFileSync(join(process.cwd(), "public/manuals/manuale_giocatore.md"), "utf8");
  const records = extractPhbConditionsFromMarkdown(phb);

  const overview = records.find((r) => r.kind === "rule" && r.slug === "condizioni-overview");
  assert.ok(overview, "overview condizioni");
  assert.match(overview!.bodyMd, /condizioni alterano/i);
  assert.doesNotMatch(overview!.bodyMd, /Cammino del Berserker/i);

  const conditions = records.filter((r) => r.kind === "condition");
  assert.equal(conditions.length, 15);
  assert.deepEqual(
    conditions.map((c) => c.slug).sort(),
    expectedPhbConditionSlugs().sort()
  );
  assert.deepEqual(
    conditions.map((c) => c.name).sort(),
    [...PHB_CONDITIONS].sort()
  );

  for (const c of conditions) {
    assert.ok(c.bodyMd.trim().length > 0, `${c.name} body vuoto`);
    assert.doesNotMatch(c.bodyMd, /Cammino del Berserker/i);
    assert.doesNotMatch(c.bodyMd, /Tratti degli Elfi/i);
    assert.doesNotMatch(c.bodyMd, /APPENDICE A\s*\|\s*CONDIZIONI/i);
    assert.doesNotMatch(c.bodyMd, /!\[/);
  }

  const affascinato = conditions.find((c) => c.slug === "affascinato");
  assert.ok(affascinato);
  assert.equal(affascinato!.facets.effects?.length, 2);
  assert.match(affascinato!.facets.effects![0]!, /non può attaccare/i);
  assert.match(affascinato!.facets.effects![1]!, /vantaggio/i);
  assert.doesNotMatch(affascinato!.bodyMd, /Berserker/i);

  const indebolimento = conditions.find((c) => c.slug === "indebolimento");
  assert.ok(indebolimento);
  assert.match(indebolimento!.bodyMd, /sei livelli/i);
  assert.doesNotMatch(indebolimento!.bodyMd, /immune ai veleni/i);

  const pietrificato = conditions.find((c) => c.slug === "pietrificato");
  assert.ok(pietrificato);
  assert.match(pietrificato!.bodyMd, /immune ai veleni/i);
});
