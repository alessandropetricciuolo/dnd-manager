import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(`${root}/${path}`, "utf8");

test("M5.A — liste e URL diretti applicano il filtro prima dell'output", () => {
  const wikiList = source("src/components/wiki/wiki-list.tsx");
  const wikiDetail = source("src/app/campaigns/wiki-actions.ts");
  const mapGallery = source("src/components/maps/map-gallery.tsx");
  assert.match(wikiList, /entityQuery\.eq\("admin_only", false\)/);
  assert.match(wikiDetail, /entityQuery\.eq\("admin_only", false\)/);
  assert.match(mapGallery, /mapQuery\.eq\("admin_only", false\)/);
});

test("M5.B — mappe e pin non enumerano destinazioni protette", () => {
  const detail = source("src/app/campaigns/[id]/maps/[mapId]/page.tsx");
  const secondScreen = source("src/app/campaigns/[id]/maps/[mapId]/view/page.tsx");
  assert.match(detail, /mapFullQuery\.eq\("admin_only", false\)/);
  assert.match(detail, /visiblePins = visiblePins\.filter/);
  assert.match(secondScreen, /mapQuery\.eq\("admin_only", false\)/);
  assert.match(secondScreen, /visiblePins = visiblePins\.filter/);
});

test("M5.C — grafo, relazioni e selettori filtrano sorgente e bersaglio", () => {
  const graph = source("src/app/campaigns/entity-graph-actions.ts");
  assert.match(graph, /safeRelationships/);
  assert.match(graph, /entitiesQuery\.eq\("admin_only", false\)/);
  assert.match(graph, /mapsQuery\.eq\("admin_only", false\)/);
  assert.match(graph, /wikiQuery\.eq\("admin_only", false\)/);
  assert.match(graph, /mapQuery\.eq\("admin_only", false\)/);
  assert.match(graph, /Non puoi collegare contenuti Solo Admin/);
});

test("M5.D — gli export service-role hanno scope non-Admin come default", () => {
  const wikiExport = source("src/lib/wiki-export/build-wiki-archive-zip.ts");
  const memoryExport = source("src/lib/actions/campaign-memory-export-actions.ts");
  const mediaExport = source("src/lib/media-export/collect-images.ts");
  assert.match(wikiExport, /includeAdminOnly: boolean/);
  assert.match(wikiExport, /query\.eq\("admin_only", false\)/);
  assert.match(memoryExport, /memoryQuery\.eq\("admin_only", false\)/);
  assert.match(mediaExport, /scoped\.eq\("admin_only", false\)/);
});

test("M5.E — contesto IA, suggerimenti e dashboard non usano cataloghi privilegiati", () => {
  const context = source("src/modules/command-center/ai-v2/context-service.ts");
  const batch = source("src/modules/command-center/ai-control-plane/wiki-npc-batch-builder.ts");
  const relationship = source("src/modules/command-center/ai-control-plane/relationship-proposal-builder.ts");
  const image = source("src/lib/ai/image-prompt-entity-memory.ts");
  const compendium = source("src/lib/actions/compendium-actions.ts");
  assert.match(context, /campaign_memory_chunks[\s\S]*admin_only", false/);
  assert.match(batch, /admin\.from\("wiki_entities"\)[\s\S]*admin_only", false/);
  assert.match(relationship, /admin\.from\("wiki_entities"\)[\s\S]*admin_only", false/);
  assert.match(image, /from\("wiki_entities"\)[\s\S]*admin_only", false/);
  assert.match(compendium, /baseQuery\.eq\("admin_only", false\)/);
});
