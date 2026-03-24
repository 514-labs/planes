#!/usr/bin/env npx tsx
/**
 * Compare two or more benchmark report JSON files and produce a markdown report.
 *
 * Usage:
 *   pnpm report:compare reports/<baseline>.json reports/<candidate>.json
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import type { BenchmarkReport } from "./report-writer";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const fmt = (n: number) => n.toLocaleString("en-US");

const fmtBytes = (b: number) =>
  b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB`
  : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB`
  : b >= 1e3 ? `${(b / 1e3).toFixed(1)} KB`
  : `${b} B`;

const fmtMs = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;

const pct = (before: number, after: number) => {
  if (before === 0) return "N/A";
  const c = ((after - before) / before) * 100;
  return `${c > 0 ? "+" : ""}${c.toFixed(0)}%`;
};

const label = (db: string) => {
  const parts = db.split("-");
  return parts.length >= 4
    ? parts.slice(3, -1).join("-") || parts[parts.length - 1]
    : db;
};

// ---------------------------------------------------------------------------
// Report sections
// ---------------------------------------------------------------------------

function targetsSection(b: BenchmarkReport, c: BenchmarkReport, bL: string, cL: string) {
  return `## Targets
| | ${bL} | ${cL} |
|---|---|---|
| Database | \`${b.target.database}\` | \`${c.target.database}\` |
| Timestamp | ${b.timestamp} | ${c.timestamp} |`;
}

function checksumSection(bC: any, cC: any, bL: string, cL: string) {
  if (!bC || !cC) return "";
  const rowsMatch = bC.rows === cC.rows;
  const checksumMatch = bC.checksum === cC.checksum;
  const status = checksumMatch ? "MATCH" : rowsMatch ? "MISMATCH (same rows, different data)" : "MISMATCH (different row counts)";

  return `## Data Parity
| Metric | ${bL} | ${cL} | |
|--------|---|---|---|
| Rows | ${fmt(bC.rows)} | ${fmt(cC.rows)} | ${rowsMatch ? "match" : "**different**"} |
| Checksum | \`${bC.checksum}\` | \`${cC.checksum}\` | ${checksumMatch ? "match" : "**different**"} |
| Status | | | **${status}** |

${checksumMatch
    ? "> Data is identical. Performance differences are from schema changes only."
    : "> **Warning**: Data differs. Performance comparisons may not be meaningful."}`;
}

function explainSection(bE: any, cE: any, bL: string, cL: string) {
  if (!bE || !cE) return "";
  const skipStatus =
    cE.granuleSkipPct > bE.granuleSkipPct ? "improved"
    : cE.granuleSkipPct === bE.granuleSkipPct ? "—"
    : "regressed";

  return `## EXPLAIN
| Metric | ${bL} | ${cL} | Change |
|--------|---|---|---|
| Index condition | \`${bE.indexCondition}\` | \`${cE.indexCondition}\` | ${bE.indexCondition === cE.indexCondition ? "—" : "changed"} |
| Granules | ${bE.selectedGranules}/${bE.totalGranules} | ${cE.selectedGranules}/${cE.totalGranules} | ${pct(bE.selectedGranules, cE.selectedGranules)} granules read |
| Granule skip | ${bE.granuleSkipPct}% | ${cE.granuleSkipPct}% | ${skipStatus} |`;
}

function latencySection(bB: any, cB: any, bL: string, cL: string) {
  if (!bB || !cB) return "";
  return `## Server-Side Latency
| Metric | ${bL} | ${cL} | Change |
|--------|---|---|---|
| p50 | ${fmtMs(bB.p50)} | ${fmtMs(cB.p50)} | ${pct(bB.p50, cB.p50)} |
| p95 | ${fmtMs(bB.p95)} | ${fmtMs(cB.p95)} | ${pct(bB.p95, cB.p95)} |`;
}

function resourceSection(bP: any, cP: any, bL: string, cL: string) {
  if (!bP || !cP) return "";
  return `## Resource Usage (single run)
| Metric | ${bL} | ${cL} | Change |
|--------|---|---|---|
| Rows read | ${fmt(bP.readRows)} | ${fmt(cP.readRows)} | ${pct(bP.readRows, cP.readRows)} |
| Bytes read | ${fmtBytes(bP.readBytes)} | ${fmtBytes(cP.readBytes)} | ${pct(bP.readBytes, cP.readBytes)} |
| Memory | ${fmtBytes(bP.memoryUsage)} | ${fmtBytes(cP.memoryUsage)} | ${pct(bP.memoryUsage, cP.memoryUsage)} |`;
}

function sqlParitySection(bSql: string | undefined, cSql: string | undefined) {
  if (!bSql || !cSql) return "";
  return bSql === cSql
    ? "> SQL is identical across both reports. ✓"
    : "> **Warning**: SQL differs between reports. Comparison may not be apples-to-apples.";
}

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

function generateMarkdown(b: BenchmarkReport, c: BenchmarkReport, baseFile: string, candFile: string): string {
  const bL = label(b.target.database);
  const cL = label(c.target.database);

  const bB = b.tests.baseline as any;
  const cB = c.tests.baseline as any;

  const sections = [
    `# Benchmark Comparison: ${bL} vs ${cL}\nGenerated: ${new Date().toISOString()}`,
    targetsSection(b, c, bL, cL),
    sqlParitySection(bB?.sql, cB?.sql),
    checksumSection(b.tests.dataChecksum, c.tests.dataChecksum, bL, cL),
    explainSection((b.tests.explain as any)?.explain, (c.tests.explain as any)?.explain, bL, cL),
    latencySection(bB, cB, bL, cL),
    resourceSection(bB?.profiles?.[0], cB?.profiles?.[0], bL, cL),
    `---\nBaseline: \`${baseFile}\`\nCandidate: \`${candFile}\``,
  ].filter(Boolean);

  return sections.join("\n\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const [, , baselinePath, candidatePath] = process.argv;

  if (!baselinePath || !candidatePath) {
    console.error("Usage: pnpm report:compare <baseline.json> <candidate.json>");
    process.exit(1);
  }

  const [baseline, candidate] = await Promise.all([
    readFile(baselinePath, "utf-8").then((s) => JSON.parse(s) as BenchmarkReport),
    readFile(candidatePath, "utf-8").then((s) => JSON.parse(s) as BenchmarkReport),
  ]);

  const markdown = generateMarkdown(
    baseline,
    candidate,
    basename(baselinePath),
    basename(candidatePath),
  );

  const reportsDir = join(import.meta.dirname, "..", "reports");
  await mkdir(reportsDir, { recursive: true });

  const bL = label(baseline.target.database);
  const cL = label(candidate.target.database);
  const filename = `comparison-${bL}-vs-${cL}-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
  const filepath = join(reportsDir, filename);

  await writeFile(filepath, markdown);
  console.log(markdown);
  console.log(`\nReport saved to: ${filepath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
