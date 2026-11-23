import { describe, expect, it } from "vitest";

import { NALIPO_DAILY_PREP_BASELINE } from "@/types/daily-prep";

import { buildDailyPrepRecordFromCompute, materialsDifferFromComputed } from "./prep-record-build";

const weather = {
  provider: "openweathermap",
  coordinates: {
    latitude: 34.2386,
    longitude: 132.5616,
    labelJa: "広島県呉市周辺",
  },
  fetchedAtIso: "2026-11-23T01:00:00.000Z",
  observationTimeIso: null,
  fetchStatus: "ok" as const,
  fetchErrorCode: null,
  ambientTempC: 18.2,
  ambientHumidityPct: 62,
};

describe("buildDailyPrepRecordFromCompute", () => {
  it("builds record with computed and matching actual materials", () => {
    const built = buildDailyPrepRecordFromCompute({
      id: "rec-1",
      input: {
        totalFlourKg: 10,
        prepDateJst: "2026-11-23",
        roomTempC: 24,
        memo: "test",
      },
      weather,
      nowIso: "2026-11-23T01:00:00.000Z",
    });

    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }

    expect(built.record.baselineFormula).toEqual(NALIPO_DAILY_PREP_BASELINE);
    expect(built.record.totalFlourKg).toBe(10);
    expect(built.record.aiSearch.totalFlourKg).toBe(10);
    expect(
      materialsDifferFromComputed(
        built.record.computedMaterials,
        built.record.actualMaterials,
      ),
    ).toBe(false);
  });

  it("detects material override", () => {
    const built = buildDailyPrepRecordFromCompute({
      id: "rec-2",
      input: {
        totalFlourKg: 10,
        actualMaterials: {
          dayOf: { yeastG: 99 },
        },
      },
      weather,
      nowIso: "2026-11-23T01:00:00.000Z",
    });

    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }

    expect(
      materialsDifferFromComputed(
        built.record.computedMaterials,
        built.record.actualMaterials,
      ),
    ).toBe(true);
    expect(built.record.actualMaterials.dayOf.yeastG).toBe(99);
  });
});