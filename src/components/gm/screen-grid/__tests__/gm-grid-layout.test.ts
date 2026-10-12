import assert from "node:assert/strict";
import { test } from "node:test";
import { applyGridLayout } from "../gm-grid-layout";
import type { GmLayoutItem } from "../types";

const items: GmLayoutItem[] = [
  { i: "a", type: "notes", x: 0, y: 0, w: 4, h: 8, props: { draft: "retain" } },
  { i: "b", type: "initiative", x: 4, y: 0, w: 5, h: 8 },
];

test("repeated unchanged grid callbacks reach a stable state without rendering or persisting again", () => {
  let current = items;
  for (let i = 0; i < 100; i++) current = applyGridLayout(current, items.map((item) => ({ ...item })));
  assert.equal(current, items);
});

test("drag/resize updates geometry while preserving other panels and panel data", () => {
  const next = applyGridLayout(items, [{ i: "a", x: 1, y: 2, w: 3, h: 9 }]);
  assert.notEqual(next, items);
  assert.equal(next[1], items[1]);
  assert.equal(next[0].props, items[0].props);
  assert.deepEqual([next[0].x, next[0].y, next[0].w, next[0].h], [1, 2, 3, 9]);
  assert.equal(applyGridLayout(next, next), next);
});
