#!/usr/bin/env node
/**
 * Aggiorna ledger e JSON export B&D → gmflow dall'ultimo commit.
 * Copia i file di stato in gmflow (non importa codice applicativo).
 */

import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BD_ROOT = join(__dirname, "..", "..");
const LEDGER_PATH = join(BD_ROOT, "docs", "gmflow-export-ledger.md");
const JSON_PATH = join(BD_ROOT, "docs", "gmflow-export-current.json");
const SYNC_CONFIG_PATH = join(BD_ROOT, ".gmflow-sync.local.json");

const DEFAULT_GMFLOW_REPO = "/Users/alessandropetricciuolo/Desktop/masto-platform";
const GMFLOW_LEDGER_REL = join("docs", "imports", "bd-gmflow-export-ledger.md");
const GMFLOW_JSON_REL = join("docs", "imports", "bd-gmflow-export-current.json");

const STATUSES = new Set([
  "BD_ONLY",
  "TO_IMPORT",
  "IMPORTED",
  "PARTIALLY_IMPORTED",
  "DISCARDED",
  "NEEDS_DECISION",
  "NEEDS_REVIEW",
]);

const CATEGORIES = new Set([
  "AI",
  "UI_UX",
  "I18N",
  "DATABASE",
  "AUTH",
  "CAMPAIGNS",
  "SESSIONS",
  "WIKI",
  "MAPS",
  "GM_SCREEN",
  "MEDIA_STORAGE",
  "PLAYER_PORTAL",
  "ADMIN",
  "BUGFIX",
  "SECURITY",
  "PERFORMANCE",
  "OTHER",
]);

const warnings = [];

function runGit(args) {
  try {
    return execSync(`git ${args}`, {
      cwd: BD_ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    const stderr = e.stderr?.toString?.() ?? "";
    if (stderr) warnings.push(`git ${args}: ${stderr.trim()}`);
    return "";
  }
}

function loadSyncConfig() {
  if (!existsSync(SYNC_CONFIG_PATH)) {
    warnings.push(
      `.gmflow-sync.local.json non trovato — uso path default: ${DEFAULT_GMFLOW_REPO}`
    );
    return { gmflowRepoPath: DEFAULT_GMFLOW_REPO };
  }
  try {
    const raw = JSON.parse(readFileSync(SYNC_CONFIG_PATH, "utf8"));
    const path = raw.gmflowRepoPath?.trim();
    if (!path) {
      warnings.push("gmflowRepoPath vuoto in .gmflow-sync.local.json — uso default.");
      return { gmflowRepoPath: DEFAULT_GMFLOW_REPO };
    }
    return { gmflowRepoPath: path };
  } catch (e) {
    warnings.push(`Errore lettura .gmflow-sync.local.json: ${e.message}`);
    return { gmflowRepoPath: DEFAULT_GMFLOW_REPO };
  }
}

function loadExistingItems() {
  if (!existsSync(JSON_PATH)) return [];
  try {
    const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
    return Array.isArray(data.items) ? data.items : [];
  } catch (e) {
    warnings.push(`Impossibile leggere JSON esistente: ${e.message}`);
    return [];
  }
}

function classifyCategory(filePath, statusCode = "") {
  const p = filePath.toLowerCase();
  const name = p.split("/").pop() ?? p;

  if (/supabase\/migrations/.test(p)) {
    if (/rls|policy|security|permission/.test(p + statusCode)) return "SECURITY";
    return "DATABASE";
  }
  if (/\b(ai|openrouter|generator|prompt|image-refine|image-provider)\b/.test(p)) return "AI";
  if (/\bcampaigns\b/.test(p)) return "CAMPAIGNS";
  if (/\bsessions\b/.test(p)) return "SESSIONS";
  if (/\b(wiki|lore)\b/.test(p)) return "WIKI";
  if (/\bmaps\b/.test(p)) return "MAPS";
  if (/\b(media|upload|storage|r2|telegram)\b/.test(p)) return "MEDIA_STORAGE";
  if (/\b(gm-screen|gm_screen|initiative|combat)\b/.test(p) || /\/gm\//.test(p)) return "GM_SCREEN";
  if (/\badmin\b/.test(p)) return "ADMIN";
  if (/\b(auth|login|signup)\b/.test(p)) return "AUTH";
  if (/\b(messages|i18n|locale)\b/.test(p)) return "I18N";
  if (/\b(performance|cache|optimi)/.test(p)) return "PERFORMANCE";
  if (/\b(fix|bug)\b/.test(name) || statusCode === "M") {
    // weak signal — keep OTHER unless path hints
  }
  if (/\.test\.(ts|tsx|js|mjs)$/.test(p) && /\bai\b/.test(p)) return "AI";
  if (/components\/wiki/.test(p)) return "WIKI";
  if (/components\//.test(p) && !/\badmin\b/.test(p)) return "UI_UX";
  return "OTHER";
}

function estimatePriority(category, statusCode) {
  if (["AI", "SECURITY", "AUTH", "DATABASE"].includes(category)) return "Alta";
  if (["WIKI", "CAMPAIGNS", "SESSIONS", "GM_SCREEN", "MEDIA_STORAGE"].includes(category)) return "Media";
  if (statusCode === "D") return "Bassa";
  return "Media";
}

function statusActionLabel(statusCode) {
  switch (statusCode) {
    case "A":
      return "aggiunto";
    case "D":
      return "eliminato";
    case "M":
      return "modificato";
    case "R":
      return "rinominato";
    default:
      return "cambiato";
  }
}

function inferTitle(filePath, statusCode) {
  const base = filePath.split("/").pop() ?? filePath;
  const action = statusActionLabel(statusCode);
  const category = classifyCategory(filePath, statusCode);
  return `${category}: ${base} (${action})`;
}

function inferDescription(filePath, statusCode, commitSubject) {
  const action = statusActionLabel(statusCode);
  return `File \`${filePath}\` ${action} nel commit «${commitSubject}». Classificazione automatica — richiede revisione umana.`;
}

function inferValueForGmflow(category, filePath) {
  const hints = {
    AI: "Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.",
    WIKI: "Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.",
    CAMPAIGNS: "Logica campagne potenzialmente generalizzabile per multi-tenant.",
    SESSIONS: "Gestione sessioni di gioco — valutare parità funzionale gmflow.",
    MAPS: "Feature mappe — verificare allineamento architettura gmflow.",
    GM_SCREEN: "Schermo GM / combattimento — alto valore per GM professionisti.",
    MEDIA_STORAGE: "Upload/storage media — adattare a R2 o storage gmflow.",
    ADMIN: "Tool admin interni — importare solo se gmflow ha pannello equivalente.",
    AUTH: "Autenticazione/permessi — critico per sicurezza multi-tenant.",
    DATABASE: "Schema o migrazione DB — valutare impatto RLS e tenant isolation.",
    SECURITY: "Policy sicurezza — priorità alta per SaaS.",
    UI_UX: "Miglioramento interfaccia — valutare design system gmflow.",
    I18N: "Internazionalizzazione — allineare a strategia locale gmflow.",
    PERFORMANCE: "Ottimizzazione — beneficio trasversale se applicabile.",
    OTHER: "Modifica generica — valutare manualmente rilevanza gmflow.",
    BUGFIX: "Correzione bug — importare se lo stesso bug esiste in gmflow.",
    PLAYER_PORTAL: "Portale giocatore — verificare feature parity.",
  };
  return hints[category] ?? hints.OTHER;
}

function inferAdaptations(category) {
  const base = [];
  if (["AI", "WIKI", "CAMPAIGNS", "SESSIONS", "MAPS", "GM_SCREEN"].includes(category)) {
    base.push("Multi-tenant", "Permessi");
  }
  if (category === "AI") base.push("Storage R2", "sicurezza");
  if (category === "MEDIA_STORAGE") base.push("Storage R2");
  if (category === "UI_UX") base.push("i18n");
  if (["CAMPAIGNS", "AUTH", "ADMIN"].includes(category)) base.push("SaaS/billing");
  if (category === "I18N") base.push("i18n");
  if (category === "DATABASE" || category === "SECURITY") base.push("Multi-tenant", "sicurezza");
  if (base.length === 0) base.push("altro");
  return [...new Set(base)];
}

function inferRisks(category) {
  const risks = ["Classificazione automatica non verificata"];
  if (category === "AI") risks.push("Costi API OpenRouter", "Dipendenze modello");
  if (category === "DATABASE" || category === "SECURITY") risks.push("Impatto RLS / isolamento tenant");
  if (category === "MEDIA_STORAGE") risks.push("Divergenza storage B&D (Telegram) vs gmflow (R2)");
  if (category === "UI_UX") risks.push("Divergenza design system / CSS tema");
  return risks;
}

function inferDecisions(category) {
  const decisions = ["Confermare se la modifica è rilevante per gmflow"];
  if (category === "AI") decisions.push("Validare model ID OpenRouter e quota per tenant");
  if (category === "ADMIN") decisions.push("gmflow ha equivalente admin o è solo tooling B&D?");
  if (category === "MEDIA_STORAGE") decisions.push("Quale adapter storage usare in gmflow?");
  return decisions;
}

function inferDoneCriteria(category) {
  const base = [
    "Codice portato in gmflow con adattamenti documentati",
    "Test minimi superati",
    "Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED",
  ];
  if (category === "AI") base.push("OPENROUTER_API_KEY configurata in gmflow");
  if (category === "SECURITY" || category === "DATABASE") base.push("RLS/policy verificate per multi-tenant");
  return base;
}

function mapGmflowLikelyFiles(bdFile) {
  if (bdFile.startsWith("docs/")) {
    return [`docs/imports/${bdFile.replace(/^docs\//, "")}`];
  }
  if (bdFile.startsWith("src/")) {
    return [bdFile];
  }
  if (bdFile.startsWith("supabase/")) {
    return [bdFile];
  }
  return [`src/${bdFile}`];
}

function itemKey(commitHash, bdFile) {
  return `${commitHash}:${bdFile}`;
}

function isDuplicate(existingItems, commitHash, bdFile) {
  const key = itemKey(commitHash, bdFile);
  return existingItems.some(
    (item) =>
      item._key === key ||
      (item.commitHash === commitHash && item.bdFiles?.includes(bdFile))
  );
}

function renderItemSection(item) {
  const list = (arr) => (arr?.length ? arr.map((x) => `* ${x}`).join("\n") : "* —");
  return `### [${item.id}] ${item.title}

Stato:
${item.status}

Categoria:
${item.category}

Priorità per gmflow:
${item.priority}

Descrizione:

* ${item.description}

Perché potrebbe servire a gmflow:

* ${item.valueForGmflow}

Adattamenti necessari:

${list(item.requiredAdaptations)}

File B&D coinvolti:

${list(item.bdFiles)}

File gmflow probabili:

${list(item.gmflowLikelyFiles)}

Rischi:

${list(item.risks)}

Decisioni richieste:

${list(item.decisionsNeeded)}

Criterio di import completato:

${list(item.doneCriteria)}
`;
}

function renderMarkdown(snapshot, items) {
  const needsReview = items.filter((i) => i.status === "NEEDS_REVIEW");
  const reviewed = items.filter((i) =>
    ["TO_IMPORT", "IMPORTED", "PARTIALLY_IMPORTED"].includes(i.status)
  );
  const excluded = items.filter((i) => ["DISCARDED", "BD_ONLY"].includes(i.status));
  const queue = items
    .filter((i) => i.status === "TO_IMPORT")
    .sort((a, b) => {
      const p = { Alta: 0, Media: 1, Bassa: 2 };
      return (p[a.priority] ?? 9) - (p[b.priority] ?? 9);
    });

  const needsDecision = items.filter((i) => i.status === "NEEDS_DECISION");

  let md = `# B&D → gmflow Export Ledger

## Snapshot

* Data aggiornamento: ${snapshot.updatedAt}
* Branch corrente: ${snapshot.branch}
* Ultimo commit analizzato: ${snapshot.lastCommit}
* Range commit analizzato: ${snapshot.commitRange}
* Stato generale: ${snapshot.overallStatus}
* Voci totali: ${items.length} (NEEDS_REVIEW: ${needsReview.length}, TO_IMPORT: ${queue.length}, IMPORTED: ${items.filter((i) => i.status === "IMPORTED").length})

## Delta automatico non revisionato

`;

  if (needsReview.length === 0) {
    md += "_Nessuna voce in attesa di revisione._\n\n";
  } else {
    for (const item of needsReview) {
      md += renderItemSection(item) + "\n";
    }
  }

  md += `## Modifiche revisionate manualmente

`;
  if (reviewed.length === 0) {
    md += "_Nessuna voce revisionata._\n\n";
  } else {
    for (const item of reviewed) {
      md += renderItemSection(item) + "\n";
    }
  }

  md += `## Modifiche da NON importare

`;
  const notImport = [...excluded, ...needsDecision];
  if (notImport.length === 0) {
    md += "_Nessuna voce esclusa o in decisione._\n\n";
  } else {
    for (const item of notImport) {
      md += renderItemSection(item) + "\n";
    }
  }

  md += `## Coda import consigliata

`;
  if (queue.length === 0) {
    md += "_Coda vuota — promuovere voci da NEEDS_REVIEW a TO_IMPORT dopo revisione._\n\n";
  } else {
    for (const item of queue) {
      md += `- **[${item.id}]** ${item.title} — priorità ${item.priority} (${item.category})\n`;
    }
    md += "\n";
  }

  md += `## Sintesi per ChatGPT

Questo ledger traccia modifiche Barber & Dragons da valutare per import in gmflow.app.
**Non importa codice automaticamente** — copia solo file di stato in \`masto-platform/docs/imports/\`.

- Repository sorgente: \`${snapshot.sourceRepoPath}\`
- Repository gmflow locale: \`${snapshot.targetRepoPath}\`
- Ultimo commit: \`${snapshot.lastCommitShort}\` — ${snapshot.commitSubject}
- File analizzati nell'ultimo run: ${snapshot.filesAnalyzed}
- Nuove voci aggiunte: ${snapshot.newItemsAdded}

**Azioni consigliate:**
1. Rivedere voci \`NEEDS_REVIEW\` nella sezione «Delta automatico».
2. Promuovere a \`TO_IMPORT\` le modifiche rilevanti; impostare \`BD_ONLY\` o \`DISCARDED\` per il resto.
3. Usare \`NEEDS_DECISION\` quando serve input del product owner.
4. Dopo import manuale in gmflow, aggiornare stato a \`IMPORTED\` o \`PARTIALLY_IMPORTED\`.
5. Package dettagliati opzionali in \`docs/gmflow-export-packages/\`.

**Comandi:**
- \`npm run gmflow:export\` — aggiorna ledger e copia in gmflow
- \`npm run gmflow:install-hook\` — hook post-commit automatico
`;

  return md;
}

function copyToGmflow(gmflowRepoPath) {
  const copied = [];
  if (!existsSync(gmflowRepoPath)) {
    warnings.push(`Repository gmflow non trovato: ${gmflowRepoPath}`);
    return copied;
  }

  const targets = [
    { src: LEDGER_PATH, rel: GMFLOW_LEDGER_REL },
    { src: JSON_PATH, rel: GMFLOW_JSON_REL },
  ];

  for (const { src, rel } of targets) {
    const dest = join(gmflowRepoPath, rel);
    try {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      copied.push(dest);
    } catch (e) {
      warnings.push(`Copia fallita ${src} → ${dest}: ${e.message}`);
    }
  }

  return copied;
}

function parseNameStatusLine(line) {
  const parts = line.split("\t");
  if (parts.length < 2) return null;
  let statusCode = parts[0];
  let filePath = parts[parts.length - 1];
  if (statusCode.startsWith("R")) {
    statusCode = "R";
    filePath = parts[2] ?? parts[1];
  }
  return { statusCode, filePath };
}

function main() {
  const syncConfig = loadSyncConfig();
  const gmflowRepoPath = syncConfig.gmflowRepoPath;

  const branch = runGit("rev-parse --abbrev-ref HEAD") || "unknown";
  const lastCommit = runGit("rev-parse HEAD") || "";
  const lastCommitShort = lastCommit.slice(0, 7);
  const commitSubject = runGit("log -1 --format=%s") || "(senza subject)";
  const parentCommit = runGit("rev-parse HEAD~1");
  const hasParent = Boolean(parentCommit);

  let commitRange = lastCommitShort;
  let diffLines = [];

  if (hasParent) {
    commitRange = `${parentCommit.slice(0, 7)}..${lastCommitShort}`;
    const raw = runGit("diff --name-status HEAD~1..HEAD");
    diffLines = raw ? raw.split("\n").filter(Boolean) : [];
  } else {
    warnings.push("Primo commit o HEAD~1 non disponibile — analizzo solo file dell'ultimo commit.");
    const raw = runGit("show --name-status --format= HEAD");
    diffLines = raw
      ? raw
          .split("\n")
          .filter((l) => l && !l.startsWith(":"))
          .filter((l) => /^[AMDRT]/.test(l))
      : [];
  }

  const changedFiles = [];
  for (const line of diffLines) {
    const parsed = parseNameStatusLine(line);
    if (!parsed?.filePath) continue;
    if (parsed.filePath.startsWith("docs/gmflow-export-")) continue;
    if (parsed.filePath === ".gmflow-sync.local.json") continue;
    changedFiles.push(parsed);
  }

  if (changedFiles.length === 0) {
    const existingItems = loadExistingItems();
    if (existingItems.length === 0) {
      console.log("Nessun file applicativo nel commit — ledger invariato.");
      return;
    }
    const now = new Date().toISOString();
    const needsReviewCount = existingItems.filter((i) => i.status === "NEEDS_REVIEW").length;
    const snapshot = {
      updatedAt: now,
      sourceProject: "Barber & Dragons",
      targetProject: "gmflow.app",
      sourceRepoPath: BD_ROOT,
      targetRepoPath: gmflowRepoPath,
      branch,
      lastCommit,
      lastCommitShort,
      commitSubject,
      commitRange,
      filesAnalyzed: 0,
      newItemsAdded: 0,
      overallStatus:
        needsReviewCount > 0
          ? `${needsReviewCount} voci NEEDS_REVIEW`
          : "Nessuna voce in attesa di revisione automatica",
    };
    const jsonOutput = {
      updatedAt: now,
      sourceProject: snapshot.sourceProject,
      targetProject: snapshot.targetProject,
      sourceRepoPath: snapshot.sourceRepoPath,
      targetRepoPath: snapshot.targetRepoPath,
      branch,
      lastCommit,
      commitRange,
      items: existingItems.map(({ _key, ...rest }) => rest),
    };
    mkdirSync(dirname(LEDGER_PATH), { recursive: true });
    writeFileSync(LEDGER_PATH, renderMarkdown(snapshot, existingItems), "utf8");
    writeFileSync(JSON_PATH, JSON.stringify(jsonOutput, null, 2) + "\n", "utf8");
    const copiedPaths = copyToGmflow(gmflowRepoPath);
    console.log("── B&D → gmflow Export Ledger (sync da JSON) ──");
    console.log(`Ledger rigenerato da ${existingItems.length} voci esistenti.`);
    console.log(`Ledger B&D:          ${LEDGER_PATH}`);
    console.log(`JSON B&D:            ${JSON_PATH}`);
    if (copiedPaths.length) {
      console.log("Copiati in gmflow:");
      for (const p of copiedPaths) console.log(`  → ${p}`);
    }
    return;
  }

  const existingItems = loadExistingItems();
  let newItemsAdded = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < changedFiles.length; i++) {
    const { statusCode, filePath } = changedFiles[i];
    if (isDuplicate(existingItems, lastCommit, filePath)) continue;

    const category = classifyCategory(filePath, statusCode);
    const seq = String(i + 1).padStart(3, "0");
    const id = `BD-GMFLOW-${lastCommitShort}-${seq}`;

    const item = {
      id,
      title: inferTitle(filePath, statusCode),
      status: "NEEDS_REVIEW",
      category,
      priority: estimatePriority(category, statusCode),
      description: inferDescription(filePath, statusCode, commitSubject),
      valueForGmflow: inferValueForGmflow(category, filePath),
      bdFiles: [filePath],
      gmflowLikelyFiles: mapGmflowLikelyFiles(filePath),
      requiredAdaptations: inferAdaptations(category),
      risks: inferRisks(category),
      decisionsNeeded: inferDecisions(category),
      doneCriteria: inferDoneCriteria(category),
      commitHash: lastCommit,
      commitShort: lastCommitShort,
      commitSubject,
      statusCode,
      createdAt: now,
      updatedAt: now,
      _key: itemKey(lastCommit, filePath),
    };

    existingItems.push(item);
    newItemsAdded++;
  }

  const needsReviewCount = existingItems.filter((i) => i.status === "NEEDS_REVIEW").length;
  const overallStatus =
    needsReviewCount > 0
      ? `${needsReviewCount} voci NEEDS_REVIEW`
      : "Nessuna voce in attesa di revisione automatica";

  const snapshot = {
    updatedAt: now,
    sourceProject: "Barber & Dragons",
    targetProject: "gmflow.app",
    sourceRepoPath: BD_ROOT,
    targetRepoPath: gmflowRepoPath,
    branch,
    lastCommit,
    lastCommitShort,
    commitSubject,
    commitRange,
    filesAnalyzed: changedFiles.length,
    newItemsAdded,
    overallStatus,
  };

  const jsonOutput = {
    updatedAt: now,
    sourceProject: snapshot.sourceProject,
    targetProject: snapshot.targetProject,
    sourceRepoPath: snapshot.sourceRepoPath,
    targetRepoPath: snapshot.targetRepoPath,
    branch,
    lastCommit,
    commitRange,
    items: existingItems.map(({ _key, ...rest }) => rest),
  };

  mkdirSync(dirname(LEDGER_PATH), { recursive: true });
  writeFileSync(LEDGER_PATH, renderMarkdown(snapshot, existingItems), "utf8");
  writeFileSync(JSON_PATH, JSON.stringify(jsonOutput, null, 2) + "\n", "utf8");

  const copiedPaths = copyToGmflow(gmflowRepoPath);

  console.log("── B&D → gmflow Export Ledger ──");
  console.log(`Branch:              ${branch}`);
  console.log(`Ultimo commit:       ${lastCommitShort} ${commitSubject}`);
  console.log(`Range:               ${commitRange}`);
  console.log(`File analizzati:     ${changedFiles.length}`);
  console.log(`Nuove voci aggiunte: ${newItemsAdded}`);
  console.log(`Ledger B&D:          ${LEDGER_PATH}`);
  console.log(`JSON B&D:            ${JSON_PATH}`);
  if (copiedPaths.length) {
    console.log("Copiati in gmflow:");
    for (const p of copiedPaths) console.log(`  → ${p}`);
  } else {
    console.log("Copiati in gmflow:   (nessuno)");
  }
  if (warnings.length) {
    console.log("Warning:");
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
}

main();
