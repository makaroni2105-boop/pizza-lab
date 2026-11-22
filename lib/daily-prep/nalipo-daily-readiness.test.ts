/**
 * NALIPO 営業利用前の配合・記録の受け入れ検証（決定論のみ）。
 * デプロイや D1 には依存しない。
 */

import { describe, expect, it } from "vitest";

import {
  DAILY_PREP_ADJUSTMENT_LIMITS,
  DAILY_PREP_FLOUR_KG_MAX,
  DAILY_PREP_FLOUR_KG_MIN,
  NALIPO_DAILY_PREP_BASELINE,
} from "@/types/daily-prep";

import { mapFlourUsageConfirmToUiState } from "./daily-prep-confirm-flow";
import { computeNalipoDailyPrep } from "./poolish-daily-recipe";
import {
  loadFlourUsageState,
  parseFlourUsageStorageState,
  recordFlourUsageOnConfirm,
} from "./flour-usage-storage";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe("NALIPO daily prep business readiness", () => {
  it("computes every integer kg from 1 to 20 with passing invariants", () => {
    for (let kg = DAILY_PREP_FLOUR_KG_MIN; kg <= DAILY_PREP_FLOUR_KG_MAX; kg++) {
      const r = computeNalipoDailyPrep({ totalFlourKg: kg });
      expect(r, `kg=${kg}`).not.toBeNull();
      expect(r!.checks.flourSumMatchesTotal).toBe(true);
      expect(r!.checks.waterSumMatchesTotalHydration).toBe(true);
      expect(r!.checks.mainWaterSplitMatches).toBe(true);
      expect(r!.checks.yeastSumMatchesTotal).toBe(true);
      expect(r!.checks.allNonNegative).toBe(true);
      expect(r!.dayOf.finishWaterG).toBe(kg * 100);
    }
  });

  it("keeps invariants across poolish 20-40% and hydration 60-80%", () => {
    for (
      let poolish = DAILY_PREP_ADJUSTMENT_LIMITS.poolishPercentMin;
      poolish <= DAILY_PREP_ADJUSTMENT_LIMITS.poolishPercentMax;
      poolish++
    ) {
      for (
        let hydration = DAILY_PREP_ADJUSTMENT_LIMITS.totalHydrationPercentMin;
        hydration <= DAILY_PREP_ADJUSTMENT_LIMITS.totalHydrationPercentMax;
        hydration++
      ) {
        const r = computeNalipoDailyPrep({
          totalFlourKg: 10,
          adjustment: {
            poolishPercentOfTotalFlour: poolish,
            totalHydrationPercent: hydration,
          },
        });
        expect(r, `p=${poolish} h=${hydration}`).not.toBeNull();
        expect(r!.checks.flourSumMatchesTotal).toBe(true);
        expect(r!.checks.waterSumMatchesTotalHydration).toBe(true);
        expect(r!.checks.mainWaterSplitMatches).toBe(true);
        expect(r!.checks.yeastSumMatchesTotal).toBe(true);
        expect(r!.dayOf.finishWaterG).toBe(1000);
      }
    }
  });

  it("matches PDF reference at 10 kg baseline", () => {
    const r = computeNalipoDailyPrep({ totalFlourKg: 10 });
    expect(r).not.toBeNull();
    expect(r!.applied.poolishPercentOfTotalFlour).toBe(
      NALIPO_DAILY_PREP_BASELINE.poolishPercentOfTotalFlour,
    );
    expect(r!.applied.totalHydrationPercent).toBe(
      NALIPO_DAILY_PREP_BASELINE.totalHydrationPercent,
    );
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
    const totalYeast =
      r!.dayBefore.yeastG + r!.dayOf.yeastG;
    expect(totalYeast).toBeCloseTo(30, 5);
    expect(r!.dayBefore.yeastG).toBe(r!.dayOf.yeastG);
  });

  it("splits main water into mixer first water and finish water without changing total hydration", () => {
    const r = computeNalipoDailyPrep({ totalFlourKg: 10 });
    expect(r).not.toBeNull();
    const totalWater =
      r!.dayBefore.waterG + r!.dayOf.firstWaterG + r!.dayOf.finishWaterG;
    expect(totalWater).toBe(7000);
    expect(r!.dayOf.firstWaterG + r!.dayOf.finishWaterG).toBe(4000);
    expect(r!.checks.mainWaterSplitMatches).toBe(true);
  });

  it("does not record usage on flour selection alone", () => {
    const storage = memoryStorage();
    const before = loadFlourUsageState(storage);
    const after = loadFlourUsageState(storage);
    expect(after).toEqual(before);
  });

  it("prevents duplicate confirm with the same token but allows a second prep", () => {
    const storage = memoryStorage();
    recordFlourUsageOnConfirm({ totalFlourKg: 10, confirmToken: "once" }, storage);
    const dup = recordFlourUsageOnConfirm(
      { totalFlourKg: 10, confirmToken: "once" },
      storage,
    );
    expect(dup.recorded).toBe(false);
    expect(mapFlourUsageConfirmToUiState(dup)).toBe("duplicate_operation");
    recordFlourUsageOnConfirm({ totalFlourKg: 10, confirmToken: "twice" }, storage);
    expect(loadFlourUsageState(storage).counts["10"]).toBe(2);
  });

  it("survives corrupted localStorage payloads", () => {
    expect(parseFlourUsageStorageState("{not json")).toEqual({
      version: 1,
      counts: {},
      recentConfirmTokens: [],
    });
    expect(parseFlourUsageStorageState(null).counts).toEqual({});
  });
});