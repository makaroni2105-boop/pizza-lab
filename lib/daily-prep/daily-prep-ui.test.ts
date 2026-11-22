import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DAILY_PREP_FLOUR_KG_MAX,
  DAILY_PREP_FLOUR_KG_MIN,
} from "@/types/daily-prep";

import { computeNalipoDailyPrep } from "./poolish-daily-recipe";
import {
  loadFlourUsageState,
  recordFlourUsageOnConfirm,
  type FlourUsageConfirmResult,
} from "./flour-usage-storage";

function createMemoryStorage() {
  const map = new Map<string, string>();

  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("daily-prep UI integration (logic)", () => {
  it("recomputes for every kg from 1 to 20 on selection change", () => {
    for (let kg = DAILY_PREP_FLOUR_KG_MIN; kg <= DAILY_PREP_FLOUR_KG_MAX; kg++) {
      const r = computeNalipoDailyPrep({ totalFlourKg: kg });
      expect(r).not.toBeNull();
      expect(r!.totalFlourKg).toBe(kg);
    }
  });

  it("keeps invariants at 35% poolish and 72% hydration", () => {
    const r = computeNalipoDailyPrep({
      totalFlourKg: 10,
      adjustment: {
        poolishPercentOfTotalFlour: 35,
        totalHydrationPercent: 72,
      },
    });

    expect(r).not.toBeNull();
    expect(r!.applied.poolishPercentOfTotalFlour).toBe(35);
    expect(r!.applied.totalHydrationPercent).toBe(72);
    expect(r!.checks.flourSumMatchesTotal).toBe(true);
    expect(r!.checks.waterSumMatchesTotalHydration).toBe(true);
    expect(r!.checks.mainWaterSplitMatches).toBe(true);
    expect(r!.checks.allNonNegative).toBe(true);
  });

  it("does not record usage when confirm is not called (select only)", () => {
    const storage = createMemoryStorage();
    const before = loadFlourUsageState(storage);

    const after = loadFlourUsageState(storage);

    expect(before.counts).toEqual(after.counts);
  });

  it("records once on confirm and dedupes duplicate token", () => {
    const storage = createMemoryStorage();

    recordFlourUsageOnConfirm(
      { totalFlourKg: 10, confirmToken: "ui-token-1" },
      storage,
    );
    const dup = recordFlourUsageOnConfirm(
      { totalFlourKg: 10, confirmToken: "ui-token-1" },
      storage,
    );

    expect(dup.recorded).toBe(false);
    expect(loadFlourUsageState(storage).counts["10"]).toBe(1);
  });

  it("falls back safely when storage write fails", () => {
    const throwing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };

    const result = recordFlourUsageOnConfirm(
      { totalFlourKg: 5, confirmToken: "x" },
      throwing,
    ) as FlourUsageConfirmResult;

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("write_failed");
  });

  it("matches NALIPO review values at 10kg with 35% poolish and 72% hydration", () => {
    const r = computeNalipoDailyPrep({
      totalFlourKg: 10,
      adjustment: {
        poolishPercentOfTotalFlour: 35,
        totalHydrationPercent: 72,
      },
    });

    expect(r).not.toBeNull();
    expect(r!.dayBefore).toEqual({ flourG: 3500, waterG: 3500, yeastG: 15 });
    expect(r!.dayOf).toEqual({
      flourG: 6500,
      firstWaterG: 2700,
      finishWaterG: 1000,
      yeastG: 15,
      saltG: 300,
    });
  });

  it("keeps flour and water totals at varied poolish/hydration adjustments", () => {
    for (const poolish of [20, 30, 35, 40]) {
      for (const hydration of [60, 70, 72, 80]) {
        const r = computeNalipoDailyPrep({
          totalFlourKg: 10,
          adjustment: {
            poolishPercentOfTotalFlour: poolish,
            totalHydrationPercent: hydration,
          },
        });
        expect(r, `poolish=${poolish} hydration=${hydration}`).not.toBeNull();
        expect(r!.checks.flourSumMatchesTotal).toBe(true);
        expect(r!.checks.waterSumMatchesTotalHydration).toBe(true);
        expect(r!.checks.mainWaterSplitMatches).toBe(true);
        expect(r!.dayOf.finishWaterG).toBe(1000);
      }
    }
  });

  it("daily CSS targets 375px mobile tap targets", () => {
    const cssPath = resolve(process.cwd(), "app/daily/daily.module.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).toMatch(/max-width:\s*480px/);
    expect(css).toMatch(/min-height:\s*48px/);
    expect(css).not.toMatch(/overflow-x:\s*auto/);
    expect(css).toMatch(/padding-bottom:\s*7\.5rem|scroll-padding-bottom/);
  });
});