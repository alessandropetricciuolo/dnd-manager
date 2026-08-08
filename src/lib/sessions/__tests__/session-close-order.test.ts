import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const actionsSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../../app/campaigns/actions.ts"),
  "utf8"
);

function sliceFunctionBody(functionName: string, nextFunctionName: string): string {
  const fnStart = actionsSource.indexOf(`export async function ${functionName}`);
  assert.ok(fnStart >= 0, `missing ${functionName}`);
  const fnEnd = actionsSource.indexOf(`export async function ${nextFunctionName}`, fnStart + 1);
  assert.ok(fnEnd > fnStart, `missing boundary after ${functionName}`);
  return actionsSource.slice(fnStart, fnEnd);
}

test("closeSessionAction records attendance and XP before marking the session completed", () => {
  const body = sliceFunctionBody("closeSessionAction", "preCloseSessionAction");
  const xpIdx = body.indexOf("applySessionCloseAttendanceAndXp");
  const completedIdx = body.indexOf('status: "completed"');
  assert.ok(xpIdx >= 0);
  assert.ok(completedIdx >= 0);
  assert.ok(xpIdx < completedIdx);
});

test("preCloseSessionAction saves attendance before setting is_pre_closed", () => {
  const body = sliceFunctionBody("preCloseSessionAction", "getSessionWizardMeta");
  const xpIdx = body.indexOf("applySessionCloseAttendanceAndXp");
  const preClosedIdx = body.indexOf("is_pre_closed: true");
  assert.ok(xpIdx >= 0);
  assert.ok(preClosedIdx >= 0);
  assert.ok(xpIdx < preClosedIdx);
});
