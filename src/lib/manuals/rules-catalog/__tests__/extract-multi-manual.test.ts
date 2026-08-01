import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractSpellsFromMarkdown } from "@/lib/manuals/rules-catalog/extract-spells-from-markdown";
import {
  extractDmgCuratedRulesFromMarkdown,
  extractPhbCuratedRulesFromMarkdown,
} from "@/lib/manuals/rules-catalog/extract-curated-rules";
import { getSourceById } from "@/lib/manuals/rules-catalog/sources";
import { hasMarkdownSpellStatBlock } from "@/lib/manual-search-spell-helpers";
import { RULES_CATALOG_EXTRACTION_VERSION } from "@/lib/manuals/rules-catalog/types";

const manualsDir = join(process.cwd(), "public/manuals");

test("extract spells: PHB ~358, XGtE >40, Tasha ≥5", () => {
  assert.equal(RULES_CATALOG_EXTRACTION_VERSION, "rules-catalog-v2");

  const phb = extractSpellsFromMarkdown(
    readFileSync(join(manualsDir, "manuale_giocatore.md"), "utf8"),
    getSourceById("player_handbook")
  );
  assert.ok(phb.length >= 350 && phb.length <= 380, `PHB spells=${phb.length}`);
  const fireball = phb.find((s) => /palla di fuoco$/i.test(s.name));
  assert.ok(fireball);
  assert.ok(hasMarkdownSpellStatBlock(fireball!.bodyMd));
  assert.equal(fireball!.sourceBook, "player_handbook");

  const xge = extractSpellsFromMarkdown(
    readFileSync(join(manualsDir, "xanathar.md"), "utf8"),
    getSourceById("xanathars_guide")
  );
  assert.ok(xge.length > 40, `XGtE spells=${xge.length}`);
  const absorb = xge.find((s) => /assorbire elementi/i.test(s.name));
  assert.ok(absorb);
  assert.ok(hasMarkdownSpellStatBlock(absorb!.bodyMd));

  const tasha = extractSpellsFromMarkdown(
    readFileSync(join(manualsDir, "Tasha.md"), "utf8"),
    getSourceById("tashas_cauldron")
  );
  assert.ok(tasha.length >= 5, `Tasha spells=${tasha.length}`);
  assert.ok(!tasha.some((s) => /descrizioni degli incantesimi/i.test(s.name)));
});

test("extract curated PHB rules: copertura, riposo, azioni", () => {
  const rules = extractPhbCuratedRulesFromMarkdown(
    readFileSync(join(manualsDir, "manuale_giocatore.md"), "utf8")
  );
  const bySlug = new Map(rules.map((r) => [r.slug, r]));
  assert.ok(bySlug.has("copertura"));
  assert.ok(bySlug.has("riposo-breve"));
  assert.ok(bySlug.has("riposo-lungo"));
  assert.ok(bySlug.has("azioni-in-combattimento"));
  assert.ok(bySlug.has("scatto"));
  assert.ok(bySlug.get("copertura")!.bodyMd.length > 40);
  assert.equal(bySlug.get("copertura")!.sourceBook, "player_handbook");
});

test("extract curated DMG rules: copertura, follia, inseguimenti, trappole", () => {
  const rules = extractDmgCuratedRulesFromMarkdown(
    readFileSync(join(manualsDir, "DM_5th_master.md"), "utf8")
  );
  const bySlug = new Map(rules.map((r) => [r.slug, r]));
  assert.ok(bySlug.has("copertura"), `slugs=${[...bySlug.keys()].join(",")}`);
  assert.ok(bySlug.has("follia"));
  assert.ok(bySlug.has("inseguimenti"));
  assert.ok(bySlug.has("trappole"));
  assert.ok(bySlug.has("malattie"));
  assert.ok(!/CAPITOLO\s+\d+\s*\|/i.test(bySlug.get("copertura")!.bodyMd));
  assert.equal(bySlug.get("follia")!.sourceBook, "dungeon_masters_guide");
});
