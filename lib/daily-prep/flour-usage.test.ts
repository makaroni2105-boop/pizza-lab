import { beforeEach, describe, expect, it } from "vitest";

import type { StorageLike } from "@/lib/profile/profile-storage";

import {
  beginDisplayPinSession,
  computeDisplayPinKg,
  getDisplayPinSessionPins,
  getFlourUsageCount,
} from "./flour-usage-display";
import {
  FLOUR_USAGE_STORAGE_KEY,
  loadFlourUsageState,
  parseFlourUsageStorageState,
  recordFlourUsageOnConfirm,
  serializeFlourUsageStorageState,
  type FlourUsageStorageState,
} from "./flour-usage-storage";

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();

  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

function createThrowingStorage(): StorageLike {
  return {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("quota");
    },
  };
}

function stateWithCounts(counts: Record<number, number>): FlourUsageStorageState {
  const normalized: Record<string, number> = {};

  for (const [kg, count] of Object.entries(counts)) {
    normalized[String(kg)] = count;
  }

  return {
    version: 1,
    counts: normalized,
    recentConfirmTokens: [],
  };
}

describe("flour-usage display", () => {
  it("shows default pins 5, 8, 10, 16 when there is no history", () => {
    const state = loadFlourUsageState();

    expect(computeDisplayPinKg(state)).toEqual([5, 8, 10, 16]);
  });

  it("picks top 4 by frequency with stable tie-break (kg ascending)", () => {
    const state = stateWithCounts({
      3: 5,
      7: 5,
      12: 10,
      15: 10,
      20: 1,
    });

    expect(computeDisplayPinKg(state)).toEqual([12, 15, 3, 7]);
  });

  it("fills sparse history with default pin candidates", () => {
    const state = stateWithCounts({ 10: 3 });

    expect(computeDisplayPinKg(state)).toEqual([10, 5, 8, 16]);
  });

  it("keeps pin order frozen during session after confirm", () => {
    const storage = createMemoryStorage();
    const initial = loadFlourUsageState(storage);
    const session = beginDisplayPinSession(initial);

    expect(getDisplayPinSessionPins(session)).toEqual([5, 8, 10, 16]);

    recordFlourUsageOnConfirm(
      { totalFlourKg: 10, confirmToken: "confirm-a" },
      storage,
    );

    expect(getDisplayPinSessionPins(session)).toEqual([5, 8, 10, 16]);

    const reloaded = loadFlourUsageState(storage);

    expect(computeDisplayPinKg(reloaded)).toEqual([10, 5, 8, 16]);
  });
});

describe("flour-usage storage", () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("does not record when only selecting (no confirm API call)", () => {
    const before = loadFlourUsageState(storage);
    const after = loadFlourUsageState(storage);

    expect(after).toEqual(before);
    expect(getFlourUsageCount(after, 10)).toBe(0);
  });

  it("increments count on confirm for 10kg", () => {
    const result = recordFlourUsageOnConfirm(
      { totalFlourKg: 10, confirmToken: "t1" },
      storage,
    );

    expect(result.recorded).toBe(true);

    const state = loadFlourUsageState(storage);

    expect(getFlourUsageCount(state, 10)).toBe(1);
  });

  it("dedupes the same confirm token", () => {
    recordFlourUsageOnConfirm({ totalFlourKg: 10, confirmToken: "dup" }, storage);
    const second = recordFlourUsageOnConfirm(
      { totalFlourKg: 10, confirmToken: "dup" },
      storage,
    );

    expect(second).toMatchObject({ recorded: false, reason: "duplicate" });
    expect(getFlourUsageCount(loadFlourUsageState(storage), 10)).toBe(1);
  });

  it("allows two confirms with different tokens for same kg", () => {
    recordFlourUsageOnConfirm({ totalFlourKg: 10, confirmToken: "a" }, storage);
    recordFlourUsageOnConfirm({ totalFlourKg: 10, confirmToken: "b" }, storage);

    expect(getFlourUsageCount(loadFlourUsageState(storage), 10)).toBe(2);
  });

  it("parses invalid storage safely", () => {
    expect(parseFlourUsageStorageState("{bad")).toEqual({
      version: 1,
      counts: {},
      recentConfirmTokens: [],
    });

    const weird = parseFlourUsageStorageState(
      JSON.stringify({
        version: 1,
        counts: { "10": "x", "99": 5, "-1": 2 },
        recentConfirmTokens: [1, null, "ok"],
      }),
    );

    expect(weird.counts).toEqual({});
    expect(weird.recentConfirmTokens).toEqual(["ok"]);
  });

  it("does not corrupt existing counts when parsing partial junk", () => {
    const good = parseFlourUsageStorageState(
      JSON.stringify({
        counts: { "5": 2, "foo": 9 },
      }),
    );

    expect(good.counts).toEqual({ "5": 2 });
  });

  it("works when localStorage is unavailable (read returns empty)", () => {
    const state = loadFlourUsageState(createThrowingStorage());

    expect(state.counts).toEqual({});
  });

  it("returns write_failed without throwing when setItem fails", () => {
    const result = recordFlourUsageOnConfirm(
      { totalFlourKg: 8, confirmToken: "w1" },
      createThrowingStorage(),
    );

    expect(result).toMatchObject({ ok: false, reason: "write_failed" });
  });

  it("persists under dedicated key without touching other keys", () => {
    storage.setItem("pizzalab-profiles-v1", '{"profiles":[]}');

    recordFlourUsageOnConfirm({ totalFlourKg: 16, confirmToken: "k1" }, storage);

    expect(storage.getItem("pizzalab-profiles-v1")).toBe('{"profiles":[]}');
    expect(storage.getItem(FLOUR_USAGE_STORAGE_KEY)).toContain('"16":1');
  });

  it("round-trips serialize and parse", () => {
    const state: FlourUsageStorageState = {
      version: 1,
      counts: { "10": 4 },
      recentConfirmTokens: ["a"],
    };

    const parsed = parseFlourUsageStorageState(
      serializeFlourUsageStorageState(state),
    );

    expect(parsed).toEqual(state);
  });
});