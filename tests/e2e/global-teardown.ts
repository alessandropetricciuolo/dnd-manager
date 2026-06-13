import type { FullConfig } from "@playwright/test";
import { execSync } from "node:child_process";
import path from "node:path";
import { isProductionE2ETarget } from "../../scripts/e2e-env";

export default async function globalTeardown(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? process.env.PLAYWRIGHT_BASE_URL;
  if (!isProductionE2ETarget(baseURL)) {
    return;
  }

  console.log("[e2e:teardown] produzione rilevata — rendo private le campagne E2E-QA");
  execSync("npx tsx scripts/e2e-teardown-campaigns.ts", {
    stdio: "inherit",
    cwd: path.join(__dirname, "../.."),
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "",
      E2E_TEARDOWN_PRIVATE: "1",
    },
  });

  console.log("[e2e:teardown] pulizia artifact wiki/sessioni AI sulla campagna long E2E");
  execSync("npx tsx scripts/e2e-cleanup-long-campaign-artifacts.ts", {
    stdio: "inherit",
    cwd: path.join(__dirname, "../.."),
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "",
      E2E_CLEANUP_ARTIFACTS: "1",
    },
  });
}
