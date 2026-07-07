import { describe, expect, it } from "vitest";

import type { QuickModeRequest } from "@/types/die";
import type { ShopProfile } from "@/types/profile";

import { computeDie } from "./compute";

function createTestProfile(overrides?: Partial<ShopProfile>): ShopProfile {
  return {
    id: "shop-1",
    name: "Test Pizzeria",
    flour: {
      primaryFlourId: "caputo-cuoco",
      defaultFlourTemp: "unknown",
    },
    mixer: {
      type: "spiral",
      modelId: "spiral-spiral-55",
      lowSpeedMin: 3,
      highSpeedMin: 8,
    },
    method: {
      method: "napoli",
      hydrationPercent: 65,
      saltPercent: 2.5,
      yeastType: "dry",
      yeastPercent: 0.2,
      fermentationType: "cold",
      fermentationHours: 24,
    },
    ddt: {
      defaultDdt: 24,
      summerDdt: 24,
      winterDdt: 26,
    },
    presets: [
      {
        id: "preset-1",
        name: "Daily Napoli",
        type: "business",
        method: {
          method: "napoli",
          hydrationPercent: 65,
          saltPercent: 2.5,
          yeastType: "dry",
          yeastPercent: 0.2,
          ballWeightG: 250,
          fermentationType: "cold",
          fermentationHours: 24,
        },
        targetDdt: 24,
        ballWeightG: 250,
        isDefault: true,
      },
    ],
    ...overrides,
  };
}

describe("computeDie", () => {
  it("builds DieOutput from QuickModeRequest", () => {
    const profile = createTestProfile();
    const request: QuickModeRequest = {
      mode: "quick",
      shopId: "shop-1",
      presetId: "preset-1",
      batch: { pizzaCount: 40 },
      environment: { shopRoomTempC: 26 },
    };

    const { output } = computeDie({
      request,
      profile,
      weather: { ambientTempC: 30, ambientHumidityPct: 55 },
      useTime: "2026-07-07T18:00:00+09:00",
      calculatedAt: "2026-07-06T10:00:00+09:00",
    });

    expect(output.recipe.totalDoughWeightG).toBe(10000);
    expect(output.recipe.flourG).toBeGreaterThan(0);
    expect(output.temperature.recommendedWaterTempC).not.toBe(0);
    expect(output.temperature.frictionRiseC).toBe(14);
    expect(output.temperature.frictionSource).toBeDefined();
    expect(output.yeastAdjustment.adjustedYeastPct).toBeGreaterThan(0);
    expect(output.fermentationSchedule.useTime).toBe("2026-07-07T18:00:00+09:00");
    expect(output.fermentationSchedule.mixStartTime).toBeTruthy();
    expect(output.confidence.level).toBeDefined();
    expect(output.confidence.estimatedFieldCount).toBeGreaterThanOrEqual(0);
    expect(output.calculatedAt).toBe("2026-07-06T10:00:00+09:00");
  });

  it("preserves fieldResolution and estimatedFieldCount in resolvedInput", () => {
    const profile = createTestProfile();
    const request: QuickModeRequest = {
      mode: "quick",
      shopId: "shop-1",
      presetId: "preset-1",
      batch: { pizzaCount: 10 },
    };

    const { output } = computeDie({
      request,
      profile,
      useTime: "2026-07-07T09:00:00.000Z",
    });

    expect(output.resolvedInput).toBeDefined();
    expect(output.resolvedInput!.fieldResolution).toBeDefined();
    expect(Object.keys(output.resolvedInput!.fieldResolution ?? {}).length).toBeGreaterThan(0);
    expect(output.resolvedInput!.estimatedFieldCount).toBe(output.confidence.estimatedFieldCount);
    expect(output.resolvedInput!.mixer.effectiveFrictionC).toBe(14);
  });

  it("does not crash when optional schedule input is missing", () => {
    const profile = createTestProfile();
    const request: QuickModeRequest = {
      mode: "quick",
      shopId: "shop-1",
      presetId: "preset-1",
      batch: { pizzaCount: 5 },
    };

    const { output, incompleteBlocks } = computeDie({ request, profile });

    expect(output.recipe.totalDoughWeightG).toBeGreaterThan(0);
    expect(output.temperature.targetDdtC).toBe(24);
    expect(incompleteBlocks).toContain("fermentationSchedule");
    expect(output.confidence.level).toBe("low");
  });

  it("does not crash when preset is missing", () => {
    const profile = createTestProfile();
    const request: QuickModeRequest = {
      mode: "quick",
      shopId: "shop-1",
      presetId: "missing-preset",
      batch: { pizzaCount: 5 },
    };

    const { output, incompleteBlocks } = computeDie({ request, profile });

    expect(output.recipe.flourG).toBe(0);
    expect(output.confidence.level).toBe("low");
    expect(incompleteBlocks).toContain("preset");
  });

  it("does not crash with incomplete flour data", () => {
    const profile = createTestProfile({
      flour: { primaryFlourId: "invalid-flour-id" },
    });
    const request: QuickModeRequest = {
      mode: "quick",
      shopId: "shop-1",
      presetId: "preset-1",
      batch: { pizzaCount: 10 },
    };

    const { output } = computeDie({
      request,
      profile,
      useTime: "2026-07-07T09:00:00.000Z",
    });

    expect(output.recipe.totalDoughWeightG).toBe(2500);
    expect(output.confidence.level).toBe("low");
    expect(output.resolvedInput?.fieldResolution?.["flour.wValue"]?.value ?? null).toBeNull();
  });

  it("assembles temperature with ice recommendation when water temp is low", () => {
    const profile = createTestProfile();
    const request = {
      mode: "lab" as const,
      shopId: "shop-1",
      presetId: "preset-1",
      batch: { pizzaCount: 40, ballWeightG: 250 },
      temperature: { flourTempC: 45, targetDdtC: 24 },
      environment: { shopRoomTempC: 34 },
    };

    const { output } = computeDie({
      request,
      profile,
      useTime: "2026-07-07T09:00:00.000Z",
    });

    expect(output.temperature.recommendedWaterTempC).toBeLessThan(4);
    expect(output.temperature.useIce).toBe(true);
    expect(output.temperature.iceAmountG).toBeGreaterThan(0);
  });
});
