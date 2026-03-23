/**
 * HTTP connection timing diagnostics.
 * Measures DNS, TCP, TLS, and time-to-first-byte for ClickHouse HTTP requests.
 * Used to diagnose latency spikes in the network/proxy layer.
 */

import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";

export interface ConnectionTiming {
  dnsMs: number;
  tcpMs: number;
  tlsMs: number;
  requestMs: number;
  firstByteMs: number;
  totalMs: number;
  statusCode: number;
  bodyLength: number;
}

/**
 * Execute a ClickHouse query via raw HTTP and capture connection-level timing.
 * Bypasses the ClickHouse client to measure DNS, TCP, TLS, and TTFB independently.
 */
export function timedHttpQuery(opts: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  query: string;
  ssl: boolean;
}): Promise<ConnectionTiming> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    let dnsTime = 0;
    let tcpTime = 0;
    let tlsTime = 0;
    let requestTime = 0;
    let firstByteTime = 0;

    const url = new URL(
      `${opts.ssl ? "https" : "http"}://${opts.host}:${opts.port}`,
    );

    const reqFn = opts.ssl ? httpsRequest : httpRequest;

    const req = reqFn(
      {
        hostname: url.hostname,
        port: url.port,
        path: `/?database=${encodeURIComponent(opts.database)}&default_format=JSONEachRow`,
        method: "POST",
        agent: false,
        headers: {
          "Content-Type": "text/plain",
          Authorization:
            "Basic " +
            Buffer.from(`${opts.user}:${opts.password}`).toString("base64"),
        },
      },
      (res) => {
        firstByteTime = performance.now() - start;

        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const totalTime = performance.now() - start;
          resolve({
            dnsMs: dnsTime,
            tcpMs: tcpTime,
            tlsMs: tlsTime,
            requestMs: requestTime,
            firstByteMs: firstByteTime,
            totalMs: totalTime,
            statusCode: res.statusCode ?? 0,
            bodyLength: Buffer.concat(chunks).length,
          });
        });
      },
    );

    req.on("socket", (socket) => {
      socket.on("lookup", () => {
        dnsTime = performance.now() - start;
      });
      socket.on("connect", () => {
        tcpTime = performance.now() - start;
      });
      socket.on("secureConnect", () => {
        tlsTime = performance.now() - start;
      });
    });

    req.on("error", reject);

    requestTime = performance.now() - start;
    req.write(opts.query);
    req.end();
  });
}

/**
 * Run multiple timed HTTP queries and identify which phase caused any spike.
 */
export async function diagnoseConnectionSpike(
  opts: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    query: string;
    ssl: boolean;
  },
  runs: number = 6,
): Promise<{
  timings: ConnectionTiming[];
  fastest: ConnectionTiming;
  slowest: ConnectionTiming;
  spikeDetected: boolean;
  spikePhase: string | null;
}> {
  const timings: ConnectionTiming[] = [];
  for (let i = 0; i < runs; i++) {
    timings.push(await timedHttpQuery(opts));
  }

  const sorted = [...timings].sort((a, b) => a.totalMs - b.totalMs);
  const fastest = sorted[0];
  const slowest = sorted[sorted.length - 1];
  const spikeDetected = slowest.totalMs > fastest.totalMs * 10;

  let spikePhase: string | null = null;
  if (spikeDetected) {
    const phases = [
      { name: "DNS", fast: fastest.dnsMs, slow: slowest.dnsMs },
      {
        name: "TCP",
        fast: fastest.tcpMs - fastest.dnsMs,
        slow: slowest.tcpMs - slowest.dnsMs,
      },
      {
        name: "TLS",
        fast: fastest.tlsMs - fastest.tcpMs,
        slow: slowest.tlsMs - slowest.tcpMs,
      },
      {
        name: "Server processing (TTFB)",
        fast: fastest.firstByteMs - (fastest.tlsMs || fastest.tcpMs),
        slow: slowest.firstByteMs - (slowest.tlsMs || slowest.tcpMs),
      },
      {
        name: "Response transfer",
        fast: fastest.totalMs - fastest.firstByteMs,
        slow: slowest.totalMs - slowest.firstByteMs,
      },
    ];

    let maxDelta = 0;
    for (const phase of phases) {
      const delta = phase.slow - phase.fast;
      if (delta > maxDelta) {
        maxDelta = delta;
        spikePhase = phase.name;
      }
    }
  }

  return { timings, fastest, slowest, spikeDetected, spikePhase };
}
