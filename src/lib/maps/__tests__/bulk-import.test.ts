import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMapImport, validateMapImportHierarchy } from "../bulk-import";
const world = { key: "w", name: "World", map_type: "world", image_url: "https://example.com/w.png" };
const continent = { ...world, key: "c", map_type: "continent", parent_key: "w" };
test("ordina genitori prima dei figli e imposta segreto", () => {
  const rows = parseMapImport([continent, world]);
  assert.deepEqual(rows.map(r => r.key), ["w", "c"]);
  assert.equal(rows[0].visibility, "secret");
  validateMapImportHierarchy(rows, [], true);
});
test("rifiuta duplicati, cicli e riferimenti mancanti", () => {
  assert.throws(() => parseMapImport([world, world]), /duplicata/);
  assert.throws(() => parseMapImport([{ ...world, parent_key: "w" }]), /circolare/);
  assert.throws(() => parseMapImport([continent]), /non trovata/);
});
test("rifiuta input errati e URL non sicuri", () => {
  for (const input of [null, [], Array(101).fill(world), [{ ...world, name: 1 }], [{ ...world, map_type: "toString" }], [{ ...world, image_url: "javascript:alert(1)" }], [{ ...world, visibility: "selective" }]]) assert.throws(() => parseMapImport(input));
});
test("verifica gerarchia lunga e mondo unico", () => {
  assert.throws(() => validateMapImportHierarchy(parseMapImport([world]), [{ id: "old", map_type: "world" }], true), /sola/);
  assert.throws(() => validateMapImportHierarchy(parseMapImport([{ ...world, map_type: "city" }]), [], true), /genitore/);
  assert.throws(() => validateMapImportHierarchy(parseMapImport([world, continent]), [], false), /lunga/);
});
test("accetta genitore esistente solo nella campagna corrente", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const rows = parseMapImport([{ ...world, map_type: "continent", parent_map_id: id }]);
  validateMapImportHierarchy(rows, [{ id, map_type: "world" }], true);
  assert.throws(() => validateMapImportHierarchy(rows, [], true), /non presente/);
});
