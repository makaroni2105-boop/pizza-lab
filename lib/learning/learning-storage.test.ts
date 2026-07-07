import { describe, expect, it, beforeEach } from "vitest";

import { createLearningRun } from "./learning-run";
import {
  applyStoredLearningToProfile,
  buildProfileLearningFromRuns,
  deleteLearningRun,
  listLearningRunsByShopId,
  parseLearningStorageState,
  recordLearningRun,
  saveLearningRun,
} from "./learning-storage";
import type { StorageLike } from "@/lib/profile/profile-storage";
import {
  createDefaultShopProfile,
  saveProfile,
} from "@/lib/profile/profile-storage";

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

function makeRun(index: number, shopId = "shop-a") {
  return createLearningRun({
    id: `run-${index}`,
    shopId,
    mixerKey: "spiral:spiral-spiral-55",
    recordedAt: `2026-07-06T${String(index).padStart(2, "0")}:00:00.000Z`,
    snapshot: { flourTempC: 20, waterTempC: 10, roomTempC: 26 },
    predictedFrictionC: 14,
    predictedDoughTempC: 24,
    actualDoughTempC: 24 + index * 0.2,
    targetDdtC: 24,
    craftsmanScore: 4,
  });
}

describe("learning-storage", () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("saves and lists runs by shop id", () => {
    saveLearningRun(makeRun(1), storage);
    saveLearningRun(makeRun(2, "shop-b"), storage);

    expect(listLearningRunsByShopId("shop-a", storage)).toHaveLength(1);
    expect(listLearningRunsByShopId("shop-b", storage)).toHaveLength(1);
  });

  it("deletes a run", () => {
    saveLearningRun(makeRun(1), storage);
    expect(deleteLearningRun("run-1", storage)).toBe(true);
    expect(listLearningRunsByShopId("shop-a", storage)).toHaveLength(0);
  });

  it("parses invalid storage safely", () => {
    expect(parseLearningStorageState("{bad")).toEqual({ runs: [] });
  });

  it("builds profile learning summaries from runs", () => {
    const runs = Array.from({ length: 6 }, (_, index) => makeRun(index + 1));
    const learning = buildProfileLearningFromRuns("shop-a", runs);

    expect(learning).toHaveLength(1);
    expect(learning[0]?.runCount).toBe(6);
    expect(learning[0]?.isLearningComplete).toBe(true);
  });

  it("updates saved profile learning when recording", () => {
    const profile = createDefaultShopProfile("Test Shop");
    saveProfile(profile, storage);

    const { profile: updated } = recordLearningRun(makeRun(1, profile.id), storage);

    expect(updated?.learning?.[0]?.runCount).toBe(1);
    expect(applyStoredLearningToProfile(profile, storage).learning?.[0]?.runCount).toBe(
      1,
    );
  });
});
