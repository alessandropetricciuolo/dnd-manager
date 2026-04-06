/**
 * Esporta il compendio Wiki da dungeonedraghi.it via API WordPress/WooCommerce (CPT product).
 * Usa l'albero taxonomy product_cat radicato su "compendio" (~1900 voci), non l'emporio.
 *
 * Output: public/manuals/dungeonedraghi_compendio.md (heading ATX per voce → ingest MD v3)
 * Cache incrementale: scripts/.cache/dungeonedraghi-compendio.json
 *
 * Uso:
 *   npm run export:dungeonedraghi
 *   node scripts/export-dungeonedraghi-compendio.mjs --delay-ms=1200
 *   node scripts/export-dungeonedraghi-compendio.mjs --max-categories=3
 *   node scripts/export-dungeonedraghi-compendio.mjs --cats=603
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { convert } from "html-to-text";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CACHE_PATH = path.join(ROOT, "scripts", ".cache", "dungeonedraghi-compendio.json");
const OUT_MD = path.join(ROOT, "public", "manuals", "dungeonedraghi_compendio.md");

const BASE = "https://dungeonedraghi.it";
const PRODUCT_API = `${BASE}/wp-json/wp/v2/product`;
const TAX_API = `${BASE}/wp-json/wp/v2/product_cat`;
const DEFAULT_PER_PAGE = 100;
const DEFAULT_DELAY_MS = 650;
const COMPENDIO_SLUG = "compendio";

function parseArgs() {
  const args = process.argv.slice(2);
  let maxCategories = Infinity;
  let delayMs = DEFAULT_DELAY_MS;
  let perPage = DEFAULT_PER_PAGE;
  /** Se impostato, esporta solo questi ID taxonomy (es. 603 = Classi). */
  let explicitCatIds = null;
  for (const a of args) {
    if (a.startsWith("--max-categories="))
      maxCategories = Number(a.split("=")[1]) || maxCategories;
    if (a.startsWith("--delay-ms=")) delayMs = Math.max(0, Number(a.split("=")[1]) || DEFAULT_DELAY_MS);
    if (a.startsWith("--per-page=")) perPage = Math.min(100, Math.max(1, Number(a.split("=")[1]) || DEFAULT_PER_PAGE));
    if (a.startsWith("--cats=")) {
      const raw = a.slice("--cats=".length);
      explicitCatIds = raw
        .split(",")
        .map((s) => Number(String(s).trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
    }
  }
  return { maxCategories, delayMs, perPage, explicitCatIds };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isCompendioPath(link) {
  if (!link || typeof link !== "string") return false;
  try {
    return new URL(link).pathname.includes("/compendio/");
  } catch {
    return link.includes("/compendio/");
  }
}

function stripTitle(t) {
  if (!t) return "";
  return String(t)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#038;/g, "&")
    .replace(/&#8217;/g, "'")
    .trim();
}

function htmlToPlain(html) {
  if (!html || !String(html).trim()) return "";
  const wrapped = `<div>${html}</div>`;
  return convert(wrapped, {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
  })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "BarberAndDragons-CompendioExport/1.0 (+local tooling)",
    },
  });
  if (res.status === 429) {
    const err = new Error("Rate limited (429)");
    err.status = 429;
    throw err;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function fetchAllProductCategories(perPage) {
  const all = [];
  let page = 1;
  while (true) {
    const url = `${TAX_API}?page=${page}&per_page=${perPage}&_fields=id,parent,slug,count`;
    let chunk;
    try {
      chunk = await fetchJson(url);
    } catch (e) {
      if (e.message && e.message.includes("HTTP 400")) break;
      throw e;
    }
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    all.push(...chunk);
    if (chunk.length < perPage) break;
    page += 1;
  }
  return all;
}

/** ID della categoria e di tutte le sue discendenze (product_cat). */
function subtreeCategoryIds(rootId, categories) {
  const byParent = new Map();
  for (const c of categories) {
    const p = c.parent ?? 0;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(c.id);
  }
  const out = new Set();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop();
    if (out.has(id)) continue;
    out.add(id);
    const kids = byParent.get(id) ?? [];
    for (const k of kids) stack.push(k);
  }
  return [...out];
}

function loadCache() {
  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && data.entriesById && typeof data.entriesById === "object") {
      return { entriesById: data.entriesById };
    }
  } catch {
    /* empty */
  }
  return { entriesById: {} };
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

function buildMarkdown(cache) {
  const rows = Object.values(cache.entriesById)
    .filter((e) => e && e.slug && e.titlePlain)
    .sort((a, b) => a.titlePlain.localeCompare(b.titlePlain, "it"));

  const parts = [
    "# Dungeon e Draghi — Compendio (export API)",
    "",
    "Fonte: https://dungeonedraghi.it/ — contenuto sotto taxonomy Compendio (API REST). Una sezione per voce.",
    "",
  ];

  for (const e of rows) {
    parts.push(`## ${e.titlePlain.replace(/^#+\s*/, "")}`, "");
    parts.push(`Fonte: ${e.link}`, "");
    parts.push(`WP ID: ${e.id} · Modificato: ${e.modifiedGmt || "—"}`, "");
    parts.push("", e.bodyPlain || "", "");
    parts.push("---", "");
  }

  return parts.join("\n").trim() + "\n";
}

async function fetchProductFull(id) {
  const url = `${PRODUCT_API}/${id}?_fields=id,slug,link,title,modified_gmt,content`;
  return fetchJson(url);
}

async function main() {
  const { maxCategories, delayMs, perPage, explicitCatIds } = parseArgs();
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });

  const categories = await fetchAllProductCategories(perPage);
  const root = categories.find((c) => c.slug === COMPENDIO_SLUG);
  if (!root) {
    throw new Error(`Categoria "${COMPENDIO_SLUG}" non trovata in product_cat.`);
  }

  let catIds;
  if (explicitCatIds && explicitCatIds.length > 0) {
    catIds = [...explicitCatIds].sort((a, b) => a - b);
  } else {
    catIds = subtreeCategoryIds(root.id, categories).sort((a, b) => a - b);
    if (Number.isFinite(maxCategories)) {
      catIds = catIds.slice(0, maxCategories);
    }
  }

  const cache = loadCache();
  let listed = 0;
  let fetchedFull = 0;

  for (const catId of catIds) {
    let page = 1;
    while (true) {
      const listUrl = `${PRODUCT_API}?product_cat=${catId}&page=${page}&per_page=${perPage}&status=publish&_fields=id,slug,link,title,modified_gmt`;
      let list;
      try {
        list = await fetchJson(listUrl);
      } catch (e) {
        if (e.message && e.message.includes("HTTP 400")) break;
        throw e;
      }
      if (!Array.isArray(list) || list.length === 0) break;

      for (const item of list) {
        if (!isCompendioPath(item.link)) continue;
        listed += 1;
        const id = String(item.id);
        const modifiedGmt = item.modified_gmt || "";
        const prev = cache.entriesById[id];
        const needsBody = !prev || prev.modifiedGmt !== modifiedGmt;

        const titlePlain = stripTitle(item.title?.rendered || item.slug || id);

        if (!needsBody) {
          cache.entriesById[id] = {
            ...prev,
            slug: item.slug,
            link: item.link,
            titlePlain,
            modifiedGmt,
          };
          continue;
        }

        let attempts = 0;
        while (attempts < 4) {
          try {
            const full = await fetchProductFull(item.id);
            const bodyHtml = full.content?.rendered || "";
            const bodyPlain = htmlToPlain(bodyHtml);
            cache.entriesById[id] = {
              id: item.id,
              slug: full.slug || item.slug,
              link: full.link || item.link,
              titlePlain: stripTitle(full.title?.rendered) || titlePlain,
              modifiedGmt: full.modified_gmt || modifiedGmt,
              bodyPlain,
            };
            fetchedFull += 1;
            break;
          } catch (err) {
            attempts += 1;
            if (err && err.status === 429) {
              await sleep(5000 * attempts);
              continue;
            }
            if (attempts >= 4) console.error(`Fallita voce ${id}:`, err);
            await sleep(1000 * attempts);
          }
        }

        if (delayMs > 0) await sleep(delayMs);
      }

      saveCache(cache);
      if (list.length < perPage) break;
      page += 1;
      if (delayMs > 0) await sleep(Math.min(delayMs, 250));
    }
  }

  const md = buildMarkdown(cache);
  fs.writeFileSync(OUT_MD, md, "utf-8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        compendioCategoryRoot: { id: root.id, slug: root.slug },
        categoriesScanned: catIds.length,
        compendioProductsSeen: listed,
        fullFetchesThisRun: fetchedFull,
        uniqueEntries: Object.keys(cache.entriesById).length,
        out: path.relative(ROOT, OUT_MD),
        cache: path.relative(ROOT, CACHE_PATH),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
