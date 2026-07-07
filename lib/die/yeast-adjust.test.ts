import { describe, expect, it } from "vitest";

import {
  adjustYeast,
  computeDdtDeltaAdjustmentPct,
  computeFermentationHoursAdjustmentPct,
  computeRoomTempAdjustmentPct,
  DEFAULT_BASELINE_FERMENTATION_HOURS,
  REFERENCE_ROOM_TEMP_C,
  YEAST_ADJUSTMENT_MAX_PCT,
  YEAST_ADJUSTMENT_MIN_PCT,
  ROOM_TEMP_ADJUSTMENT_CAP_PCT,
} from "./yeast-adjust";

const baseInput = {
  baseYeastPct: 0.2,
  baseYeastWeightG: 12,
  roomTempDuringFermentC: REFERENCE_ROOM_TEMP_C,
  targetDdtC: 24,
  predictedDoughTempC: 24,
  fermentationHours: DEFAULT_BASELINE_FERMENTATION_HOURS,
  baselineFermentationHours: DEFAULT_BASELINE_FERMENTATION_HOURS,
};

describe("adjustYeast", () => {
  it("returns no adjustment under standard conditions", () => {
    const result = adjustYeast(baseInput);

    expect(result).not.toBeNull();
    expect(result!.adjustmentPct).toBe(0);
    expect(result!.adjustedYeastPct).toBe(0.2);
    expect(result!.adjustedYeastWeightG).toBe(12);
    expect(result!.confidence).toBe("high");
    expect(result!.reason).toContain("目標と一致");
  });

  it("reduces yeast in hot room conditions", () => {
    const result = adjustYeast({
      ...baseInput,
      roomTempDuringFermentC: 28,
    });

    expect(result!.adjustmentPct).toBeLessThan(0);
    expect(result!.adjustedYeastPct).toBeLessThan(0.2);
    expect(result!.adjustedYeastWeightG).toBeLessThan(12);
  });

  it("increases yeast in cold room conditions", () => {
    const result = adjustYeast({
      ...baseInput,
      roomTempDuringFermentC: 14,
    });

    expect(result!.adjustmentPct).toBeGreaterThan(0);
    expect(result!.adjustedYeastPct).toBeGreaterThan(0.2);
    expect(result!.adjustedYeastWeightG).toBeGreaterThan(12);
  });

  it("reduces yeast for long fermentation hours", () => {
    const result = adjustYeast({
      ...baseInput,
      fermentationHours: 48,
    });

    expect(result!.adjustmentPct).toBe(-25);
    expect(result!.adjustedYeastPct).toBe(0.15);
    expect(result!.reason).toContain("発酵時間が長い");
  });

  it("increases yeast for short fermentation hours", () => {
    const result = adjustYeast({
      ...baseInput,
      fermentationHours: 12,
    });

    expect(result!.adjustmentPct).toBe(12.5);
    expect(result!.adjustedYeastPct).toBe(0.225);
    expect(result!.reason).toContain("発酵時間が短い");
  });

  it("reduces yeast when predicted dough temp exceeds target DDT", () => {
    const result = adjustYeast({
      ...baseInput,
      predictedDoughTempC: 25.5,
      targetDdtC: 24,
    });

    expect(result!.adjustmentPct).toBe(-12);
    expect(result!.reason).toContain("予想生地温が目標より+1.5°C");
  });

  it("combines hot room, long ferment, and high dough temp", () => {
    const result = adjustYeast({
      ...baseInput,
      roomTempDuringFermentC: 28,
      fermentationHours: 48,
      predictedDoughTempC: 25,
      targetDdtC: 24,
    });

    expect(result!.adjustmentPct).toBe(-48);
    expect(result!.confidence).toBe("low");
    expect(result!.adjustedYeastPct).toBe(0.104);
  });

  it("returns null for missing or invalid inputs", () => {
    expect(adjustYeast({ ...baseInput, baseYeastPct: null })).toBeNull();
    expect(adjustYeast({ ...baseInput, roomTempDuringFermentC: undefined })).toBeNull();
    expect(adjustYeast({ ...baseInput, fermentationHours: 0 })).toBeNull();
    expect(adjustYeast({ ...baseInput, baseYeastPct: -0.1 })).toBeNull();
  });

  it("omits adjusted yeast weight when base weight is not provided", () => {
    const result = adjustYeast({
      ...baseInput,
      baseYeastWeightG: undefined,
      roomTempDuringFermentC: 28,
    });

    expect(result!.adjustedYeastWeightG).toBeNull();
    expect(result!.adjustedYeastPct).toBeLessThan(0.2);
  });

  it("supports zero base yeast percent without error", () => {
    const result = adjustYeast({
      ...baseInput,
      baseYeastPct: 0,
      baseYeastWeightG: 0,
      roomTempDuringFermentC: 28,
    });

    expect(result!.adjustedYeastPct).toBe(0);
    expect(result!.adjustedYeastWeightG).toBe(0);
  });
});

describe("yeast adjustment helpers", () => {
  it("caps room temperature adjustment", () => {
    expect(computeRoomTempAdjustmentPct(40)).toBe(-ROOM_TEMP_ADJUSTMENT_CAP_PCT);
  });

  it("caps ddt delta adjustment", () => {
    expect(computeDdtDeltaAdjustmentPct(5)).toBe(-20);
  });

  it("caps fermentation hour adjustment", () => {
    expect(computeFermentationHoursAdjustmentPct(72, 24)).toBe(-25);
  });

  it("respects global adjustment bounds", () => {
    const extreme = adjustYeast({
      baseYeastPct: 0.2,
      roomTempDuringFermentC: 40,
      fermentationHours: 72,
      predictedDoughTempC: 30,
      targetDdtC: 24,
      baselineFermentationHours: 24,
    });

    expect(extreme!.adjustmentPct).toBeGreaterThanOrEqual(YEAST_ADJUSTMENT_MIN_PCT);
    expect(extreme!.adjustmentPct).toBeLessThanOrEqual(YEAST_ADJUSTMENT_MAX_PCT);
  });
});
