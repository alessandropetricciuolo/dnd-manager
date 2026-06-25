#!/usr/bin/env node
/**
 * Installa hook post-commit che esegue npm run gmflow:export senza bloccare il commit.
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BD_ROOT = join(__dirname, "..", "..");
const HOOKS_DIR = join(BD_ROOT, ".git", "hooks");
const HOOK_PATH = join(HOOKS_DIR, "post-commit");
const LOG_PATH = "/tmp/bd-gmflow-export.log";

const HOOK_MARKER = "# bd-gmflow-export-hook";

const HOOK_BODY = `#!/bin/sh
${HOOK_MARKER}
# Aggiorna ledger export B&D → gmflow. Non blocca il commit se fallisce.
LOG="${LOG_PATH}"
BD_ROOT="$(git rev-parse --show-toplevel)"
cd "$BD_ROOT" || exit 0
{
  echo "=== $(date -Iseconds) post-commit gmflow:export ==="
  npm run gmflow:export
  echo "=== exit code: $? ==="
} >> "$LOG" 2>&1
exit 0
`;

function main() {
  if (!existsSync(join(BD_ROOT, ".git"))) {
    console.error("Errore: .git non trovato. Esegui da un repository git.");
    process.exit(1);
  }

  mkdirSync(HOOKS_DIR, { recursive: true });

  let existing = "";
  if (existsSync(HOOK_PATH)) {
    existing = readFileSync(HOOK_PATH, "utf8");
    if (existing.includes(HOOK_MARKER) && !existing.includes("npm run gmflow:export")) {
      console.log("Hook esistente con marker B&D — aggiorno contenuto.");
    } else if (existing.includes(HOOK_MARKER)) {
      console.log("Hook post-commit B&D già installato e aggiornato.");
      chmodSync(HOOK_PATH, 0o755);
      console.log(`Path hook: ${HOOK_PATH}`);
      console.log(`Log:       ${LOG_PATH}`);
      return;
    } else if (existing.trim()) {
      const merged = `${existing.trim()}\n\n${HOOK_BODY}`;
      writeFileSync(HOOK_PATH, merged, "utf8");
      chmodSync(HOOK_PATH, 0o755);
      console.log("Hook post-commit esistente preservato — blocco B&D aggiunto in coda.");
      console.log(`Path hook: ${HOOK_PATH}`);
      console.log(`Log:       ${LOG_PATH}`);
      return;
    }
  }

  writeFileSync(HOOK_PATH, HOOK_BODY, "utf8");
  chmodSync(HOOK_PATH, 0o755);

  console.log("Hook post-commit installato.");
  console.log(`Path hook: ${HOOK_PATH}`);
  console.log(`Log:       ${LOG_PATH}`);
  console.log("");
  console.log("Per disattivare: rimuovi o commenta il blocco con marker bd-gmflow-export-hook in .git/hooks/post-commit");
}

main();
