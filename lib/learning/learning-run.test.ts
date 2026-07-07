import { describe, expect, it } from "vitest";

import {
  buildLearningRunFromQuickRecord,
  computeActualFrictionC,
  computeDdtErrorC,
  computeFrictionErrorC,
  createLearningRun,
  filterRunsByMixerKey,
  sortRunsByRecordedAt,
  takeRecentRuns,
  validateLearningRun,
} from "./learning-run";
import { createDefaultShopProfile } from "@/lib/profile/profile-storage";
import type { DieOutput } from "@/types/die";

const baseInput = {
  id: "run-1",
  shopId: "shop-1",
  mixerKey: "spiral:spiral-spiral-55",
  recordedAt: "2026-07-06T10:00:00.000Z",
  snapshot: { flourTempC: 20, waterTempC: 10, roomTempC: 26 },
  predictedFrictionC: 14,
  predictedDoughTempC: 24,
  actualDoughTempC: 25,
  targetDdtC: 24,
  craftsmanScore: 4 as const,
};

describe("learning-run", () => {
  it("validates and creates a learning run", () => {
    const validation = validateLearningRun(baseInput);
    expect(validation.valid).toBe(true);

    const run = createLearningRun(baseInput);
    expect(run.id).toBe("run-1");
  });

  it("rejects invalid craftsman score", () => {
    const validation = validateLearningRun({ ...baseInput, craftsmanScore: 6 as 4 });
    expect(validation.valid).toBe(false);
  });

  it("computes actual friction from dough temp snapshot", () => {
    // 25*4 - 20 - 10 - 26 = 44
    expect(computeActualFrictionC(25, baseInput.snapshot)).toBe(44);
  });

  it("computes friction error against prediction", () => {
    const run = createLearningRun(baseInput);
    expect(computeFrictionErrorC(run)).toBe(30);
  });

  it("computes ddt error when target is set", () => {
    const run = createLearningRun(baseInput);
    expect(computeDdtErrorC(run)).toBe(1);
  });

  it("filters and sorts runs", () => {
    const runs = [
      createLearningRun({ ...baseInput, id: "a", recordedAt: "2026-07-06T12:00:00.000Z" }),
      createLearningRun({
        ...baseInput,
        id: "b",
        mixerKey: "hand:",
        recordedAt: "2026-07-06T11:00:00.000Z",
      }),
    ];

    expect(filterRunsByMixerKey(runs, "spiral:spiral-spiral-55")).toHaveLength(1);
    expect(sortRunsByRecordedAt(runs)[0].id).toBe("b");
    expect(takeRecentRuns(sortRunsByRecordedAt(runs), 1)[0].id).toBe("a");
  });

  it("builds a learning run from quick mode output", () => {
    const profile = createDefaultShopProfile("Test");
    const output: DieOutput = {
      recipe: {
        flourG: 1000,
        waterG: 650,
        saltG: 25,
        yeastG: 2,
        totalDoughWeightG: 1677,
        hydrationPct: 65,
        saltPct: 2.5,
        yeastPct: 0.2,
      },
      temperature: {
        recommendedWaterTempC: 12,
        useIce: false,
        predictedDoughTempC: 24,
        targetDdtC: 24,
        ddtDeltaC: 0,
        frictionRiseC: 14,
      },
      yeastAdjustment: {
        adjustmentPct: 0,
        adjustedYeastPct: 0.2,
        reason: "test",
      },
      fermentationSchedule: {
        fermentationType: "cold",
        baseHours: 24,
        adjustedHours: 24,
        mixStartTime: "2026-07-06T10:00:00.000Z",
        useTime: "2026-07-07T10:00:00.000Z",
      },
      confidence: {
        level: "medium",
        estimatedFieldCount: 1,
        learningRunCount: 0,
      },
      resolvedInput: {
        temperature: { flourTempC: 20, waterTempC: null, targetDdtC: 24 },
        environment: {
          ambientTempC: 25,
          ambientHumidityPct: 50,
          shopRoomTempC: 26,
          shopHumidityPct: 50,
        },
        flour: {
          items: [],
          effectiveFlourTempC: 20,
          effectiveAbsorptionFactor: 1,
        },
        batch: { pizzaCount: 40, ballWeightG: 250, totalDoughWeightG: 10000 },
        mixer: {
          type: "spiral",
          modelId: "spiral-spiral-55",
          lowSpeedMin: 3,
          highSpeedMin: 8,
          lowRpm: 0,
          highRpm: 0,
          baseFrictionC: 14,
          manualFrictionOffsetC: 0,
          learnedFrictionOffsetC: 0,
          effectiveFrictionC: 14,
        },
        method: {
          method: "napoli",
          hydrationPct: 65,
          saltPct: 2.5,
          oilPct: 0,
        },
        yeast: { yeastType: "dry", yeastPct: 0.2 },
        fermentation: {
          fermentationType: "cold",
          fermentationHours: 24,
          roomTempDuringFermentC: 4,
        },
      },
    };

    const run = buildLearningRunFromQuickRecord({
      shopId: profile.id,
      profile,
      output,
      actualDoughTempC: 25.5,
      craftsmanScore: 4,
      memo: "good cornicione",
    });

    expect(run.actualDoughTempC).toBe(25.5);
    expect(run.craftsmanScore).toBe(4);
    expect(run.memo).toBe("good cornicione");
    expect(run.predictedFrictionC).toBe(14);
    expect(run.snapshot.waterTempC).toBe(12);
  });
});
