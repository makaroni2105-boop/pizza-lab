import { describe, expect, it } from "vitest";

import {
  adjustFermentationSchedule,
  computeDdtDurationAdjustmentPct,
  computeRoomDurationAdjustmentPct,
  FERMENT_DURATION_ADJUSTMENT_MAX_PCT,
  FERMENT_DURATION_ADJUSTMENT_MIN_PCT,
  FERMENT_DDT_ADJUSTMENT_CAP_PCT,
  FERMENT_ROOM_ADJUSTMENT_CAP_PCT,
  REFERENCE_ROOM_TEMP_C,
  subtractHoursFromIsoTime,
} from "./fermentation-adjust";

const USE_TIME = "2026-07-07T09:00:00.000Z";

const baseInput = {
  fermentationType: "cold" as const,
  baseHours: 24,
  useTime: USE_TIME,
  roomTempDuringFermentC: REFERENCE_ROOM_TEMP_C,
  targetDdtC: 24,
  predictedDoughTempC: 24,
};

describe("adjustFermentationSchedule", () => {
  it("returns standard schedule without adjustment", () => {
    const result = adjustFermentationSchedule(baseInput);

    expect(result).not.toBeNull();
    expect(result!.baseHours).toBe(24);
    expect(result!.adjustedHours).toBe(24);
    expect(result!.adjustmentMinutes).toBe(0);
    expect(result!.mixStartTime).toBe("2026-07-06T09:00:00.000Z");
    expect(result!.useTime).toBe(USE_TIME);
    expect(result!.confidence).toBe("high");
    expect(result!.adjustmentReason).toContain("補正不要");
  });

  it("shortens fermentation in hot room conditions", () => {
    const result = adjustFermentationSchedule({
      ...baseInput,
      roomTempDuringFermentC: 28,
    });

    expect(result!.adjustedHours).toBeLessThan(24);
    expect(result!.adjustmentMinutes).toBeLessThan(0);
    expect(result!.adjustmentReason).toContain("発酵室温が高い");
  });

  it("extends fermentation in cold room conditions", () => {
    const result = adjustFermentationSchedule({
      ...baseInput,
      roomTempDuringFermentC: 14,
    });

    expect(result!.adjustedHours).toBeGreaterThan(24);
    expect(result!.adjustmentMinutes).toBeGreaterThan(0);
    expect(result!.adjustmentReason).toContain("発酵室温が低い");
  });

  it("shortens fermentation when dough temp is above target DDT", () => {
    const result = adjustFermentationSchedule({
      ...baseInput,
      predictedDoughTempC: 25.5,
      targetDdtC: 24,
    });

    expect(result!.adjustedHours).toBeLessThan(24);
    expect(result!.adjustmentReason).toContain("予想生地温が目標より+1.5°C");
  });

  it("extends fermentation when dough temp is below target DDT", () => {
    const result = adjustFermentationSchedule({
      ...baseInput,
      predictedDoughTempC: 22,
      targetDdtC: 24,
    });

    expect(result!.adjustedHours).toBeGreaterThan(24);
    expect(result!.adjustmentReason).toContain("予想生地温が目標より-2.0°C");
  });

  it("combines hot room and high dough temperature", () => {
    const result = adjustFermentationSchedule({
      ...baseInput,
      roomTempDuringFermentC: 30,
      predictedDoughTempC: 26,
      targetDdtC: 24,
    });

    expect(result!.adjustedHours).toBeLessThan(24);
    expect(result!.confidence).toBe("low");
  });

  it("respects duration adjustment bounds", () => {
    const extreme = adjustFermentationSchedule({
      ...baseInput,
      roomTempDuringFermentC: 40,
      predictedDoughTempC: 30,
      targetDdtC: 24,
    });

    const pctChange = ((extreme!.adjustedHours - 24) / 24) * 100;
    expect(pctChange).toBeGreaterThanOrEqual(FERMENT_DURATION_ADJUSTMENT_MIN_PCT);
    expect(pctChange).toBeLessThanOrEqual(FERMENT_DURATION_ADJUSTMENT_MAX_PCT);
  });

  it("returns null for invalid inputs", () => {
    expect(adjustFermentationSchedule({ ...baseInput, baseHours: 0 })).toBeNull();
    expect(adjustFermentationSchedule({ ...baseInput, useTime: null })).toBeNull();
    expect(adjustFermentationSchedule({ ...baseInput, useTime: "invalid-date" })).toBeNull();
    expect(adjustFermentationSchedule({ ...baseInput, fermentationType: null })).toBeNull();
    expect(adjustFermentationSchedule({ ...baseInput, roomTempDuringFermentC: undefined })).toBeNull();
  });

  it("back-calculates mix start time from target use time", () => {
    const useTime = "2026-07-08T18:00:00+09:00";
    const result = adjustFermentationSchedule({
      ...baseInput,
      useTime,
      baseHours: 48,
      roomTempDuringFermentC: REFERENCE_ROOM_TEMP_C,
      predictedDoughTempC: 24,
      targetDdtC: 24,
    });

    expect(result!.adjustedHours).toBe(48);
    expect(result!.mixStartTime).toBe(subtractHoursFromIsoTime(useTime, 48));
    expect(Date.parse(result!.useTime)).toBe(Date.parse(useTime));
  });
});

describe("fermentation adjustment helpers", () => {
  it("caps room temperature duration adjustment", () => {
    expect(computeRoomDurationAdjustmentPct(40)).toBe(-FERMENT_ROOM_ADJUSTMENT_CAP_PCT);
  });

  it("caps ddt duration adjustment", () => {
    expect(computeDdtDurationAdjustmentPct(4)).toBe(-FERMENT_DDT_ADJUSTMENT_CAP_PCT);
  });

  it("subtracts hours from ISO datetime", () => {
    expect(subtractHoursFromIsoTime(USE_TIME, 24)).toBe("2026-07-06T09:00:00.000Z");
    expect(subtractHoursFromIsoTime("not-a-date", 24)).toBeNull();
  });
});
