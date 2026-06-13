import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const authDir = path.join(__dirname, "tests/e2e/.auth");
const e2ePort = process.env.PLAYWRIGHT_PORT ?? "3099";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalTeardown: path.join(__dirname, "tests/e2e/global-teardown.ts"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "auth-flow",
      dependencies: ["setup"],
      testMatch: /shared\/auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin",
      dependencies: ["setup"],
      testMatch: /admin\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(authDir, "admin.json"),
      },
    },
    {
      name: "gm",
      dependencies: ["setup"],
      testMatch: /gm\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(authDir, "gm.json"),
      },
    },
    {
      name: "player",
      dependencies: ["setup"],
      testMatch: /player\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(authDir, "player.json"),
      },
    },
    {
      name: "public",
      dependencies: ["setup"],
      testMatch: /public\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "flows",
      dependencies: ["setup"],
      testMatch: /flows\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "ai-prod",
      dependencies: ["setup"],
      testMatch: /ai\/.*\.prod\.spec\.ts/,
      timeout: 600_000,
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(authDir, "gm.json"),
        actionTimeout: 120_000,
        navigationTimeout: 60_000,
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npm run dev -- -p ${e2ePort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
