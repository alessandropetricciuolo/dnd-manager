import test from "node:test";
import assert from "node:assert/strict";

import {
  detectRelationshipCreateRequest,
  refineRelationshipRequest,
} from "../relationship-request-detector";
import { findCatalogEntryByName } from "@/lib/wiki/entity-reference-parser";

test("detectRelationshipCreateRequest from collega X a Y", () => {
  const detected = detectRelationshipCreateRequest(
    "collega Gambly alla Torre Nera come custode"
  );
  assert.ok(detected);
  assert.match(detected!.sourceName, /Gambly/i);
  assert.match(detected!.targetName, /Torre Nera/i);
  assert.equal(detected!.label, "custode");
});

test("detectRelationshipCreateRequest from relazione tra", () => {
  const detected = detectRelationshipCreateRequest(
    "relazione tra Locanda del Drago Rosso e Millbrook: si trova a"
  );
  assert.ok(detected);
  assert.match(detected!.sourceName, /Locanda/i);
  assert.match(detected!.targetName, /Millbrook/i);
});

test("detectRelationshipCreateRequest from è LABEL di", () => {
  const detected = detectRelationshipCreateRequest("Gambly è alleato di Marcus");
  assert.ok(detected);
  assert.equal(detected!.label, "alleato");
});

test("detectRelationshipCreateRequest returns null for unrelated text", () => {
  assert.equal(detectRelationshipCreateRequest("ciao mondo"), null);
});

test("refineRelationshipRequest updates label only", () => {
  const base = detectRelationshipCreateRequest("collega Gambly a Marcus come amico")!;
  const refined = refineRelationshipRequest("etichetta: rivale", base);
  assert.equal(refined.label, "rivale");
  assert.equal(refined.sourceName, base.sourceName);
});

test("findCatalogEntryByName resolves exact and partial unique match", () => {
  const catalog = [
    { id: "1", name: "Torre Nera", kind: "wiki" as const },
    { id: "2", name: "Gambly", kind: "wiki" as const },
    { id: "3", name: "Mappa villaggio", kind: "map" as const },
  ];
  assert.equal(findCatalogEntryByName("Gambly", catalog)?.id, "2");
  assert.equal(findCatalogEntryByName("torre", catalog)?.id, "1");
  assert.equal(findCatalogEntryByName("sconosciuto", catalog), null);
});
