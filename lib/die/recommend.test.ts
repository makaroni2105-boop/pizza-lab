import { describe, expect, it } from "vitest";

import { recommendWaterTemp } from "./recommend";

describe("recommendWaterTemp", () => {
  it("inverts DDT for a typical summer mix", () => {
    const result = recommendWaterTemp({
      targetDdtC: 24,
      flourTempC: 40,
      roomTempC: 30,
      effectiveFrictionC: 20,
    });

    expect(result.recommendedWaterTempC).toBe(6);
    expect(result.predictedDoughTempC).toBe(24);
    expect(result.ddtDeltaC).toBe(0);
    expect(result.frictionRiseC).toBe(20);
    expect(result.frictionSource).toBe("master");
  });

  it("includes manual and learned friction offsets via computeFriction", () => {
    const result = recommendWaterTemp({
      targetDdtC: 24,
      flourTempC: 30,
      roomTempC: 26,
      friction: {
        baseFrictionC: 14,
        manualFrictionOffsetC: 1,
        learnedFrictionOffsetC: 0.5,
      },
    });

    expect(result.recommendedWaterTempC).toBe(24.5);
    expect(result.frictionRiseC).toBe(15.5);
    expect(result.frictionSource).toBe("manual");
    expect(result.predictedDoughTempC).toBe(24);
  });

  it("returns null when required inputs are missing", () => {
    expect(
      recommendWaterTemp({
        targetDdtC: null,
        flourTempC: 30,
        roomTempC: 26,
        effectiveFrictionC: 14,
      }).recommendedWaterTempC,
    ).toBeNull();

    expect(
      recommendWaterTemp({
        targetDdtC: 24,
        flourTempC: undefined,
        roomTempC: 26,
        effectiveFrictionC: 14,
      }).recommendedWaterTempC,
    ).toBeNull();

    expect(
      recommendWaterTemp({
        targetDdtC: 24,
        flourTempC: 30,
        roomTempC: 26,
        effectiveFrictionC: undefined,
      }).recommendedWaterTempC,
    ).toBeNull();
  });

  it("supports negative recommended water temperatures", () => {
    const result = recommendWaterTemp({
      targetDdtC: 22,
      flourTempC: 38,
      roomTempC: 34,
      effectiveFrictionC: 18,
    });

    expect(result.recommendedWaterTempC).toBe(-2);
    expect(result.predictedDoughTempC).toBe(22);
  });

  it("treats boundary DDT inputs at exactly 4°C recommendation", () => {
    const result = recommendWaterTemp({
      targetDdtC: 24,
      flourTempC: 42,
      roomTempC: 34,
      effectiveFrictionC: 16,
    });

    expect(result.recommendedWaterTempC).toBe(4);
    expect(result.predictedDoughTempC).toBe(24);
  });
});
