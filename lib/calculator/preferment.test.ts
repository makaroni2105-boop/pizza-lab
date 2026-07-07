import { describe, expect, it } from "vitest";

import {
  PREFERMENT_DEFAULTS,
  computePreferment,
  computePrefermentOutcome,
  prefermentTypeLabel,
} from "./preferment";

describe("preferment", () => {
  it("computes poolish split with defaults", () => {
    const result = computePreferment({
      totalFlourG: 1000,
      prefermentType: "poolish",
      prefermentFlourPercent: 20,
      totalHydrationPercent: 65,
    });

    expect(result).not.toBeNull();
    expect(result!.prefermentFlourG).toBe(200);
    expect(result!.prefermentWaterG).toBe(200);
    expect(result!.prefermentYeastG).toBe(0.4);
    expect(result!.mainFlourG).toBe(800);
    expect(result!.totalWaterG).toBe(650);
    expect(result!.mainWaterG).toBe(450);
    expect(result!.prefermentHydrationPercent).toBe(
      PREFERMENT_DEFAULTS.poolish.hydrationPercent,
    );
  });

  it("computes biga split with defaults", () => {
    const result = computePreferment({
      totalFlourG: 1000,
      prefermentType: "biga",
      prefermentFlourPercent: 30,
      totalHydrationPercent: 62,
    });

    expect(result).not.toBeNull();
    expect(result!.prefermentFlourG).toBe(300);
    expect(result!.prefermentWaterG).toBe(150);
    expect(result!.mainFlourG).toBe(700);
    expect(result!.totalWaterG).toBe(620);
    expect(result!.mainWaterG).toBe(470);
  });

  it("supports custom preferment hydration and yeast", () => {
    const result = computePreferment({
      totalFlourG: 500,
      prefermentType: "biga",
      prefermentFlourPercent: 25,
      totalHydrationPercent: 60,
      prefermentHydrationPercent: 55,
      prefermentYeastPercent: 0.5,
    });

    expect(result!.prefermentWaterG).toBe(68.8);
    expect(result!.prefermentYeastG).toBe(0.6);
  });

  it("returns null when preferment flour percent is invalid", () => {
    expect(
      computePreferment({
        totalFlourG: 1000,
        prefermentType: "poolish",
        prefermentFlourPercent: 100,
        totalHydrationPercent: 65,
      }),
    ).toBeNull();
  });

  it("returns outcome error for missing flour", () => {
    const outcome = computePrefermentOutcome({
      totalFlourG: null,
      prefermentType: "poolish",
      prefermentFlourPercent: 20,
      totalHydrationPercent: 65,
    });

    expect(outcome.result).toBeNull();
    expect(outcome.error).toContain("粉量");
  });

  it("labels preferment types", () => {
    expect(prefermentTypeLabel("biga")).toContain("ビガ");
    expect(prefermentTypeLabel("poolish")).toContain("ポーリッシュ");
  });
});
