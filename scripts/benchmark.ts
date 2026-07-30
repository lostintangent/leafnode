import { createIdFactory, parseDocument, reconcile, type JsonNode } from "../src/document";
import {
  arrayInsertionJson,
  arrayJson,
  largeJson,
  mediumJson,
  sparseChangeJson,
} from "./benchmark-fixtures";

type Scenario = {
  readonly budgetP99Us: number;
  readonly iterations: number;
  readonly name: string;
  readonly run: () => number;
};

const samplesPerSuite = 20;
let sink = 0;

const largeBefore = parseFixture(largeJson);
const largeUnchanged = parseFixture(largeJson);
const sparseChange = parseFixture(sparseChangeJson);
const arrayBefore = parseFixture(arrayJson);
const arrayInsertion = parseFixture(arrayInsertionJson);

const scenarios: readonly Scenario[] = [
  {
    name: "parse medium",
    iterations: 12,
    budgetP99Us: 5_000,
    run: () => parseFixture(mediumJson).id.length,
  },
  {
    name: "parse large",
    iterations: 2,
    budgetP99Us: 50_000,
    run: () => parseFixture(largeJson).id.length,
  },
  {
    name: "reconcile unchanged",
    iterations: 4,
    budgetP99Us: 25_000,
    run: () => reconcile(largeBefore, largeUnchanged).diff.size,
  },
  {
    name: "reconcile sparse change",
    iterations: 3,
    budgetP99Us: 30_000,
    run: () => reconcile(largeBefore, sparseChange).diff.size,
  },
  {
    name: "reconcile array insertion",
    iterations: 2,
    budgetP99Us: 50_000,
    run: () => reconcile(arrayBefore, arrayInsertion).diff.size,
  },
];

runSuite();

const measuredSuites = Array.from({ length: 3 }, runSuite);
const rows = scenarios.map((scenario, scenarioIndex) => {
  const samples = measuredSuites.flatMap((suite) => suite[scenarioIndex] ?? []);
  const failedSuites = measuredSuites.filter(
    (suite) => percentile(suite[scenarioIndex] ?? [], 0.99) > scenario.budgetP99Us,
  ).length;
  return {
    scenario: scenario.name,
    "p50 (µs)": round(percentile(samples, 0.5)),
    "p95 (µs)": round(percentile(samples, 0.95)),
    "p99 (µs)": round(percentile(samples, 0.99)),
    "budget (µs)": scenario.budgetP99Us,
    "failed suites": failedSuites,
  };
});

console.table(rows);

const regressions = rows.filter((row) => row["failed suites"] >= 2);
if (regressions.length > 0) {
  throw new Error(
    `Performance budget exceeded repeatedly: ${regressions.map((row) => row.scenario).join(", ")}`,
  );
}

if (!Number.isFinite(sink)) throw new Error("Benchmark produced an invalid result.");

function runSuite(): number[][] {
  return scenarios.map((scenario) => {
    const samples: number[] = [];
    for (let sample = 0; sample < samplesPerSuite; sample += 1) {
      const start = Bun.nanoseconds();
      for (let iteration = 0; iteration < scenario.iterations; iteration += 1) {
        sink += scenario.run();
      }
      const elapsedUs = (Bun.nanoseconds() - start) / 1_000 / scenario.iterations;
      samples.push(elapsedUs);
    }
    return samples;
  });
}

function parseFixture(source: string): JsonNode {
  const result = parseDocument(source, createIdFactory());
  if (!result.ok) throw new Error(result.error);
  return result.root;
}

function percentile(samples: readonly number[], quantile: number): number {
  if (samples.length === 0) return Number.POSITIVE_INFINITY;
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.ceil(quantile * sorted.length) - 1] ?? sorted.at(-1) ?? 0;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
