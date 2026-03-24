#!/usr/bin/env npx tsx
/**
 * Compare two benchmark detail JSON files and produce a markdown report.
 *
 * Usage:
 *   pnpm compare reports/<baseline>.json reports/<candidate>.json
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import type { ProfileResult, ExplainResult } from "./clickhouse-diagnostics";

interface FilterVariant {
  sql: string;
  p50: number;
  p95: number;
  baselineP95: number;
  ratio: number;
  profiles: ProfileResult[];
}

interface Report {
  timestamp: string;
  target: { host: string; database: string };
  tests: {
    baseline?: { sql: string; p50: number; p95: number; profiles: ProfileResult[] };
    filterRegression?: Record<string, FilterVariant>;
    explainCategoryFilter?: { sql: string; explain: ExplainResult };
    concurrentBurst?: { concurrency: number; errors: number; errorRate: number };
  };
}

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
// Report sections — each returns markdown string or empty string
// ---------------------------------------------------------------------------

function targetsSection(b: Report, c: Report, bL: string, cL: string) {
  return `## Targets
| | ${bL} | ${cL} |
|---|---|---|
| Database | \`${b.target.database}\` | \`${c.target.database}\` |
| Timestamp | ${b.timestamp} | ${c.timestamp} |`;
}

function explainSection(bE: ExplainResult, cE: ExplainResult, bL: string, cL: string) {
  const skipStatus =
    cE.granuleSkipPct > bE.granuleSkipPct ? "improved"
    : cE.granuleSkipPct === bE.granuleSkipPct ? "—"
    : "regressed";

  return `## EXPLAIN: Category Filter
| Metric | ${bL} | ${cL} | Change |
|--------|---|---|---|
| Index condition | \`${bE.indexCondition}\` | \`${cE.indexCondition}\` | ${bE.indexCondition === cE.indexCondition ? "—" : "changed"} |
| Granules | ${bE.selectedGranules}/${bE.totalGranules} | ${cE.selectedGranules}/${cE.totalGranules} | ${pct(bE.selectedGranules, cE.selectedGranules)} granules read |
| Granule skip | ${bE.granuleSkipPct}% | ${cE.granuleSkipPct}% | ${skipStatus} |`;
}

function latencySection(
  bB: { p50: number; p95: number },
  cB: { p50: number; p95: number },
  bL: string,
  cL: string,
) {
  return `## Server-Side Latency: Baseline Query
| Metric | ${bL} | ${cL} | Change |
|--------|---|---|---|
| p50 | ${fmtMs(bB.p50)} | ${fmtMs(cB.p50)} | ${pct(bB.p50, cB.p50)} |
| p95 | ${fmtMs(bB.p95)} | ${fmtMs(cB.p95)} | ${pct(bB.p95, cB.p95)} |`;
}

function resourceSection(bP: ProfileResult, cP: ProfileResult, bL: string, cL: string) {
  return `## Resource Usage: Baseline Query (single run)
| Metric | ${bL} | ${cL} | Change |
|--------|---|---|---|
| Rows read | ${fmt(bP.readRows)} | ${fmt(cP.readRows)} | ${pct(bP.readRows, cP.readRows)} |
| Bytes read | ${fmtBytes(bP.readBytes)} | ${fmtBytes(cP.readBytes)} | ${pct(bP.readBytes, cP.readBytes)} |
| Memory | ${fmtBytes(bP.memoryUsage)} | ${fmtBytes(cP.memoryUsage)} | ${pct(bP.memoryUsage, cP.memoryUsage)} |
| Disk read | ${fmt(bP.diskReadUs)}µs | ${fmt(cP.diskReadUs)}µs | ${pct(bP.diskReadUs, cP.diskReadUs)} |`;
}

function filterSection(
  bF: Record<string, FilterVariant>,
  cF: Record<string, FilterVariant>,
  bL: string,
  cL: string,
) {
  const rows = Object.keys(bF)
    .filter((name) => bF[name] && cF[name])
    .map((name) => `| ${name} | ${fmtMs(bF[name].p95)} | ${fmtMs(cF[name].p95)} | ${pct(bF[name].p95, cF[name].p95)} |`)
    .join("\n");

  return `## Filter Variants
| Variant | ${bL} p95 | ${cL} p95 | Change |
|---------|---|---|---|
${rows}`;
}

function concurrentSection(
  bBurst: { concurrency: number; errors: number },
  cBurst: { concurrency: number; errors: number },
  bL: string,
  cL: string,
) {
  return `## Concurrent Load
| Metric | ${bL} | ${cL} |
|--------|---|---|
| Concurrency | ${bBurst.concurrency} | ${cBurst.concurrency} |
| Errors | ${bBurst.errors} | ${cBurst.errors} |`;
}

function rawSamplesSection(
  bProfiles: ProfileResult[],
  cProfiles: ProfileResult[],
  bL: string,
  cL: string,
) {
  return `<details><summary>Raw timing samples (server-side ms)</summary>

**${bL}**: ${bProfiles.map((p) => p.durationMs).join(", ")}

**${cL}**: ${cProfiles.map((p) => p.durationMs).join(", ")}

</details>`;
}

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

function generateMarkdown(b: Report, c: Report, baseFile: string, candFile: string): string {
  const bL = label(b.target.database);
  const cL = label(c.target.database);

  const sections = [
    `# Benchmark Comparison: ${bL} vs ${cL}\nGenerated: ${new Date().toISOString()}`,
    targetsSection(b, c, bL, cL),
  ];

  const bE = b.tests.explainCategoryFilter?.explain;
  const cE = c.tests.explainCategoryFilter?.explain;
  if (bE && cE) sections.push(explainSection(bE, cE, bL, cL));

  const bB = b.tests.baseline;
  const cB = c.tests.baseline;
  if (bB && cB) sections.push(latencySection(bB, cB, bL, cL));

  const bP = bB?.profiles[0];
  const cP = cB?.profiles[0];
  if (bP && cP) sections.push(resourceSection(bP, cP, bL, cL));

  const bF = b.tests.filterRegression;
  const cF = c.tests.filterRegression;
  if (bF && cF) sections.push(filterSection(bF, cF, bL, cL));

  const bBurst = b.tests.concurrentBurst;
  const cBurst = c.tests.concurrentBurst;
  if (bBurst && cBurst) sections.push(concurrentSection(bBurst, cBurst, bL, cL));

  if (bB && cB) sections.push(rawSamplesSection(bB.profiles, cB.profiles, bL, cL));

  sections.push(`---\nBaseline report: \`${baseFile}\`\nCandidate report: \`${candFile}\``);

  return sections.join("\n\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const [, , baselinePath, candidatePath] = process.argv;

  if (!baselinePath || !candidatePath) {
    console.error("Usage: pnpm compare <baseline.json> <candidate.json>");
    process.exit(1);
  }

  const [baseline, candidate]: Report[] = await Promise.all([
    readFile(baselinePath, "utf-8").then((s) => JSON.parse(s)),
    readFile(candidatePath, "utf-8").then((s) => JSON.parse(s)),
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
