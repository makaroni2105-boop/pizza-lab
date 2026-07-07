/**
 * 店舗プロファイルの localStorage 永続化（Phase 1b）。
 * ブラウザのみ。DB 未実装時のクライアント側 CRUD。
 */

import type { ShopProfile } from "@/types/profile";

import { getDemoShopProfile } from "./demo-profiles";

export const DEMO_SHOP_ID = "shop-1";
export const PROFILE_STORAGE_KEY = "pizzalab-profiles-v1";

export interface ProfileStorageState {
  profiles: ShopProfile[];
  selectedShopId: string | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface QuickShopOption {
  shopId: string;
  name: string;
  isDemo: boolean;
  profile?: ShopProfile;
}

const EMPTY_STATE: ProfileStorageState = {
  profiles: [],
  selectedShopId: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isShopProfile(value: unknown): value is ShopProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isRecord(value.flour) &&
    isRecord(value.mixer) &&
    isRecord(value.method) &&
    isRecord(value.ddt) &&
    Array.isArray(value.presets)
  );
}

export function parseProfileStorageState(raw: string | null): ProfileStorageState {
  if (!raw) {
    return { ...EMPTY_STATE };
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed) || !Array.isArray(parsed.profiles)) {
      return { ...EMPTY_STATE };
    }

    const profiles = parsed.profiles.filter(isShopProfile);
    const selectedShopId =
      typeof parsed.selectedShopId === "string" ? parsed.selectedShopId : null;

    return { profiles, selectedShopId };
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function serializeProfileStorageState(state: ProfileStorageState): string {
  return JSON.stringify(state);
}

function readState(storage: StorageLike): ProfileStorageState {
  return parseProfileStorageState(storage.getItem(PROFILE_STORAGE_KEY));
}

function writeState(storage: StorageLike, state: ProfileStorageState): void {
  storage.setItem(PROFILE_STORAGE_KEY, serializeProfileStorageState(state));
}

export function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function listProfiles(storage?: StorageLike): ShopProfile[] {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return [];
  }

  return readState(store).profiles;
}

export function getProfile(id: string, storage?: StorageLike): ShopProfile | null {
  return listProfiles(storage).find((profile) => profile.id === id) ?? null;
}

export function getSelectedShopId(storage?: StorageLike): string | null {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return null;
  }

  return readState(store).selectedShopId;
}

export function setSelectedShopId(shopId: string | null, storage?: StorageLike): void {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return;
  }

  const state = readState(store);
  writeState(store, { ...state, selectedShopId: shopId });
}

export function saveProfile(profile: ShopProfile, storage?: StorageLike): ShopProfile {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return profile;
  }

  const state = readState(store);
  const now = new Date().toISOString();
  const nextProfile: ShopProfile = {
    ...profile,
    updatedAt: now,
    createdAt: profile.createdAt ?? now,
  };

  const index = state.profiles.findIndex((item) => item.id === nextProfile.id);
  const profiles =
    index >= 0
      ? state.profiles.map((item, itemIndex) =>
          itemIndex === index ? nextProfile : item,
        )
      : [...state.profiles, nextProfile];

  writeState(store, { ...state, profiles });
  return nextProfile;
}

export function deleteProfile(id: string, storage?: StorageLike): boolean {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return false;
  }

  const state = readState(store);
  const profiles = state.profiles.filter((profile) => profile.id !== id);

  if (profiles.length === state.profiles.length) {
    return false;
  }

  const selectedShopId =
    state.selectedShopId === id ? null : state.selectedShopId;

  writeState(store, { profiles, selectedShopId });
  return true;
}

export function generateShopId(): string {
  return `shop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDefaultShopProfile(name: string, id?: string): ShopProfile {
  const now = new Date().toISOString();
  const profileId = id ?? generateShopId();

  const method = {
    method: "napoli" as const,
    hydrationPercent: 65,
    saltPercent: 2.5,
    yeastType: "dry" as const,
    yeastPercent: 0.2,
    fermentationType: "cold" as const,
    fermentationHours: 24,
    ballWeightG: 250,
  };

  return {
    id: profileId,
    name,
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
    method,
    ddt: {
      defaultDdt: 24,
      summerDdt: 24,
      winterDdt: 26,
    },
    defaultPresetId: "preset-1",
    presets: [
      {
        id: "preset-1",
        name: "平日営業",
        type: "business",
        method: { ...method },
        targetDdt: 24,
        ballWeightG: method.ballWeightG ?? 250,
        isDefault: true,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function buildProfileFromForm(input: {
  id?: string;
  name: string;
  primaryFlourId: string;
  mixerType: ShopProfile["mixer"]["type"];
  mixerModelId: string;
  hydrationPercent: number;
  saltPercent: number;
  yeastType: ShopProfile["method"]["yeastType"];
  yeastPercent: number;
  defaultDdt: number;
  ballWeightG: number;
  fermentationHours: number;
  existing?: ShopProfile | null;
}): ShopProfile {
  const base = input.existing ?? createDefaultShopProfile(input.name, input.id);
  const now = new Date().toISOString();

  const method = {
    ...base.method,
    method: "napoli" as const,
    hydrationPercent: input.hydrationPercent,
    saltPercent: input.saltPercent,
    yeastType: input.yeastType ?? "dry",
    yeastPercent: input.yeastPercent,
    ballWeightG: input.ballWeightG,
    fermentationType: "cold" as const,
    fermentationHours: input.fermentationHours,
  };

  const defaultPresetId = base.defaultPresetId ?? "preset-1";
  const presets = base.presets.length
    ? base.presets.map((preset) =>
        preset.id === defaultPresetId || preset.isDefault
          ? {
              ...preset,
              name: preset.name || "平日営業",
              method: { ...method },
              targetDdt: input.defaultDdt,
              ballWeightG: input.ballWeightG,
              isDefault: true,
            }
          : preset,
      )
    : [
        {
          id: "preset-1",
          name: "平日営業",
          type: "business" as const,
          method: { ...method },
          targetDdt: input.defaultDdt,
          ballWeightG: input.ballWeightG,
          isDefault: true,
        },
      ];

  return {
    ...base,
    id: input.id ?? base.id,
    name: input.name.trim(),
    flour: {
      ...base.flour,
      primaryFlourId: input.primaryFlourId,
    },
    mixer: {
      ...base.mixer,
      type: input.mixerType,
      modelId: input.mixerModelId,
    },
    method,
    ddt: {
      ...base.ddt,
      defaultDdt: input.defaultDdt,
    },
    defaultPresetId,
    presets,
    updatedAt: now,
    createdAt: base.createdAt ?? now,
  };
}

export function getQuickShopOptions(storage?: StorageLike): QuickShopOption[] {
  const demo = getDemoShopProfile(DEMO_SHOP_ID);
  const options: QuickShopOption[] = [];

  if (demo) {
    options.push({
      shopId: DEMO_SHOP_ID,
      name: `${demo.name}（サンプル）`,
      isDemo: true,
    });
  }

  for (const profile of listProfiles(storage)) {
    options.push({
      shopId: profile.id,
      name: profile.name,
      isDemo: false,
      profile,
    });
  }

  return options;
}

export function resolveQuickShopSelection(
  shopId: string,
  storage?: StorageLike,
): { shopId: string; profile?: ShopProfile } {
  if (shopId === DEMO_SHOP_ID) {
    return { shopId: DEMO_SHOP_ID };
  }

  const profile = getProfile(shopId, storage);

  if (profile) {
    return { shopId: profile.id, profile };
  }

  return { shopId: DEMO_SHOP_ID };
}

export function getDefaultPresetId(profile: ShopProfile | null | undefined): string {
  if (!profile || profile.presets.length === 0) {
    return "preset-1";
  }

  const defaultPreset =
    profile.presets.find((preset) => preset.id === profile.defaultPresetId) ??
    profile.presets.find((preset) => preset.isDefault) ??
    profile.presets[0];

  return defaultPreset.id;
}
