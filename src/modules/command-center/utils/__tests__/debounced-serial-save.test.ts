import assert from "node:assert/strict";
import test from "node:test";

import { createDebouncedSerialSaver } from "@/modules/command-center/utils/debounced-serial-save";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("debounced serial saver persists only the latest value after overlapping saves", async () => {
  const writes: string[] = [];

  const saver = createDebouncedSerialSaver<string>({
    delayMs: 20,
    save: async (value) => {
      writes.push(`start:${value}`);
      await delay(30);
      writes.push(`done:${value}`);
      return { success: true };
    },
  });

  saver.schedule("a");
  await delay(25);
  saver.schedule("ab");
  await saver.flush();

  assert.deepEqual(writes, ["start:a", "done:a", "start:ab", "done:ab"]);
});

test("debounced serial saver chains saves when value changes during in-flight write", async () => {
  const writes: string[] = [];

  const saver = createDebouncedSerialSaver<string>({
    delayMs: 0,
    save: async (value) => {
      writes.push(value);
      await delay(20);
      return { success: true };
    },
  });

  saver.schedule("first");
  await delay(5);
  saver.schedule("second");
  await saver.flush();

  assert.deepEqual(writes, ["first", "second"]);
});

test("debounced serial saver cancel drops pending writes", async () => {
  const writes: string[] = [];

  const saver = createDebouncedSerialSaver<string>({
    delayMs: 10,
    save: async (value) => {
      writes.push(value);
      return { success: true };
    },
  });

  saver.schedule("drop-me");
  saver.cancel();
  await delay(30);

  assert.deepEqual(writes, []);
});
