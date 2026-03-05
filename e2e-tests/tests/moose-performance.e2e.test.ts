import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";

const BASE_URL = process.env.MOOSE_BASE_URL ?? "http://localhost:4000";
const ENDPOINT = `${BASE_URL}/aircraft/api/aircraftSpeedAltitudeByType`;

const numberEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const config = {
  baselineRuns: numberEnv("PERF_BASELINE_RUNS", 12),
  filterRuns: numberEnv("PERF_FILTER_RUNS", 6),
  warmRuns: numberEnv("PERF_WARM_RUNS", 8),
  concurrency: numberEnv("PERF_CONCURRENCY", 10),
  maxBaselineP95Ms: numberEnv("PERF_MAX_BASELINE_P95_MS", 3000),
  maxFilterToBaselineMultiplier: numberEnv("PERF_MAX_FILTER_TO_BASELINE_MULTIPLIER", 2.5),
  maxWarmToColdMultiplier: numberEnv("PERF_MAX_WARM_TO_COLD_MULTIPLIER", 2),
  maxConcurrentErrorRate: numberEnv("PERF_MAX_CONCURRENT_ERROR_RATE", 0),
  maxConcurrentP95Ms: numberEnv("PERF_MAX_CONCURRENT_P95_MS", 4000),
};

type TimedResponse = {
  durationMs: number;
  ok: boolean;
  status: number;
};

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
};

const timedRequest = async (params?: Record<string, string>): Promise<TimedResponse> => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  const start = performance.now();
  const response = await fetch(`${ENDPOINT}${query}`);
  const end = performance.now();

  return {
    durationMs: end - start,
    ok: response.ok,
    status: response.status,
  };
};

const runSequentialSamples = async (
  runs: number,
  params?: Record<string, string>,
): Promise<TimedResponse[]> => {
  const samples: TimedResponse[] = [];
  for (let i = 0; i < runs; i += 1) {
    samples.push(await timedRequest(params));
  }
  return samples;
};

describe("Moose performance sanity checks", () => {
  let baselineP95Ms = 0;

  it("baseline endpoint latency stays in budget", async () => {
    const samples = await runSequentialSamples(config.baselineRuns);
    const failed = samples.filter((s) => !s.ok);
    expect(failed, `Unexpected non-200 responses: ${JSON.stringify(failed)}`).toHaveLength(0);

    baselineP95Ms = percentile(samples.map((s) => s.durationMs), 95);
    expect(baselineP95Ms).toBeLessThanOrEqual(config.maxBaselineP95Ms);
  });

  it("common filter variants do not regress badly vs baseline", async () => {
    expect(baselineP95Ms).toBeGreaterThan(0);

    const variants: Array<Record<string, string>> = [
      { category: "A3" },
      { minAltitude: "10000", maxAltitude: "30000" },
      { minSpeed: "200", maxSpeed: "500" },
      { category: "A3", minAltitude: "10000", maxAltitude: "30000", minSpeed: "200", maxSpeed: "500" },
    ];

    for (const variant of variants) {
      const samples = await runSequentialSamples(config.filterRuns, variant);
      const failed = samples.filter((s) => !s.ok);
      expect(failed, `Unexpected non-200 for filters ${JSON.stringify(variant)}`).toHaveLength(0);

      const p95 = percentile(samples.map((s) => s.durationMs), 95);
      expect(
        p95,
        `Filter variant ${JSON.stringify(variant)} had p95 ${p95.toFixed(1)}ms vs baseline ${baselineP95Ms.toFixed(1)}ms`,
      ).toBeLessThanOrEqual(baselineP95Ms * config.maxFilterToBaselineMultiplier);
    }
  });

  it("warm requests are not dramatically slower than first request", async () => {
    const cold = await timedRequest();
    expect(cold.ok, `Cold request failed with status ${cold.status}`).toBe(true);

    const warmSamples = await runSequentialSamples(config.warmRuns);
    const failed = warmSamples.filter((s) => !s.ok);
    expect(failed).toHaveLength(0);

    const warmP95Ms = percentile(warmSamples.map((s) => s.durationMs), 95);
    const coldBudget = Math.max(cold.durationMs, 50) * config.maxWarmToColdMultiplier;
    expect(warmP95Ms).toBeLessThanOrEqual(coldBudget);
  });

  it("handles concurrent request burst without errors", async () => {
    const burstResults = await Promise.all(
      Array.from({ length: config.concurrency }, () => timedRequest()),
    );

    const errors = burstResults.filter((r) => !r.ok).length;
    const errorRate = errors / burstResults.length;
    expect(errorRate).toBeLessThanOrEqual(config.maxConcurrentErrorRate);

    const okDurations = burstResults.filter((r) => r.ok).map((r) => r.durationMs);
    const p95 = percentile(okDurations, 95);
    expect(p95).toBeLessThanOrEqual(config.maxConcurrentP95Ms);
  });
});
