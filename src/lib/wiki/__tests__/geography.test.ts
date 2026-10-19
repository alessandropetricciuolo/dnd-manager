import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGeographyIndex, geographyIdentityKey, getGeographyContext, getGeographyLinks, getGeographyNeighbors, getGeographyPath, getUnplacedGeography, isGeographicRelationship, type GeographyEntity, type GeographyMap, type GeographyRelationship, type WikiGeographyData } from "../geography";

const entity = (id: string, name = id): GeographyEntity => ({ id, name, type: "npc", imageUrl: null, telegramFallbackId: null, adminOnly: false });
const map = (id: string, parentId: string | null = null, wikiEntityId: string | null = null): GeographyMap => ({ id, name: id, parentId, wikiEntityId, mapType: "city", imageUrl: null, adminOnly: false });
const edge = (id: string, sourceId: string, label: string, targetMapId: string | null, targetId: string | null = null): GeographyRelationship => ({ id, sourceId, label, targetMapId, targetId });
const data = (entities: GeographyEntity[], maps: GeographyMap[], relationships: GeographyRelationship[]): WikiGeographyData => ({ campaignName: "Test", entities, maps, relationships });

test("venue staff roles locate workers while ownership and temporary roles stay separate", () => {
  const input = data([entity("Lidia"), entity("Marta"), entity("owner"), entity("visitor"), { ...entity("venue"), type: "location" }], [map("city")], [
    edge("manager", "Lidia", "Responsabile di sala", null, "venue"),
    edge("innkeeper", "Marta", "Proprietaria e locandiera", null, "venue"),
    edge("property", "owner", "Proprietaria", null, "venue"),
    edge("temporary", "visitor", "Responsabile di sala durante la cena", null, "venue"),
    edge("place", "venue", "Si trova in", "city"),
  ]);
  const index = buildGeographyIndex(input);
  const local = getGeographyContext(input, index, "city").local;
  assert.deepEqual(local.map(e => e.id), ["Lidia", "Marta", "venue"]);
  assert.deepEqual(local.find(e => e.id === "Lidia")?.labels, ["Responsabile di sala · tramite venue"]);
  assert.deepEqual(local.find(e => e.id === "Marta")?.labels, ["Proprietaria e locandiera · tramite venue"]);
  assert.equal(getGeographyNeighbors(input, index, { kind: "map", id: "city" }).some(n => n.entry.id === "Lidia"), false);
});

test("nested Wiki places and their workers reach the city with a readable route", () => {
  const input = data([entity("worker"), { ...entity("shop"), type: "location" }, { ...entity("district"), type: "lore" }], [map("city", "continent"), map("continent")], [
    edge("work", "worker", "Lavora presso", null, "shop"),
    edge("shop", "shop", "Si trova in", null, "district"),
    edge("district", "district", "Si trova in", "city"),
  ]);
  const index = buildGeographyIndex(input);
  assert.deepEqual(getGeographyContext(input, index, "city").local.find(e => e.id === "worker")?.labels, ["Lavora presso · tramite shop → district"]);
  assert.equal(getGeographyContext(input, index, "continent").local.length, 3);
  assert.deepEqual(getUnplacedGeography(input, index), []);
  assert.equal(getGeographyNeighbors(input, index, { kind: "map", id: "city" }).some(n => n.entry.id === "worker"), false);
});

test("membership, proximity and another person's residence never propagate location", () => {
  const input = data([entity("member"), entity("owner"), { ...entity("guild"), type: "lore" }, { ...entity("shop"), type: "location" }], [map("city")], [
    edge("membership", "member", "Membro", null, "guild"),
    edge("activity", "guild", "Opera a", "city"),
    edge("legacy", "shop", "Lavora qui", null, "owner"),
    edge("home", "owner", "Vive a", "city"),
    edge("near", "member", "Vicino a", "city"),
  ]);
  const index = buildGeographyIndex(input);
  assert.deepEqual(getGeographyContext(input, index, "city").local.map(e => e.id), ["guild", "owner"]);
  assert.deepEqual(getUnplacedGeography(input, index).map(e => e.id), ["member", "shop"]);
});

test("containment chains terminate safely and invisible intermediate places do not leak", () => {
  const input = data([entity("worker"), { ...entity("a"), type: "location" }, { ...entity("b"), type: "location" }], [map("city")], [
    edge("work", "worker", "Lavora presso", null, "a"), edge("a", "a", "Contiene", null, "b"),
    edge("b", "b", "Contiene", null, "a"), edge("hidden", "a", "Si trova in", null, "secret"),
  ]);
  const index = buildGeographyIndex(input);
  assert.deepEqual(getGeographyContext(input, index, "city").local, []);
  assert.equal(getUnplacedGeography(input, index).length, 3);
});

test("house-family residence and inverse staff roles retain their geographic meaning", () => {
  const input = data([entity("child"), entity("cook"), { ...entity("house"), type: "location" }], [map("city")], [
    edge("home", "child", "Vive nella casa famiglia", null, "house"),
    edge("staff", "house", "Capocuoca", null, "cook"),
    edge("place", "house", "Si trova in", "city"),
  ]);
  const index = buildGeographyIndex(input);
  assert.deepEqual(getGeographyContext(input, index, "city").local.map(e => e.id), ["child", "cook", "house"]);
  const [link] = getGeographyLinks(input, index, { kind: "wiki", id: "cook" });
  assert.equal(link.source.id, "house");
  assert.equal(link.target.id, "cook");
});

test("superseded entries remain distinct and carry their editorial status", () => {
  const input = data([{ ...entity("old"), status: "deprecated" }, { ...entity("current"), status: "canonical" }], [map("city")], [
    edge("old", "old", "Opera a", "city"), edge("current", "current", "Opera a", "city"),
  ]);
  const local = getGeographyContext(input, buildGeographyIndex(input), "city").local;
  assert.equal(local.length, 2);
  assert.equal(local.find(e => e.id === "old")?.status, "deprecated");
});

test("mentions, origin and historical events do not become a current location", () => {
  for (const label of ["Menzionato nel testo", "Continente di origine", "Luogo di nascita", "Luogo del risveglio di Aurelian", "collegato", "Appartiene alla gilda"]) assert.equal(isGeographicRelationship(label), false, label);
  const input = data([entity("npc")], [map("city")], [edge("r", "npc", "Menzionato nel testo", "city")]);
  const index = buildGeographyIndex(input);
  assert.equal(getGeographyContext(input, index, "city").local.length, 0);
  assert.equal(getGeographyContext(input, index, "city").references[0].id, "npc");
  assert.equal(getUnplacedGeography(input, index)[0].id, "npc");
});

test("one NPC can live in one city and work in another", () => {
  const input = data([entity("Garzia")], [map("Portico"), map("Bastione")], [edge("r1", "Garzia", "vive a", "Portico"), edge("r2", "Garzia", "Bancarella al mercato", "Bastione")]);
  const index = buildGeographyIndex(input);
  assert.deepEqual(getGeographyContext(input, index, "Portico").local[0].labels, ["vive a"]);
  assert.deepEqual(getGeographyContext(input, index, "Bastione").local[0].labels, ["Bancarella al mercato"]);
  assert.deepEqual(getUnplacedGeography(input, index), []);
});

test("Wiki and Atlas geography unify only through an explicit identity", () => {
  const input = data([entity("city-wiki", "Portico"), entity("same-name", "Portico"), entity("npc")], [map("city-map")], [edge("identity", "city-wiki", "Lore", "city-map"), edge("lives", "npc", "Vive a", null, "city-wiki")]);
  const index = buildGeographyIndex(input);
  assert.equal(index.wikiToMap.get("city-wiki"), "city-map");
  assert.equal(index.wikiToMap.has("same-name"), false);
  assert.equal(getGeographyContext(input, index, "city-map").local[0].id, "npc");
  assert.equal(getGeographyContext(input, index, "city-map").references.length, 0);
  assert.deepEqual(getUnplacedGeography(input, index).map(e => e.id), ["same-name"]);
});

test("duplicate Wiki/map routes produce one local entry with all its exact labels", () => {
  const input = data([entity("city"), entity("npc")], [map("map", null, "city")], [edge("r1", "npc", "vive qui", "map"), edge("r2", "npc", "Lavora a", null, "city")]);
  const rows = getGeographyContext(input, buildGeographyIndex(input), "map").local;
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].labels, ["vive qui", "Lavora a"]);
});

test("ambiguous identities are not merged", () => {
  const input = data([entity("city")], [map("a", null, "city"), map("b")], [edge("identity", "city", "Lore", "b")]);
  const index = buildGeographyIndex(input);
  assert.equal(index.wikiToMap.has("city"), false);
  assert.equal(index.mapToWiki.size, 0);
});

test("explicit containment also locates districts when the city is the source", () => {
  const input = data([entity("city"), entity("district")], [map("map", null, "city")], [edge("district", "city", "Distretto cittadino", null, "district")]);
  const index = buildGeographyIndex(input);
  assert.equal(getGeographyContext(input, index, "map").local[0].id, "district");
  assert.deepEqual(getUnplacedGeography(input, index), []);
});

test("dossier unifies duplicate logical Wiki/map links without showing identity self-links", () => {
  const input = data([entity("city"), entity("npc")], [map("map", null, "city")], [edge("identity", "city", "Lore", "map"), edge("wiki", "npc", "Vive a", null, "city"), edge("map", "npc", "vive a", "map")]);
  const index = buildGeographyIndex(input);
  const links = getGeographyLinks(input, index, { kind: "map", id: "map" });
  assert.equal(links.length, 1);
  assert.equal(links[0].source.id, "npc");
});

test("relationship direction is preserved even for an awkward legacy label", () => {
  const input = data([entity("Armeria"), entity("Giorgio")], [], [edge("legacy", "Armeria", "lavora qui", null, "Giorgio")]);
  const [link] = getGeographyLinks(input, buildGeographyIndex(input), { kind: "wiki", id: "Giorgio" });
  assert.equal(link.source.id, "Armeria");
  assert.equal(link.target.id, "Giorgio");
  assert.equal(link.label, "lavora qui");
});

test("missing or protected endpoints never surface through relationships", () => {
  const input = data([entity("visible")], [map("city")], [edge("hidden", "hidden", "Vive a", "city"), edge("cross-campaign", "visible", "vive a", "missing-map"), edge("hidden-target", "visible", "Conosce", null, "hidden")]);
  const index = buildGeographyIndex(input);
  assert.deepEqual(getGeographyContext(input, index, "city").local, []);
  assert.deepEqual(getGeographyLinks(input, index, { kind: "wiki", id: "visible" }), []);
  assert.equal(getUnplacedGeography(input, index)[0].id, "visible");
});

test("orphan places and cyclic parent data remain finite and readable", () => {
  const input = data([], [map("orphan"), map("a", "b"), map("b", "a")], []);
  const index = buildGeographyIndex(input);
  assert.deepEqual(getGeographyPath(index, "orphan").map(m => m.id), ["orphan"]);
  assert.equal(getGeographyPath(index, "a").length, 2);
  assert.deepEqual(getGeographyPath(index, "missing"), []);
});

test("expansion reveals a real second hop without inventing a direct connection", () => {
  const input = data([entity("Dan"), entity("Patrizio"), entity("Ella")], [map("Locanda")], [
    edge("sirena", "Dan", "Riferimento canonico: La locanda della Sirena", "Locanda"),
    edge("father", "Patrizio", "padre di", null, "Dan"),
    edge("ella", "Dan", "Riferimento canonico: Ella", null, "Ella"),
  ]);
  const index = buildGeographyIndex(input);
  const first = getGeographyNeighbors(input, index, { kind: "map", id: "Locanda" });
  assert.deepEqual(first.map(neighbor => neighbor.entry.id), ["Dan"]);
  const second = getGeographyNeighbors(input, index, first[0].entry);
  assert.ok(second.some(neighbor => neighbor.entry.id === "Patrizio"));
  assert.ok(second.some(neighbor => neighbor.entry.id === "Ella"));
  assert.equal(first.some(neighbor => neighbor.entry.id === "Patrizio"), false);
});

test("opposite directed relationships group under one neighbor with both exact meanings", () => {
  const input = data([entity("Dan"), entity("Patrizio")], [], [edge("a", "Patrizio", "padre di", null, "Dan"), edge("b", "Dan", "Riferimento canonico: Patrizio", null, "Patrizio")]);
  const [neighbor] = getGeographyNeighbors(input, buildGeographyIndex(input), { kind: "wiki", id: "Dan" });
  assert.equal(neighbor.entry.id, "Patrizio");
  assert.equal(neighbor.relations.length, 2);
  assert.ok(neighbor.relations.some(relation => relation.direction === "in" && relation.label === "padre di"));
  assert.ok(neighbor.relations.some(relation => relation.direction === "out" && relation.label === "Riferimento canonico: Patrizio"));
});

test("cycle detection treats a map and its Wiki alias as the same ancestor", () => {
  const input = data([entity("city-wiki"), entity("npc")], [map("city-map", null, "city-wiki")], [edge("a", "npc", "Vive a", null, "city-wiki")]);
  const index = buildGeographyIndex(input);
  const ancestors = [geographyIdentityKey(index, { kind: "map", id: "city-map" })];
  const [neighbor] = getGeographyNeighbors(input, index, { kind: "wiki", id: "npc" });
  assert.equal(neighbor.entry.kind, "map");
  assert.equal(ancestors.includes(geographyIdentityKey(index, neighbor.entry)), true);
});

test("neighbors omit inaccessible endpoints and do not mutate the stored graph", () => {
  const input = data([entity("visible")], [], [edge("secret", "visible", "Conosce", null, "hidden")]);
  const before = JSON.stringify(input);
  assert.deepEqual(getGeographyNeighbors(input, buildGeographyIndex(input), { kind: "wiki", id: "visible" }), []);
  assert.equal(JSON.stringify(input), before);
});
