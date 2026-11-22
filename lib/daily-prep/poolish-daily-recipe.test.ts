import { describe, expect, it } from "vitest";

import { computeNalipoDailyPrep } from "./poolish-daily-recipe";
import {
  DAILY_PREP_ADJUSTMENT_LIMITS,
  DAILY_PREP_FLOUR_KG_MAX,
  DAILY_PREP_FLOUR_KG_MIN,
} from "@/types/daily-prep";

describe("computeNalipoDailyPrep", () => {
  it("matches NALIPO reference at 10 kg baseline", () => {
    const r = computeNalipoDailyPrep({ totalFlourKg: 10 });
    expect(r).not.toBeNull();
    expect(r!.dayBefore).toEqual({
      flourG: 3000,
      waterG: 3000,
      yeastG: 15,
    });
    expect(r!.dayOf).toEqual({
      flourG: 7000,
      firstWaterG: 3000,
      finishWaterG: 1000,
      yeastG: 15,
      saltG: 300,
    });
    expect(r!.applied.poolishPercentOfTotalFlour).toBe(30);
    expect(r!.applied.totalHydrationPercent).toBe(70);
    expect(r!.finishWaterRule.provisional).toBe(true);
  });

  it("scales proportionally at 5 kg", () => {
    const r = computeNalipoDailyPrep({ totalFlourKg: 5 });
    expect(r).not.toBeNull();
    expect(r!.dayBefore.flourG).toBe(1500);
    expect(r!.dayBefore.waterG).toBe(1500);
    expect(r!.dayBefore.yeastG).toBe(7.5);
    expect(r!.dayOf.flourG).toBe(3500);
    expect(r!.dayOf.firstWaterG).toBe(1500);
    expect(r!.dayOf.finishWaterG).toBe(500);
    expect(r!.dayOf.saltG).toBe(150);
  });

  it("finish water stays at 10% of total flour (provisional rule)", () => {
    const r = computeNalipoDailyPrep({ totalFlourKg: 8 });
    expect(r).not.toBeNull();
    expect(r!.dayOf.finishWaterG).toBe(800);
    expect(r!.dayOf.firstWaterG).toBe(2400);
    expect(r!.dayOf.firstWaterG + r!.dayOf.finishWaterG).toBe(3200);
    expect(r!.checks.mainWaterSplitMatches).toBe(true);
  });

  it("accepts in-range session adjustment without changing baseline constants", () => {
    const r = computeNalipoDailyPrep({
      totalFlourKg: 10,
      adjustment: {
        poolishPercentOfTotalFlour: 25,
        totalHydrationPercent: 65,
      },
    });
    expect(r).not.toBeNull();
    expect(r!.applied.poolishPercentOfTotalFlour).toBe(25);
    expect(r!.applied.totalHydrationPercent).toBe(65);
    expect(r!.checks.flourSumMatchesTotal).toBe(true);
    expect(r!.checks.waterSumMatchesTotalHydration).toBe(true);
  });

  it("rejects out-of-range flour kg and adjustments", () => {
    expect(computeNalipoDailyPrep({ totalFlourKg: 0 })).toBeNull();
    expect(computeNalipoDailyPrep({ totalFlourKg: 21 })).toBeNull();
    expect(computeNalipoDailyPrep({ totalFlourKg: 10.5 })).toBeNull();
    expect(
      computeNalipoDailyPrep({
        totalFlourKg: 10,
        adjustment: { poolishPercentOfTotalFlour: 15 },
      }),
    ).toBeNull();
    expect(
      computeNalipoDailyPrep({
        totalFlourKg: 10,
        adjustment: { totalHydrationPercent: 55 },
      }),
    ).toBeNull();
  });

  it("keeps positive first water at adjustment boundaries 40% / 60%", () => {
    const r = computeNalipoDailyPrep({
      totalFlourKg: 10,
      adjustment: {
        poolishPercentOfTotalFlour: 40,
        totalHydrationPercent: 60,
      },
    });
    expect(r).not.toBeNull();
    expect(r!.dayOf.firstWaterG).toBe(1000);
    expect(r!.dayOf.finishWaterG).toBe(1000);
    expect(r!.checks.allNonNegative).toBe(true);
  });

  it("accepts every integer kg from 1 to 20 with passing invariants", () => {
    for (let kg = DAILY_PREP_FLOUR_KG_MIN; kg <= DAILY_PREP_FLOUR_KG_MAX; kg++) {
      const r = computeNalipoDailyPrep({ totalFlourKg: kg });
      expect(r, `kg=${kg}`).not.toBeNull();
      expect(r!.checks.flourSumMatchesTotal).toBe(true);
      expect(r!.checks.waterSumMatchesTotalHydration).toBe(true);
      expect(r!.checks.mainWaterSplitMatches).toBe(true);
      expect(r!.checks.yeastSumMatchesTotal).toBe(true);
    }
  });

  it("honors adjustment limits at min and max", () => {
    const atMin = computeNalipoDailyPrep({
      totalFlourKg: 10,
      adjustment: {
        poolishPercentOfTotalFlour: DAILY_PREP_ADJUSTMENT_LIMITS.poolishPercentMin,
        totalHydrationPercent: DAILY_PREP_ADJUSTMENT_LIMITS.totalHydrationPercentMin,
      },
    });
    const atMax = computeNalipoDailyPrep({
      totalFlourKg: 10,
      adjustment: {
        poolishPercentOfTotalFlour: DAILY_PREP_ADJUSTMENT_LIMITS.poolishPercentMax,
        totalHydrationPercent: DAILY_PREP_ADJUSTMENT_LIMITS.totalHydrationPercentMax,
      },
    });
    expect(atMin).not.toBeNull();
    expect(atMax).not.toBeNull();
    expect(atMin!.checks.allNonNegative).toBe(true);
    expect(atMax!.checks.allNonNegative).toBe(true);
  });
});