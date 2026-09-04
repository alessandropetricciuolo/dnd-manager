import test from "node:test";
import assert from "node:assert/strict";
import { assistantSaveErrorMessage } from "../save-service";

test("keeps PostgREST save errors visible to the GM", () => {
  assert.equal(
    assistantSaveErrorMessage({ code: "PGRST204", message: "Could not find the 'save_action_name' column" }),
    "Could not find the 'save_action_name' column",
  );
});

test("keeps ordinary Error messages and has a safe fallback", () => {
  assert.equal(assistantSaveErrorMessage(new Error("Campagna obbligatoria.")), "Campagna obbligatoria.");
  assert.equal(assistantSaveErrorMessage(null), "Salvataggio non riuscito.");
});
