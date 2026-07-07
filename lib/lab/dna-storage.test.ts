import { describe, expect, it, beforeEach } from "vitest";

import {
  countSetDNAScores,
  createDoughDNA,
  createEmptyDNAScores,
  deleteDoughDNA,
  getDoughDNA,
  listDoughDNA,
  listDoughDNAByShopId,
  parseDnaStorageState,
  saveDoughDNA,
  LAB_STORAGE_KEYS,
} from "./dna-storage";
import type { StorageLike } from "@/lib/profile/profile-storage";

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

describe("dna-storage", () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("creates DNA with empty scores", () => {
    const profile = createDoughDNA(
      {
        shopId: "shop-1",
        name: "  平日営業の理想  ",
        presetType: "business",
      },
      () => new Date("2026-07-07T10:00:00.000Z").getTime(),
    );

    expect(profile.name).toBe("平日営業の理想");
    expect(profile.presetType).toBe("business");
    expect(profile.scores.lightness).toBeNull();
    expect(countSetDNAScores(profile.scores)).toBe(0);
    expect(profile.createdAt).toBe("2026-07-07T10:00:00.000Z");
  });

  it("saves and lists DNA newest first", () => {
    const older = createDoughDNA({ shopId: "shop-1", name: "Older" });
    const newer = createDoughDNA({ shopId: "shop-1", name: "Newer" });

    saveDoughDNA({ ...older, updatedAt: "2026-07-07T09:00:00.000Z" }, storage);
    saveDoughDNA({ ...newer, updatedAt: "2026-07-07T11:00:00.000Z" }, storage);

    const profiles = listDoughDNA(storage);
    expect(profiles).toHaveLength(2);
    expect(profiles[0]?.name).toBe("Newer");
  });

  it("filters DNA by shop id", () => {
    saveDoughDNA(createDoughDNA({ shopId: "shop-a", name: "A" }), storage);
    saveDoughDNA(createDoughDNA({ shopId: "shop-b", name: "B" }), storage);

    expect(listDoughDNAByShopId("shop-a", storage)).toHaveLength(1);
    expect(listDoughDNAByShopId("shop-a", storage)[0]?.name).toBe("A");
  });

  it("updates scores and rejects invalid values", () => {
    const profile = createDoughDNA({ shopId: "shop-1", name: "Test" });
    saveDoughDNA(profile, storage);

    const updated = {
      ...profile,
      scores: { ...createEmptyDNAScores(), lightness: 72, chewiness: 55 },
    };
    const result = saveDoughDNA(updated, storage);

    expect(result.ok).toBe(true);
    expect(getDoughDNA(profile.id, storage)?.scores.lightness).toBe(72);

    const invalid = {
      ...profile,
      scores: { lightness: 150 },
    };
    const invalidResult = saveDoughDNA(invalid, storage);

    expect(invalidResult.ok).toBe(false);
  });

  it("deletes DNA", () => {
    const profile = createDoughDNA({ shopId: "shop-1", name: "Delete me" });
    saveDoughDNA(profile, storage);

    expect(deleteDoughDNA(profile.id, storage)).toBe(true);
    expect(getDoughDNA(profile.id, storage)).toBeNull();
    expect(listDoughDNA(storage)).toHaveLength(0);
  });

  it("parses invalid storage safely", () => {
    expect(parseDnaStorageState(null).profiles).toEqual([]);
    expect(parseDnaStorageState("{bad").profiles).toEqual([]);
    expect(
      parseDnaStorageState(JSON.stringify({ profiles: [{ id: "x" }] })).profiles,
    ).toEqual([]);
  });

  it("uses LAB_STORAGE_KEYS.dna", () => {
    const profile = createDoughDNA({ shopId: "shop-1", name: "Stored" });
    saveDoughDNA(profile, storage);

    const raw = storage.getItem(LAB_STORAGE_KEYS.dna);
    expect(raw).toContain("Stored");
  });
});
