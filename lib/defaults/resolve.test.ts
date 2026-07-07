import { describe, expect, it } from "vitest";

import type { QuickModeRequest } from "@/types/die";
import type { ShopProfile } from "@/types/profile";

import { resolveDefaults } from "./resolve";
import { resolveMixerDefaults } from "./resolve-mixer";
import { FieldResolutionTracker } from "./resolve-field";

function createTestProfile(overrides?: Partial<ShopProfile>): ShopProfile {
  return {
    id: "shop-1",
    name: "Test Pizzeria",
    flour: {
      primaryFlourId: "caputo-cuoco",
      defaultFlourTemp: "unknown",
    },
    mixer: {
      type: "unknown",
      modelId: null,
      lowSpeedMin: "unknown",
      highSpeedMin: "unknown",
    },
    method: {
      method: "napoli",
      hydrationPercent: 65,
      saltPercent: 2.5,
      yeastType: "dry",
      yeastPercent: 0.2,
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

describe("resolveDefaults", () => {
  it("resolves quick mode with master fallbacks and fieldResolution", () => {
    const profile = createTestProfile();
    const preset = profile.presets[0];
    const request: QuickModeRequest = {
      mode: "quick",
      shopId: "shop-1",
      presetId: "preset-1",
      batch: { pizzaCount: 40 },
      environment: { shopRoomTempC: 26 },
    };

    const result = resolveDefaults({ request, profile, preset });

    expect(result.batch.pizzaCount).toBe(40);
    expect(result.batch.ballWeightG).toBe(250);
    expect(result.environment.shopRoomTempC).toBe(26);
    expect(result.flour.primaryFlourId).toBe("caputo-cuoco");
    expect(result.flour.wValue).toBe(300);
    expect(result.mixer.type).toBe("unknown");
    expect(result.mixer.baseFrictionC).toBe(14);
    expect(result.method.hydrationPct).toBe(65);
    expect(result.waterTempC).toBeNull();
    expect(result.fieldResolution["batch.pizzaCount"].source).toBe("user");
    expect(result.fieldResolution["environment.shopRoomTempC"].source).toBe("user");
    expect(result.fieldResolution["flour.wValue"].source).toBe("master");
    expect(result.estimatedFieldCount).toBeGreaterThan(0);
  });

  it("estimates flour temp from ambient when unknown", () => {
    const profile = createTestProfile();
    const preset = profile.presets[0];
    const request: QuickModeRequest = {
      mode: "quick",
      shopId: "shop-1",
      presetId: "preset-1",
      batch: { pizzaCount: 10 },
    };

    const result = resolveDefaults({
      request,
      profile,
      preset,
      weather: { ambientTempC: 30, ambientHumidityPct: 55 },
    });

    expect(result.environment.ambientTempC).toBe(30);
    expect(result.flour.flourTempC).toBe(32);
    expect(result.fieldResolution["flour.flourTempC"].source).toBe("computed");
    expect(result.fieldResolution["flour.flourTempC"].sourceDetail).toBe("ambientTemp+2C");
  });

  it("does not guess flour properties for invalid flour id", () => {
    const profile = createTestProfile({
      flour: { primaryFlourId: "invalid-flour-id" },
    });
    const preset = profile.presets[0];
    const request: QuickModeRequest = {
      mode: "quick",
      shopId: "shop-1",
      presetId: "preset-1",
      batch: { pizzaCount: 10 },
    };

    const result = resolveDefaults({ request, profile, preset });

    expect(result.flour.wValue).toBeNull();
    expect(result.flour.proteinPercent).toBeNull();
    expect(result.flour.absorptionFactor).toBeNull();
  });
});

describe("resolveMixerDefaults", () => {
  it("keeps hand mixer speed fields unresolved when master has null", () => {
    const profile = createTestProfile({
      mixer: {
        type: "hand",
        modelId: "hand-manual",
        lowSpeedMin: "unknown",
        highSpeedMin: "unknown",
        lowRpm: "unknown",
        highRpm: "unknown",
      },
    });
    const tracker = new FieldResolutionTracker();
    const result = resolveMixerDefaults(undefined, profile, tracker);

    expect(result.type).toBe("hand");
    expect(result.lowSpeedMin).toBeNull();
    expect(result.highSpeedMin).toBeNull();
    expect(result.lowRpm).toBeNull();
    expect(result.highRpm).toBeNull();
    expect(tracker.unresolvedFields).toContain("mixer.lowSpeedMin");
  });

  it("applies learning offset when run count meets threshold", () => {
    const profile = createTestProfile({
      mixer: {
        type: "spiral",
        modelId: "spiral-spiral-55",
      },
      learning: [
        {
          mixerKey: "spiral:spiral-spiral-55",
          runCount: 8,
          learnedFrictionOffset: 1.5,
          isLearningComplete: true,
        },
      ],
    });
    const tracker = new FieldResolutionTracker();
    const result = resolveMixerDefaults(undefined, profile, tracker);

    expect(result.baseFrictionC).toBe(14);
    expect(result.learnedFrictionOffsetC).toBe(1.5);
    expect(tracker.getFieldResolution()["mixer.learnedFrictionOffsetC"].source).toBe(
      "learning",
    );
  });
});
