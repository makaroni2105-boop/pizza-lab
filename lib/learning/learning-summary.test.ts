import { describe, expect, it } from "vitest";

import { createLearningRun } from "./learning-run";
import {
  buildLearningSummariesByMixer,
  buildLearningSummaryResult,
  computeDdtCorrection,
  computeFrictionCorrection,
  computeRecommendationCorrection,
  toProfileLearningSummary,
} from "./learning-summary";
import type { LearningRun } from "./learning-types";

function makeRun(
  index: number,
  overrides: Partial<Parameters<typeof createLearningRun>[0]> = {},
): LearningRun {
  const actualDoughTempC = 24 + index * 0.1;

  return createLearningRun({
    id: `run-${index}`,
    shopId: "shop-1",
    mixerKey: "spiral:spiral-spiral-55",
    recordedAt: `2026-07-06T${String(index).padStart(2, "0")}:00:00.000Z`,
    snapshot: { flourTempC: 20, waterTempC: 10, roomTempC: 26 },
    predictedFrictionC: 14,
    predictedDoughTempC: 24,
    actualDoughTempC,
    targetDdtC: 24,
    craftsmanScore: (index % 5) + 1,
    ...overrides,
  });
}

describe("learning-summary", () => {
  it("returns zero friction offset below min run count", () => {
    const runs = [makeRun(1), makeRun(2), makeRun(3), makeRun(4)];
    const result = computeFrictionCorrection(runs);

    expect(result.offsetC).toBe(0);
    expect(result.isLearningComplete).toBe(false);
    expect(result.runCount).toBe(4);
  });

  it("computes mean friction offset at 5+ runs", () => {
    const runs = Array.from({ length: 5 }, (_, index) => makeRun(index + 1));
    const result = computeFrictionCorrection(runs);

    expect(result.isLearningComplete).toBe(true);
    expect(result.statistic).toBe("mean");
    expect(result.offsetC).toBeGreaterThan(0);
  });

  it("uses only recent window for friction correction", () => {
    const oldRuns = Array.from({ length: 10 }, (_, index) =>
      makeRun(index + 1, {
        snapshot: { flourTempC: 20, waterTempC: 10, roomTempC: 26 },
        actualDoughTempC: 24,
      }),
    );
    const newRun = makeRun(99, { actualDoughTempC: 30 });
    const allRuns = [...oldRuns, newRun];

    const full = computeFrictionCorrection(allRuns, { frictionWindowSize: 1 });
    const wide = computeFrictionCorrection(allRuns, { frictionWindowSize: 20 });

    expect(full.windowRunCount).toBe(1);
    expect(wide.windowRunCount).toBe(11);
  });

  it("computes median ddt correction", () => {
    const runs = [
      makeRun(1, { actualDoughTempC: 25, targetDdtC: 24 }),
      makeRun(2, { actualDoughTempC: 27, targetDdtC: 24 }),
      makeRun(3, { actualDoughTempC: 26, targetDdtC: 24 }),
      makeRun(4, { actualDoughTempC: 25, targetDdtC: 24 }),
      makeRun(5, { actualDoughTempC: 27, targetDdtC: 24 }),
    ];

    const result = computeDdtCorrection(runs);
    expect(result.isLearningComplete).toBe(true);
    expect(result.offsetC).toBe(2);
    expect(result.statistic).toBe("median");
  });

  it("aggregates recommendation correction from scores", () => {
    const runs = [
      makeRun(1, { craftsmanScore: 5 }),
      makeRun(2, { craftsmanScore: 3 }),
      makeRun(3, { craftsmanScore: 4 }),
      makeRun(4, { craftsmanScore: 2 }),
      makeRun(5, { craftsmanScore: 4 }),
    ];

    const result = computeRecommendationCorrection(runs);

    expect(result.scoredRunCount).toBe(5);
    expect(result.isLearningComplete).toBe(true);
    expect(result.scoreMean).toBe(3.6);
    expect(result.hundredPointMean).toBe(72);
  });

  it("builds profile-compatible learning summary", () => {
    const runs = Array.from({ length: 6 }, (_, index) => makeRun(index + 1));
    const summary = buildLearningSummaryResult("spiral:spiral-spiral-55", runs);
    const profileSummary = toProfileLearningSummary(summary);

    expect(summary.runCount).toBe(6);
    expect(summary.isLearningComplete).toBe(true);
    expect(profileSummary.mixerKey).toBe("spiral:spiral-spiral-55");
    expect(profileSummary.learnedFrictionOffset).toBe(summary.learnedFrictionOffset);
  });

  it("groups summaries by mixer key", () => {
    const runs = [
      makeRun(1),
      makeRun(2, { mixerKey: "hand:" }),
      makeRun(3),
    ];

    const summaries = buildLearningSummariesByMixer(runs);
    expect(summaries).toHaveLength(2);
  });
});
