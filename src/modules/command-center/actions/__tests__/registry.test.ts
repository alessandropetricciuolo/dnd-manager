import assert from "node:assert/strict";
import test from "node:test";
import {
  executeAction,
  getRegisteredAction,
  listRegisteredActionNames,
} from "@/modules/command-center/actions";

test("registry registers core workspace and wrapper actions", () => {
  const names = listRegisteredActionNames();
  assert.ok(names.includes("command.note.create"));
  assert.ok(names.includes("workspace.task.create"));
  assert.ok(names.includes("gm.note.create"));
  assert.ok(names.includes("session.create"));
  assert.ok(names.includes("wiki.entity.create"));
  assert.ok(names.includes("ai.proposal.execute"));
});

test("executeAction rejects unknown action name", async () => {
  const result = await executeAction("not.a.real.action", {});
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error, /non registrata/);
  }
});

test("executeAction validates command.note.create input", async () => {
  const result = await executeAction("command.note.create", { content: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error, /Contenuto/);
  }
});

test("getRegisteredAction returns definition metadata", () => {
  const action = getRegisteredAction("command.note.create");
  assert.ok(action);
  assert.equal(action?.category, "command");
  assert.equal(action?.name, "command.note.create");
});
