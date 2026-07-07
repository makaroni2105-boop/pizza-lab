import { describe, expect, it } from "vitest";

import {
  computeBakersPercent,
  computeBakersPercentOutcome,
  computeFlourFromWater,
  computeFromFlourWeight,
  computeFromTotalDough,
  computeWaterFromFlour,
  sumBakersPercentWeightG,
} from "./bakers-percent";
import { parseCalculatorNumber } from "./calculator-types";

describe("bakers-percent", () => {
  it("parseCalculatorNumber rejects empty and invalid values", () => {
    expect(parseCalculatorNumber("")).toBeNull();
    expect(parseCalculatorNumber("abc")).toBeNull();
    expect(parseCalculatorNumber("62")).toBe(62);
    expect(parseCalculatorNumber(" 2.5 ")).toBe(2.5);
  });

  it("computes from total dough weight", () => {
    const result = computeFromTotalDough({
      mode: "total_dough",
      totalDoughWeightG: 10000,
      hydrationPercent: 65,
      saltPercent: 2.5,
      yeastPercent: 0.2,
      oilPercent: 0,
    });

    expect(result).not.toBeNull();
    expect(result!.totalDoughWeightG).toBe(10000);
    expect(result!.flourG).toBe(5963);
    expect(result!.waterG).toBe(3876);
    expect(sumBakersPercentWeightG(result!)).toBeCloseTo(10000, 0);
  });

  it("computes from ball count and ball weight", () => {
    const result = computeFromTotalDough({
      mode: "total_dough",
      ballWeightG: 250,
      ballCount: 40,
      hydrationPercent: 65,
      saltPercent: 2.5,
      yeastPercent: 0.2,
      oilPercent: 0,
    });

    expect(result!.totalDoughWeightG).toBe(10000);
    expect(result!.flourG).toBe(5963);
  });

  it("computes from flour weight", () => {
    const result = computeFromFlourWeight({
      mode: "flour_weight",
      flourWeightG: 1000,
      hydrationPercent: 60,
      saltPercent: 2,
      yeastPercent: 0.3,
      oilPercent: 2,
    });

    expect(result).not.toBeNull();
    expect(result!.flourG).toBe(1000);
    expect(result!.waterG).toBe(600);
    expect(result!.saltG).toBe(20);
    expect(result!.yeastG).toBe(3);
    expect(result!.oilG).toBe(20);
    expect(result!.totalDoughWeightG).toBe(1643);
  });

  it("computes water from flour and hydration", () => {
    expect(computeWaterFromFlour(1000, 65)).toBe(650);
    expect(computeWaterFromFlour(null, 65)).toBeNull();
  });

  it("computes flour from water and hydration", () => {
    expect(computeFlourFromWater(650, 65)).toBe(1000);
    expect(computeFlourFromWater(650, 0)).toBeNull();
  });

  it("returns null for invalid percentages", () => {
    expect(
      computeBakersPercent({
        mode: "total_dough",
        totalDoughWeightG: 1000,
        hydrationPercent: -1,
        saltPercent: 2,
        yeastPercent: 0.2,
      }),
    ).toBeNull();
  });

  it("returns outcome error for missing total dough inputs", () => {
    const outcome = computeBakersPercentOutcome({
      mode: "total_dough",
      hydrationPercent: 65,
      saltPercent: 2.5,
      yeastPercent: 0.2,
      oilPercent: 0,
    });

    expect(outcome.result).toBeNull();
    expect(outcome.error).toContain("総生地量");
  });
});
