import { describe, expect, it } from "vitest";

import {
  buildDailyPrepSelectionKey,
  canStartConfirmRecord,
  isDailyPrepAdjustmentActive,
  mapFlourUsageConfirmToUiState,
} from "./daily-prep-confirm-flow";
import { loadFlourUsageState, recordFlourUsageOnConfirm } from "./flour-usage-storage";

describe("daily-prep confirm flow", () => {
  it("builds stable prep keys for kg and adjustment", () => {
    expect(buildDailyPrepSelectionKey(10)).toBe("10|30|70");
    expect(
      buildDailyPrepSelectionKey(10, {
        poolishPercentOfTotalFlour: 35,
        totalHydrationPercent: 72,
      }),
    ).toBe("10|35|72");
  });

  it("detects active adjustment vs baseline", () => {
    expect(isDailyPrepAdjustmentActive()).toBe(false);
    expect(isDailyPrepAdjustmentActive({ totalHydrationPercent: 72 })).toBe(true);
    expect(
      isDailyPrepAdjustmentActive({
        poolishPercentOfTotalFlour: 30,
        totalHydrationPercent: 70,
      }),
    ).toBe(false);
  });

  it("blocks confirm only while in flight (not after a prior success)", () => {
    expect(canStartConfirmRecord(false)).toBe(true);
    expect(canStartConfirmRecord(true)).toBe(false);
  });

  it("maps storage results to UI state without implying success on failure", () => {
    const saved = mapFlourUsageConfirmToUiState({
      ok: true,
      recorded: true,
      state: { version: 1, counts: {}, recentConfirmTokens: [] },
    });
    expect(saved).toBe("saved");

    const noStorage = mapFlourUsageConfirmToUiState({
      ok: false,
      reason: "no_storage",
      state: { version: 1, counts: {}, recentConfirmTokens: [] },
    });
    expect(noStorage).toBe("storage_unavailable");

    const writeFailed = mapFlourUsageConfirmToUiState({
      ok: false,
      reason: "write_failed",
      state: { version: 1, counts: {}, recentConfirmTokens: [] },
    });
    expect(writeFailed).toBe("write_failed");
    expect(writeFailed).not.toBe("saved");
  });

  it("allows two prep records for same kg and formula with different tokens", () => {
    const storage = createMemoryStorage();

    recordFlourUsageOnConfirm(
      { totalFlourKg: 10, confirmToken: "prep-a" },
      storage,
    );
    recordFlourUsageOnConfirm(
      { totalFlourKg: 10, confirmToken: "prep-b" },
      storage,
    );

    expect(loadFlourUsageState(storage).counts["10"]).toBe(2);
  });

  it("dedupes rapid double-submit with the same confirm token", () => {
    const storage = createMemoryStorage();

    recordFlourUsageOnConfirm({ totalFlourKg: 10, confirmToken: "same" }, storage);
    const dup = recordFlourUsageOnConfirm(
      { totalFlourKg: 10, confirmToken: "same" },
      storage,
    );

    expect(dup.recorded).toBe(false);
    expect(mapFlourUsageConfirmToUiState(dup)).toBe("duplicate_operation");
    expect(loadFlourUsageState(storage).counts["10"]).toBe(1);
  });
});

function createMemoryStorage() {
  const map = new Map<string, string>();

  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}