import { describe, expect, it } from "vitest";

import {
  DEFAULT_TAP_WATER_TEMP_C,
  recommendIce,
  shouldUseIce,
  WATER_ICE_THRESHOLD_C,
} from "./ice";

describe("shouldUseIce", () => {
  it("requires ice below 4°C and not at the boundary", () => {
    expect(shouldUseIce(3.9)).toBe(true);
    expect(shouldUseIce(WATER_ICE_THRESHOLD_C)).toBe(false);
    expect(shouldUseIce(8)).toBe(false);
  });
});

describe("recommendIce", () => {
  it("does not recommend ice at or above 4°C", () => {
    const result = recommendIce({ recommendedWaterTempC: 8 });

    expect(result.useIce).toBe(false);
    expect(result.iceAmountG).toBe(0);
    expect(result.effectiveWaterTempC).toBe(8);
  });

  it("flags ice at exactly 4°C boundary without ice amount", () => {
    const result = recommendIce({ recommendedWaterTempC: 4 });

    expect(result.useIce).toBe(false);
    expect(result.iceAmountG).toBe(0);
    expect(result.effectiveWaterTempC).toBe(4);
  });

  it("recommends ice below 4°C even without water weight", () => {
    const result = recommendIce({ recommendedWaterTempC: 3 });

    expect(result.useIce).toBe(true);
    expect(result.iceAmountG).toBeNull();
    expect(result.effectiveWaterTempC).toBe(3);
  });

  it("estimates ice amount from water weight and tap temperature", () => {
    const result = recommendIce({
      recommendedWaterTempC: 3,
      waterWeightG: 4000,
      tapWaterTempC: DEFAULT_TAP_WATER_TEMP_C,
    });

    expect(result.useIce).toBe(true);
    expect(result.iceAmountG).toBe(50);
    expect(result.effectiveWaterTempC).toBe(3);
  });

  it("returns null outputs for invalid recommended temperature", () => {
    const result = recommendIce({
      recommendedWaterTempC: null,
      waterWeightG: 4000,
    });

    expect(result.useIce).toBe(false);
    expect(result.iceAmountG).toBeNull();
    expect(result.effectiveWaterTempC).toBeNull();
  });

  it("handles negative recommended temperatures", () => {
    const result = recommendIce({
      recommendedWaterTempC: -2,
      waterWeightG: 4030,
      tapWaterTempC: 8,
    });

    expect(result.useIce).toBe(true);
    expect(result.iceAmountG).toBe(504);
    expect(result.effectiveWaterTempC).toBe(-2);
  });

  it("returns zero ice when tap water is already cold enough", () => {
    const result = recommendIce({
      recommendedWaterTempC: 2,
      waterWeightG: 3000,
      tapWaterTempC: 2,
    });

    expect(result.useIce).toBe(true);
    expect(result.iceAmountG).toBe(0);
    expect(result.effectiveWaterTempC).toBe(2);
  });
});
