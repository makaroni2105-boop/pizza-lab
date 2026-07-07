import { describe, expect, it } from "vitest";

import { handleDieQuickRequest } from "./die-quick-handler";

describe("handleDieQuickRequest", () => {
  it("returns DieOutput for a valid QuickModeRequest with demo shop", () => {
    const result = handleDieQuickRequest(
      {
        mode: "quick",
        shopId: "shop-1",
        presetId: "preset-1",
        batch: { pizzaCount: 40 },
        environment: { shopRoomTempC: 26 },
      },
      "2026-07-06T10:00:00+09:00",
    );

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);

    if (result.body.success) {
      expect(result.body.output.recipe.totalDoughWeightG).toBe(10000);
      expect(result.body.output.temperature.frictionRiseC).toBe(14);
      expect(result.body.output.confidence.level).toBeDefined();
      expect(result.body.output.calculatedAt).toBe("2026-07-06T10:00:00+09:00");
    }
  });

  it("returns safe JSON for invalid request without HTTP 500", () => {
    const result = handleDieQuickRequest({ mode: "lab" });

    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
    if (!result.body.success) {
      expect(result.body.error.code).toBe("INVALID_REQUEST");
    }
  });

  it("returns PROFILE_NOT_FOUND for unknown shopId", () => {
    const result = handleDieQuickRequest({
      mode: "quick",
      shopId: "unknown-shop",
      presetId: "preset-1",
      batch: { pizzaCount: 10 },
    });

    expect(result.status).toBe(404);
    expect(result.body.success).toBe(false);
    if (!result.body.success) {
      expect(result.body.error.code).toBe("PROFILE_NOT_FOUND");
    }
  });

  it("accepts profile in body until CRUD exists", () => {
    const result = handleDieQuickRequest({
      mode: "quick",
      shopId: "custom-shop",
      presetId: "preset-1",
      batch: { pizzaCount: 5 },
      profile: {
        id: "custom-shop",
        name: "Custom",
        flour: { primaryFlourId: "caputo-cuoco" },
        mixer: { type: "spiral", modelId: "spiral-spiral-55" },
        method: {
          method: "napoli",
          hydrationPercent: 65,
          saltPercent: 2.5,
          yeastType: "dry",
          yeastPercent: 0.2,
          fermentationType: "cold",
          fermentationHours: 24,
        },
        ddt: { defaultDdt: 24 },
        presets: [
          {
            id: "preset-1",
            name: "Daily",
            type: "business",
            method: {
              method: "napoli",
              ballWeightG: 250,
              fermentationType: "cold",
              fermentationHours: 24,
            },
            targetDdt: 24,
            ballWeightG: 250,
          },
        ],
      },
    });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
  });
});
