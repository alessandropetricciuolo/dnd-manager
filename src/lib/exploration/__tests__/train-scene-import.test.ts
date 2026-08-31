import assert from "node:assert/strict";
import test from "node:test";
import { importTrainSceneToFow } from "@/lib/exploration/train-scene-import";

test("importTrainSceneToFow rejects scenes whose grid would exhaust the server", () => {
  const hugeScene = {
    width: 32000,
    height: 32000,
    grid: 1,
    walls: [{ c: [0, 0, 0, 10], move: 1 }],
  };

  assert.throws(
    () => importTrainSceneToFow(hugeScene),
    /Scena troppo grande per importare FoW in modo sicuro/
  );
});
