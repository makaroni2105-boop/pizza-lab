import { describe, expect, it, beforeEach } from "vitest";

import {
  createFlourBlend,
  deleteFlourBlend,
  formatComponentLabel,
  getFlourBlend,
  listFlourBlends,
  listFlourBlendsByShopId,
  parseBlendStorageState,
  parseComponentLabel,
  saveFlourBlend,
  LAB_STORAGE_KEYS,
} from "./blend-storage";
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

function validComponents() {
  return [
    { flourId: "flour-a", percent: 70, label: "Caputo Pizzeria（ベース）" },
    { flourId: "flour-b", percent: 30, label: "国産小麦（香り）" },
  ];
}

describe("blend-storage", () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("creates blend with default components", () => {
    const blend = createFlourBlend(
      {
        shopId: "shop-1",
        name: "  VPN 用ブレンド  ",
        notes: "  香りを足す  ",
      },
      () => new Date("2026-07-07T10:00:00.000Z").getTime(),
    );

    expect(blend.name).toBe("VPN 用ブレンド");
    expect(blend.notes).toBe("香りを足す");
    expect(blend.components).toHaveLength(2);
    expect(blend.createdAt).toBe("2026-07-07T10:00:00.000Z");
  });

  it("saves and lists blends newest first", () => {
    const older = createFlourBlend({ shopId: "shop-1", name: "Older", components: validComponents() });
    const newer = createFlourBlend({ shopId: "shop-1", name: "Newer", components: validComponents() });

    saveFlourBlend({ ...older, updatedAt: "2026-07-07T09:00:00.000Z" }, storage);
    saveFlourBlend({ ...newer, updatedAt: "2026-07-07T11:00:00.000Z" }, storage);

    const blends = listFlourBlends(storage);
    expect(blends).toHaveLength(2);
    expect(blends[0]?.name).toBe("Newer");
  });

  it("filters blends by shop id", () => {
    saveFlourBlend(
      createFlourBlend({ shopId: "shop-a", name: "A", components: validComponents() }),
      storage,
    );
    saveFlourBlend(
      createFlourBlend({ shopId: "shop-b", name: "B", components: validComponents() }),
      storage,
    );

    expect(listFlourBlendsByShopId("shop-a", storage)).toHaveLength(1);
    expect(listFlourBlendsByShopId("shop-a", storage)[0]?.name).toBe("A");
  });

  it("rejects invalid percent totals", () => {
    const blend = createFlourBlend({ shopId: "shop-1", name: "Invalid" });
    const invalid = {
      ...blend,
      components: [
        { flourId: "flour-a", percent: 60, label: "A" },
        { flourId: "flour-b", percent: 30, label: "B" },
      ],
    };

    const result = saveFlourBlend(invalid, storage);
    expect(result.ok).toBe(false);
  });

  it("saves valid blend components", () => {
    const blend = createFlourBlend({
      shopId: "shop-1",
      name: "Valid",
      components: validComponents(),
    });

    const result = saveFlourBlend(blend, storage);
    expect(result.ok).toBe(true);
    expect(getFlourBlend(blend.id, storage)?.components).toHaveLength(2);
  });

  it("deletes blend", () => {
    const blend = createFlourBlend({
      shopId: "shop-1",
      name: "Delete me",
      components: validComponents(),
    });
    saveFlourBlend(blend, storage);

    expect(deleteFlourBlend(blend.id, storage)).toBe(true);
    expect(getFlourBlend(blend.id, storage)).toBeNull();
    expect(listFlourBlends(storage)).toHaveLength(0);
  });

  it("parses invalid storage safely", () => {
    expect(parseBlendStorageState(null).blends).toEqual([]);
    expect(parseBlendStorageState("{bad").blends).toEqual([]);
    expect(parseBlendStorageState(JSON.stringify({ blends: [{ id: "x" }] })).blends).toEqual([]);
  });

  it("formats and parses component labels with role", () => {
    expect(formatComponentLabel("Caputo", "ベース")).toBe("Caputo（ベース）");
    expect(parseComponentLabel("Caputo（ベース）")).toEqual({
      flourName: "Caputo",
      role: "ベース",
    });
    expect(parseComponentLabel("Caputo")).toEqual({ flourName: "Caputo", role: "" });
  });

  it("uses LAB_STORAGE_KEYS.blends", () => {
    const blend = createFlourBlend({
      shopId: "shop-1",
      name: "Stored",
      components: validComponents(),
    });
    saveFlourBlend(blend, storage);

    const raw = storage.getItem(LAB_STORAGE_KEYS.blends);
    expect(raw).toContain("Stored");
  });
});
