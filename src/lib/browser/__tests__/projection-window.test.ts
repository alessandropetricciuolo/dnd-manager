import assert from "node:assert/strict";
import test from "node:test";
import { openProjectionWindow } from "../projection-window";

function installWindow(overrides: Record<string, unknown>) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      innerWidth: 1000,
      innerHeight: 700,
      screen: { availWidth: 1000, availHeight: 700 },
      ...overrides,
    },
  });
}

test("opens and fits the projection on the screen different from the GM window", async () => {
  const currentScreen = { availLeft: 0, availTop: 25, availWidth: 1440, availHeight: 875 };
  const externalScreen = { availLeft: 1440, availTop: 0, availWidth: 1920, availHeight: 1080 };
  const calls: unknown[][] = [];
  const popup = {
    moveTo: (...args: unknown[]) => calls.push(["moveTo", ...args]),
    resizeTo: (...args: unknown[]) => calls.push(["resizeTo", ...args]),
    focus: () => calls.push(["focus"]),
  };

  installWindow({
    getScreenDetails: async () => ({ currentScreen, screens: [currentScreen, externalScreen] }),
    open: (...args: unknown[]) => {
      calls.push(["open", ...args]);
      return popup;
    },
  });

  const result = await openProjectionWindow("/projection", "PlayerScreenWindow");

  assert.equal(result, popup);
  assert.deepEqual(calls[0], [
    "open",
    "/projection",
    "PlayerScreenWindow",
    "left=1440,top=0,width=1920,height=1080,popup=yes,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no",
  ]);
  assert.deepEqual(calls.slice(1), [
    ["moveTo", 1440, 0],
    ["resizeTo", 1920, 1080],
    ["focus"],
  ]);
});

test("retains the normal popup fallback when screen permission is denied", async () => {
  let features = "";
  installWindow({
    getScreenDetails: async () => { throw new Error("denied"); },
    open: (_url: string, _name: string, value: string) => {
      features = value;
      return null;
    },
  });

  const result = await openProjectionWindow("/projection", "PlayerScreenWindow");

  assert.equal(result, null);
  assert.match(features, /^width=1280,height=720,popup=yes,/);
  assert.doesNotMatch(features, /left=|top=/);
});
