import { describe, expect, it } from "vitest";

import { computeRecipe, sumRecipeWeightG } from "./recipe";

describe("computeRecipe", () => {
  it("computes a standard napoli batch", () => {
    const recipe = computeRecipe({
      doughBallWeightG: 250,
      ballCount: 40,
      hydrationPercent: 65,
      saltPercent: 2.5,
      yeastPercent: 0.2,
      oilPercent: 0,
    });

    expect(recipe).not.toBeNull();
    expect(recipe!.totalDoughWeightG).toBe(10000);
    expect(recipe!.flourG).toBe(5963);
    expect(recipe!.waterG).toBe(3876);
    expect(recipe!.saltG).toBe(149.1);
    expect(recipe!.yeastG).toBe(11.9);
    expect(recipe!.oilG).toBe(0);
    expect(recipe!.hydrationPct).toBe(65);
    expect(sumRecipeWeightG(recipe!)).toBeCloseTo(10000, 0);
  });

  it("supports zero oil percent", () => {
    const recipe = computeRecipe({
      doughBallWeightG: 280,
      ballCount: 10,
      hydrationPercent: 60,
      saltPercent: 2,
      yeastPercent: 0.3,
    });

    expect(recipe).not.toBeNull();
    expect(recipe!.oilG).toBe(0);
    expect(sumRecipeWeightG(recipe!)).toBeCloseTo(recipe!.totalDoughWeightG, 0);
  });

  it("supports decimal yeast percent", () => {
    const recipe = computeRecipe({
      doughBallWeightG: 250,
      ballCount: 1,
      hydrationPercent: 65,
      saltPercent: 2.5,
      yeastPercent: 0.15,
      oilPercent: 0,
    });

    expect(recipe).not.toBeNull();
    expect(recipe!.yeastPct).toBe(0.15);
    expect(recipe!.yeastG).toBeGreaterThan(0);
    expect(sumRecipeWeightG(recipe!)).toBeCloseTo(recipe!.totalDoughWeightG, 0);
  });

  it("scales with multiple balls", () => {
    const single = computeRecipe({
      doughBallWeightG: 250,
      ballCount: 1,
      hydrationPercent: 65,
      saltPercent: 2.5,
      yeastPercent: 0.2,
      oilPercent: 0,
    });
    const batch = computeRecipe({
      doughBallWeightG: 250,
      ballCount: 40,
      hydrationPercent: 65,
      saltPercent: 2.5,
      yeastPercent: 0.2,
      oilPercent: 0,
    });

    expect(Math.abs(single!.flourG * 40 - batch!.flourG)).toBeLessThanOrEqual(1);
    expect(batch!.totalDoughWeightG).toBe(10000);
  });

  it("includes oil when percent is non-zero", () => {
    const recipe = computeRecipe({
      doughBallWeightG: 280,
      ballCount: 10,
      hydrationPercent: 60,
      saltPercent: 2,
      yeastPercent: 0.3,
      oilPercent: 2,
    });

    expect(recipe!.oilG).toBeGreaterThan(0);
    expect(sumRecipeWeightG(recipe!)).toBeCloseTo(recipe!.totalDoughWeightG, 0);
  });

  it("returns null for missing inputs", () => {
    expect(
      computeRecipe({
        doughBallWeightG: 250,
        ballCount: 40,
        hydrationPercent: 65,
        saltPercent: null,
        yeastPercent: 0.2,
      }),
    ).toBeNull();

    expect(
      computeRecipe({
        doughBallWeightG: 250,
        ballCount: 40,
        hydrationPercent: undefined,
        saltPercent: 2.5,
        yeastPercent: 0.2,
      }),
    ).toBeNull();
  });

  it("returns null for non-positive ball count or ball weight", () => {
    expect(
      computeRecipe({
        doughBallWeightG: 250,
        ballCount: 0,
        hydrationPercent: 65,
        saltPercent: 2.5,
        yeastPercent: 0.2,
      }),
    ).toBeNull();

    expect(
      computeRecipe({
        doughBallWeightG: -250,
        ballCount: 10,
        hydrationPercent: 65,
        saltPercent: 2.5,
        yeastPercent: 0.2,
      }),
    ).toBeNull();
  });

  it("returns null for negative percentages", () => {
    expect(
      computeRecipe({
        doughBallWeightG: 250,
        ballCount: 10,
        hydrationPercent: -1,
        saltPercent: 2.5,
        yeastPercent: 0.2,
      }),
    ).toBeNull();
  });
});
