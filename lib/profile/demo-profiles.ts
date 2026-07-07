/**
 * Phase 1b: DB 未実装時のデモ店舗プロファイル。
 * 本番 CRUD 実装後は lib/profile/ の永続化層に置き換える。
 */

import type { ShopProfile } from "@/types/profile";

const DEMO_SHOP_PROFILES: Record<string, ShopProfile> = {
  "shop-1": {
    id: "shop-1",
    name: "Demo Pizzeria",
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
    method: {
      method: "napoli",
      hydrationPercent: 65,
      saltPercent: 2.5,
      yeastType: "dry",
      yeastPercent: 0.2,
      fermentationType: "cold",
      fermentationHours: 24,
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
  },
};

export function getDemoShopProfile(shopId: string): ShopProfile | null {
  return DEMO_SHOP_PROFILES[shopId] ?? null;
}

export function resolveShopProfile(
  shopId: string,
  profileFromRequest?: ShopProfile | null,
): ShopProfile | null {
  if (profileFromRequest && profileFromRequest.id === shopId) {
    return profileFromRequest;
  }

  return getDemoShopProfile(shopId);
}
