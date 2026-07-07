import { describe, expect, it, beforeEach } from "vitest";

import type { ShopProfile } from "@/types/profile";

import {
  createDefaultShopProfile,
  deleteProfile,
  getProfile,
  getQuickShopOptions,
  getSelectedShopId,
  listProfiles,
  parseProfileStorageState,
  resolveQuickShopSelection,
  saveProfile,
  setSelectedShopId,
  DEMO_SHOP_ID,
  PROFILE_STORAGE_KEY,
} from "./profile-storage";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();

  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
  };
}

describe("profile-storage", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("creates and lists profiles", () => {
    const profile = createDefaultShopProfile("My Shop");
    saveProfile(profile, storage);

    expect(listProfiles(storage)).toHaveLength(1);
    expect(getProfile(profile.id, storage)?.name).toBe("My Shop");
  });

  it("updates an existing profile", () => {
    const profile = createDefaultShopProfile("Original");
    saveProfile(profile, storage);

    const updated: ShopProfile = { ...profile, name: "Renamed" };
    saveProfile(updated, storage);

    expect(listProfiles(storage)).toHaveLength(1);
    expect(getProfile(profile.id, storage)?.name).toBe("Renamed");
  });

  it("deletes a profile and clears selection", () => {
    const profile = createDefaultShopProfile("To Delete");
    saveProfile(profile, storage);
    setSelectedShopId(profile.id, storage);

    expect(deleteProfile(profile.id, storage)).toBe(true);
    expect(listProfiles(storage)).toHaveLength(0);
    expect(getSelectedShopId(storage)).toBeNull();
  });

  it("parses invalid storage safely", () => {
    expect(parseProfileStorageState("{bad json")).toEqual({
      profiles: [],
      selectedShopId: null,
    });
  });

  it("includes demo shop in quick options and resolves saved profile", () => {
    const profile = createDefaultShopProfile("Saved Shop");
    saveProfile(profile, storage);

    const options = getQuickShopOptions(storage);
    expect(options[0]?.shopId).toBe(DEMO_SHOP_ID);
    expect(options.some((option) => option.shopId === profile.id)).toBe(true);

    const resolved = resolveQuickShopSelection(profile.id, storage);
    expect(resolved.profile?.name).toBe("Saved Shop");

    const demoResolved = resolveQuickShopSelection(DEMO_SHOP_ID, storage);
    expect(demoResolved.profile).toBeUndefined();
  });

  it("persists selected shop id under storage key", () => {
    setSelectedShopId("shop-abc", storage);
    const raw = storage.getItem(PROFILE_STORAGE_KEY);
    expect(raw).toContain("shop-abc");
  });
});
