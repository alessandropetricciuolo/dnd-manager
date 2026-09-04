import test from "node:test";
import assert from "node:assert/strict";
import { resolveCanonicalReferences } from "../canonical-references";

test("creates canonical references only for a retrieved source explicitly named by the GM", () => {
  const references = resolveCanonicalReferences(
    "Crea Dan, figlio di Patrizio della Locanda della Sirena.",
    [
      { evidenceId: "E1", sourceType: "wiki", sourceId: "wiki-inn", title: "Locanda della Sirena", href: "#", similarity: 0.8 },
      { evidenceId: "E2", sourceType: "wiki", sourceId: "wiki-unmentioned", title: "Gilda dei Cartografi", href: "#", similarity: 0.7 },
      { evidenceId: "E3", sourceType: "map_description", sourceId: "map-portico", title: "Portico", href: "#", similarity: 0.7 },
    ],
    [
      { targetType: "wiki", targetId: "wiki-inn", name: "Locanda della Sirena" },
      { targetType: "wiki", targetId: "wiki-unmentioned", name: "Gilda dei Cartografi" },
      { targetType: "map", targetId: "map-portico", name: "Portico" },
    ],
  );
  assert.deepEqual(references, [{ targetType: "wiki", targetId: "wiki-inn", name: "Locanda della Sirena" }]);
});

test("never creates a canonical relation when the retrieved source no longer exists in the campaign catalog", () => {
  const references = resolveCanonicalReferences(
    "Parla della Locanda della Sirena.",
    [{ evidenceId: "E1", sourceType: "wiki", sourceId: "deleted-wiki", title: "Locanda della Sirena", href: "#", similarity: 0.8 }],
    [],
  );
  assert.deepEqual(references, []);
});
