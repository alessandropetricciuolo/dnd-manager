import test from "node:test";
import assert from "node:assert/strict";
import { defaultOverridesForPreview } from "@/lib/sheet-generator/build-choices-client";
import type { BuildChoicesPreview } from "@/lib/sheet-generator/build-choices-types";

test("defaultOverridesForPreview returns default choices when preview has editable slots", () => {
  const preview: BuildChoicesPreview = {
    slots: [
      {
        id: "skill-1",
        label: "Competenza di classe 1",
        group: "Competenze",
        options: [{ value: "arcana", label: "Arcano" }],
        value: "arcana",
      },
    ],
    overrides: { classSkills: ["arcana"] },
  };

  assert.deepEqual(defaultOverridesForPreview(preview), { classSkills: ["arcana"] });
});

test("defaultOverridesForPreview returns null when no choice step is needed", () => {
  assert.equal(defaultOverridesForPreview({ slots: [], overrides: {} }), null);
  assert.equal(defaultOverridesForPreview(null), null);
});
