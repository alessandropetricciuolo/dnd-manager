import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../../../../", import.meta.url);
function source(path: string) { return readFileSync(new URL(path, root), "utf8"); }

test("M3 production actions use the tested transition resolver", () => {
  const wiki = source("src/app/campaigns/wiki-actions.ts");
  const maps = source("src/app/campaigns/map-actions.ts");
  assert.match(wiki, /resolveAdminOnlyTransition/);
  assert.match(maps, /resolveAdminOnlyTransition/);
  assert.match(wiki, /adminOnlyRequested.*visibility|visibility.*adminOnlyRequested/s);
  assert.match(maps, /transition\.nextAdminOnly/);
});

test("M3 create paths suppress latent selective permissions", () => {
  const wiki = source("src/app/campaigns/wiki-actions.ts");
  const maps = source("src/app/campaigns/map-actions.ts");
  assert.match(wiki, /!adminOnlyRequested && visibility === "selective"/);
  assert.match(maps, /admin_only: adminOnlyRequested/);
  assert.match(source("src/components/wiki/edit-entity-dialog.tsx"), /adminDraftsEnabled \|\| Boolean/);
  assert.match(source("src/components/maps/edit-map-dialog.tsx"), /adminDraftsEnabled \|\| initialAdminOnly/);
});
