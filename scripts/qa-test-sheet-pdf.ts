import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { mapGeneratedSheetToPdfFields } from "@/lib/sheet-generator/sheet-mapper";
import {
  BACKGROUND_OPTIONS,
  CLASS_OPTIONS,
  RACE_OPTIONS,
  type RaceCatalogEntry,
} from "@/lib/character-build-catalog";
import type { CharacterGeneratorInput } from "@/lib/sheet-generator/types";

type CaseResult = {
  id: string;
  input: CharacterGeneratorInput;
  warnings: string[];
  metrics: {
    featuresMainLen: number;
    racialFeaturesLen: number;
    inventoryLen: number;
    spellRowsUsed: number;
    longestSpellSummaryLen: number;
    classFeaturesPresent: boolean;
    subclassFeaturesPresent: boolean;
    hasSpellDcWhenCaster: boolean;
    hasPositiveHp: boolean;
  };
  risks: string[];
  verdict: "good" | "acceptable" | "poor";
  pdfPath: string;
};

const outDir = path.join(process.cwd(), "docs", "qa-artifacts", "sheet-pdf");
const templatePath = path.join(process.cwd(), "dnd-manager", "public", "Scheda_Base.pdf");

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeName(i: number): string {
  const a = [
    "Arin",
    "Kael",
    "Mira",
    "Thorn",
    "Selene",
    "Brom",
    "Nyx",
    "Darian",
    "Lys",
    "Rurik",
    "Aelric",
    "Bran",
    "Caelan",
    "Dain",
    "Eldrin",
    "Faelar",
    "Garrick",
    "Hale",
    "Ivor",
    "Jareth",
    "Kieran",
    "Leoric",
    "Maelis",
    "Nerys",
    "Orin",
    "Perrin",
    "Quill",
    "Rowan",
    "Sylas",
    "Tamsin",
    "Ulric",
    "Varyn",
    "Wren",
    "Xander",
    "Ysolda",
    "Zephyr",
  ];
  const b = [
    "Alba",
    "Corvo",
    "Ferro",
    "Luna",
    "Bruma",
    "Vento",
    "Fiamma",
    "Sabbia",
    "Gelo",
    "Notte",
    "Aurora",
    "Pietranera",
    "Argento",
    "Quercia",
    "Roveto",
    "Tempesta",
    "Cenere",
    "Rugiada",
    "Lupo",
    "Falco",
    "Stella",
    "Abisso",
    "Ossidiana",
    "Miraggio",
    "Valleombra",
    "Roccaforte",
    "Marealto",
    "Cavaluce",
    "Giramonte",
    "Lungofiume",
    "Rosaspina",
    "Bramafredda",
    "Doramarea",
    "Cuorferro",
    "Nemboscuro",
    "Terralieve",
  ];
  return `${rnd(a)} ${rnd(b)} ${i + 1}`;
}

function pickSubrace(race: RaceCatalogEntry): string | null {
  if (!race.subraces?.length) return null;
  return Math.random() < 0.55 ? rnd(race.subraces).slug : null;
}

function getVerdict(risks: string[]): "good" | "acceptable" | "poor" {
  if (risks.length >= 3) return "poor";
  if (risks.length >= 1) return "acceptable";
  return "good";
}

function pushIf(risks: string[], cond: boolean, msg: string): void {
  if (cond) risks.push(msg);
}

async function compilePdf(fields: Record<string, unknown>, pdfPath: string): Promise<void> {
  const tpl = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(tpl);
  const form = pdfDoc.getForm();
  const byName = new Map(form.getFields().map((f) => [f.getName(), f]));
  const valueToString = (v: unknown) => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return JSON.stringify(v);
  };
  const isMarked = (value: string) => {
    const v = value.trim().toLowerCase();
    return v === "x" || v === "true" || v === "1" || v === "yes" || v === "on";
  };

  for (const [key, raw] of Object.entries(fields)) {
    const fld = byName.get(key);
    if (!fld) continue;
    const val = valueToString(raw);
    if ("check" in fld && typeof (fld as { check?: () => void }).check === "function") {
      if (isMarked(val)) {
        (fld as { check: () => void }).check();
      } else if ("uncheck" in fld && typeof (fld as { uncheck?: () => void }).uncheck === "function") {
        (fld as { uncheck: () => void }).uncheck();
      }
      continue;
    }
    if ("setText" in fld && typeof (fld as { setText?: (s: string) => void }).setText === "function") {
      (fld as { setText: (s: string) => void }).setText(val);
    }
  }

  form.updateFieldAppearances();
  fs.writeFileSync(pdfPath, Buffer.from(await pdfDoc.save()));
}

async function main() {
  const countArg = process.argv.find((a) => a.startsWith("--count="));
  const requestedCount = countArg ? Number.parseInt(countArg.split("=")[1] ?? "", 10) : 10;
  const sampleCount = Number.isFinite(requestedCount) && requestedCount > 0 ? requestedCount : 10;

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template non trovato: ${templatePath}`);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const used = new Set<string>();
  const cases: CharacterGeneratorInput[] = [];
  while (cases.length < sampleCount) {
    const race = rnd(RACE_OPTIONS);
    const cls = rnd(CLASS_OPTIONS);
    const bg = rnd(BACKGROUND_OPTIONS);
    const subrace = pickSubrace(race);
    const level = 1 + Math.floor(Math.random() * 20);
    const sig = `${race.slug}|${subrace ?? "-"}|${cls.label}|${bg.slug}|${level}`;
    if (used.has(sig)) continue;
    used.add(sig);
    cases.push({
      characterName: makeName(cases.length),
      raceSlug: race.slug,
      subraceSlug: subrace,
      classLabel: cls.label,
      classSubclass: null,
      backgroundSlug: bg.slug,
      level,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
    });
  }

  const results: CaseResult[] = [];

  for (let i = 0; i < cases.length; i += 1) {
    const input = cases[i];
    const built = await buildGeneratedCharacterSheet(input, null);
    const fields = mapGeneratedSheetToPdfFields(built.sheet);
    const spells = built.sheet.spells.filter((s) => s.level >= 1).slice(0, 20);
    const longestSpellSummaryLen = spells.reduce((m, s) => Math.max(m, s.summary.length), 0);

    const metrics = {
      featuresMainLen: String(fields.Features_Main ?? "").length,
      racialFeaturesLen: String(fields.Feat_Racial ?? "").length,
      inventoryLen: String(fields.Inventory ?? "").length,
      spellRowsUsed: spells.length,
      longestSpellSummaryLen,
      classFeaturesPresent: built.sheet.classFeaturesMd.trim().length > 0,
      subclassFeaturesPresent: (built.sheet.subclassFeaturesMd ?? "").trim().length > 0,
      hasSpellDcWhenCaster: built.sheet.spellcastingClass ? built.sheet.spellSaveDc != null : true,
      hasPositiveHp: built.sheet.hpMax > 0,
    };

    const risks: string[] = [];
    pushIf(risks, built.warnings.length > 0, `warnings:${built.warnings.join(" | ")}`);
    pushIf(risks, !metrics.classFeaturesPresent, "class-features-missing");
    pushIf(risks, !metrics.hasSpellDcWhenCaster, "spell-dc-missing-for-caster");
    pushIf(risks, !metrics.hasPositiveHp, "hp-invalid");
    // Heuristic readability checks: long text likely overflows PDF text boxes.
    pushIf(risks, metrics.featuresMainLen > 2200, `features-main-too-long:${metrics.featuresMainLen}`);
    pushIf(risks, metrics.racialFeaturesLen > 1400, `racial-features-too-long:${metrics.racialFeaturesLen}`);
    pushIf(risks, metrics.longestSpellSummaryLen > 120, `spell-summary-too-long:${metrics.longestSpellSummaryLen}`);

    const verdict = getVerdict(risks);
    const pdfPath = path.join(
      outDir,
      `case-${String(i + 1).padStart(3, "0")}-${input.characterName.replace(/\s+/g, "_")}.pdf`
    );
    await compilePdf(fields, pdfPath);

    results.push({
      id: `case-${String(i + 1).padStart(2, "0")}`,
      input,
      warnings: built.warnings,
      metrics,
      risks,
      verdict,
      pdfPath,
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    templatePath,
    total: results.length,
    sampleCount,
    verdicts: {
      good: results.filter((r) => r.verdict === "good").length,
      acceptable: results.filter((r) => r.verdict === "acceptable").length,
      poor: results.filter((r) => r.verdict === "poor").length,
    },
  };

  const reportPath = path.join(outDir, "qa-sheet-pdf-report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ summary, results }, null, 2));
  console.log(JSON.stringify({ summary, reportPath }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

