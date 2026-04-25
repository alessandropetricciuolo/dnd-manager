import assert from "node:assert/strict";
import test from "node:test";
import {
  addHoursToFantasyDate,
  deriveCharacterCalendarDate,
  normalizeFantasyCalendarConfig,
  normalizeFantasyCalendarDate,
} from "@/lib/long-calendar";

test("addHoursToFantasyDate advances whole days only", () => {
  const config = normalizeFantasyCalendarConfig({
    months: [
      { name: "Uno", days: 30 },
      { name: "Due", days: 30 },
    ],
  });
  const start = normalizeFantasyCalendarDate({ year: 1, month: 1, day: 1 }, config);
  assert.deepEqual(addHoursToFantasyDate(start, 23, config), { year: 1, month: 1, day: 1 });
  assert.deepEqual(addHoursToFantasyDate(start, 24, config), { year: 1, month: 1, day: 2 });
});

test("deriveCharacterCalendarDate uses campaign base without anchor", () => {
  const config = normalizeFantasyCalendarConfig({
    months: [
      { name: "Uno", days: 30 },
      { name: "Due", days: 30 },
    ],
  });
  const base = normalizeFantasyCalendarDate({ year: 3, month: 1, day: 10 }, config);
  const date = deriveCharacterCalendarDate({
    campaignBaseDate: base,
    characterHours: 48,
    config,
  });
  assert.deepEqual(date, { year: 3, month: 1, day: 12 });
});

test("deriveCharacterCalendarDate uses character anchor for overrides", () => {
  const config = normalizeFantasyCalendarConfig({
    months: [
      { name: "Uno", days: 30 },
      { name: "Due", days: 30 },
    ],
  });
  const base = normalizeFantasyCalendarDate({ year: 1, month: 1, day: 1 }, config);
  const anchored = normalizeFantasyCalendarDate({ year: 4, month: 2, day: 5 }, config);
  const date = deriveCharacterCalendarDate({
    campaignBaseDate: base,
    characterHours: 140,
    config,
    anchorDate: anchored,
    anchorHours: 92,
  });
  assert.deepEqual(date, { year: 4, month: 2, day: 7 });
});
