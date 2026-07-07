import { describe, expect, it } from "vitest";

import {
  aggregateCraftsmanScores,
  computeBiasFromNeutral,
  computeHundredPointMean,
  hundredPointToScore,
  isCraftsmanScore,
  scoreToHundredPoint,
} from "./learning-score";
import type { LearningRun } from "./learning-types";

function runWithScore(score: number, id: string): LearningRun {
  return {
    id,
    shopId: "shop-1",
    mixerKey: "spiral:spiral-spiral-55",
    recordedAt: `2026-07-06T10:0${id}:00.000Z`,
    snapshot: { flourTempC: 20, waterTempC: 10, roomTempC: 26 },
    predictedFrictionC: 14,
    predictedDoughTempC: 24,
    actualDoughTempC: 25,
    targetDdtC: 24,
    craftsmanScore: score as LearningRun["craftsmanScore"],
  };
}

describe("learning-score", () => {
  it("validates craftsman score 1-5", () => {
    expect(isCraftsmanScore(1)).toBe(true);
    expect(isCraftsmanScore(5)).toBe(true);
    expect(isCraftsmanScore(0)).toBe(false);
    expect(isCraftsmanScore(6)).toBe(false);
    expect(isCraftsmanScore(3.5)).toBe(false);
  });

  it("maps score to hundred point scale", () => {
    expect(scoreToHundredPoint(1)).toBe(20);
    expect(scoreToHundredPoint(5)).toBe(100);
    expect(hundredPointToScore(100)).toBe(5);
  });

  it("aggregates scores with mean and median", () => {
    const runs = [runWithScore(5, "1"), runWithScore(3, "2"), runWithScore(4, "3")];
    const aggregate = aggregateCraftsmanScores(runs);

    expect(aggregate.count).toBe(3);
    expect(aggregate.mean).toBe(4);
    expect(aggregate.median).toBe(4);
  });

  it("computes hundred point mean and neutral bias", () => {
    const runs = [runWithScore(5, "1"), runWithScore(1, "2")];

    expect(computeHundredPointMean(runs)).toBe(60);
    expect(computeBiasFromNeutral(runs)).toBe(0);
  });

  it("returns zero bias when no scores", () => {
    const runs = [runWithScore(5, "1")];
    delete runs[0].craftsmanScore;

    expect(computeBiasFromNeutral(runs)).toBe(0);
    expect(computeHundredPointMean(runs)).toBeNull();
  });
});
