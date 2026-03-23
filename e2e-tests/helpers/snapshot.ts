/**
 * Query result snapshot helpers for correctness validation.
 * Save a known-good result set, then compare against it on future runs.
 */

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const SNAPSHOTS_DIR = join(import.meta.dirname, "..", "snapshots");

function hashResultSet(rows: unknown[]): string {
  const sorted = rows
    .map((r) =>
      JSON.stringify(r, typeof r === "object" && r ? Object.keys(r).sort() : undefined),
    )
    .sort();
  return createHash("sha256").update(sorted.join("\n")).digest("hex");
}

export async function saveSnapshot(
  name: string,
  rows: unknown[],
): Promise<string> {
  await mkdir(SNAPSHOTS_DIR, { recursive: true });
  const snapshot = {
    name,
    savedAt: new Date().toISOString(),
    rowCount: rows.length,
    hash: hashResultSet(rows),
    rows,
  };
  const filepath = join(SNAPSHOTS_DIR, `${name}.json`);
  await writeFile(filepath, JSON.stringify(snapshot, null, 2));
  return filepath;
}

export interface SnapshotComparison {
  match: boolean;
  expectedHash: string;
  actualHash: string;
  expectedRowCount: number;
  actualRowCount: number;
}

export async function compareSnapshot(
  name: string,
  rows: unknown[],
): Promise<SnapshotComparison> {
  const filepath = join(SNAPSHOTS_DIR, `${name}.json`);
  const snapshot: { hash: string; rowCount: number } = JSON.parse(
    await readFile(filepath, "utf-8"),
  );

  const actualHash = hashResultSet(rows);

  return {
    match: snapshot.hash === actualHash,
    expectedHash: snapshot.hash,
    actualHash,
    expectedRowCount: snapshot.rowCount,
    actualRowCount: rows.length,
  };
}
