/**
 * pizza_lab_profiles Repository。
 */

import type { LearningSummary, ShopProfile } from "@/types/profile";

import { queryFirst, execute } from "./d1-client";
import {
  findShopById,
  listActiveShops,
  shopRowToLocation,
  softDeleteShop,
  upsertShop,
} from "./shop-repository";
import {
  PIZZA_LAB_TABLES,
  type D1Database,
  type PizzaLabProfileRow,
  type PizzaLabShopRow,
  type ProfileUpsertInput,
  type ShopUpsertInput,
} from "./d1-types";

const TABLE = PIZZA_LAB_TABLES.profiles;

export async function findProfileByShopId(
  db: D1Database,
  shopId: string,
): Promise<PizzaLabProfileRow | null> {
  return queryFirst<PizzaLabProfileRow>(
    db,
    `SELECT * FROM ${TABLE} WHERE shop_id = ?`,
    shopId,
  );
}

export async function upsertProfile(db: D1Database, input: ProfileUpsertInput): Promise<void> {
  await execute(
    db,
    `INSERT OR REPLACE INTO ${TABLE} (
      shop_id, default_preset_id,
      flour_json, mixer_json, method_json, ddt_json,
      presets_json, learning_json, schema_version, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.shopId,
    input.defaultPresetId ?? null,
    input.flourJson,
    input.mixerJson,
    input.methodJson,
    input.ddtJson,
    input.presetsJson,
    input.learningJson,
    input.schemaVersion ?? 1,
    input.updatedAt,
  );
}

export function profileRowToShopProfileParts(
  row: PizzaLabProfileRow,
): Pick<
  ShopProfile,
  "defaultPresetId" | "flour" | "mixer" | "method" | "ddt" | "presets" | "learning"
> {
  return {
    defaultPresetId: row.default_preset_id ?? undefined,
    flour: JSON.parse(row.flour_json) as ShopProfile["flour"],
    mixer: JSON.parse(row.mixer_json) as ShopProfile["mixer"],
    method: JSON.parse(row.method_json) as ShopProfile["method"],
    ddt: JSON.parse(row.ddt_json) as ShopProfile["ddt"],
    presets: JSON.parse(row.presets_json) as ShopProfile["presets"],
    learning: JSON.parse(row.learning_json) as LearningSummary[],
  };
}

export function shopProfileToProfileUpsert(profile: ShopProfile): ProfileUpsertInput {
  return {
    shopId: profile.id,
    defaultPresetId: profile.defaultPresetId ?? null,
    flourJson: JSON.stringify(profile.flour),
    mixerJson: JSON.stringify(profile.mixer),
    methodJson: JSON.stringify(profile.method),
    ddtJson: JSON.stringify(profile.ddt),
    presetsJson: JSON.stringify(profile.presets),
    learningJson: JSON.stringify(profile.learning ?? []),
    schemaVersion: 1,
    updatedAt: profile.updatedAt ?? new Date().toISOString(),
  };
}

export function shopProfileToShopUpsert(profile: ShopProfile): ShopUpsertInput {
  return {
    id: profile.id,
    name: profile.name,
    city: profile.location?.city ?? null,
    country: profile.location?.country ?? null,
    latitude: profile.location?.latitude ?? null,
    longitude: profile.location?.longitude ?? null,
    setupCompletedAt: profile.setupCompletedAt ?? null,
    createdAt: profile.createdAt ?? new Date().toISOString(),
    updatedAt: profile.updatedAt ?? new Date().toISOString(),
  };
}

export function shopRowToShopProfile(
  shop: PizzaLabShopRow,
  profileRow: PizzaLabProfileRow | null,
): ShopProfile | null {
  if (!profileRow) {
    return null;
  }

  const parts = profileRowToShopProfileParts(profileRow);

  return {
    id: shop.id,
    name: shop.name,
    location: shopRowToLocation(shop),
    setupCompletedAt: shop.setup_completed_at,
    createdAt: shop.created_at,
    updatedAt: shop.updated_at,
    ...parts,
  };
}

export async function findShopProfileById(
  db: D1Database,
  shopId: string,
): Promise<ShopProfile | null> {
  const shop = await findShopById(db, shopId);
  if (!shop) {
    return null;
  }

  const profileRow = await findProfileByShopId(db, shopId);
  return shopRowToShopProfile(shop, profileRow);
}

export async function listShopProfiles(db: D1Database): Promise<ShopProfile[]> {
  const shops = await listActiveShops(db);
  const profiles: ShopProfile[] = [];

  for (const shop of shops) {
    const profileRow = await findProfileByShopId(db, shop.id);
    const profile = shopRowToShopProfile(shop, profileRow);
    if (profile) {
      profiles.push(profile);
    }
  }

  return profiles;
}

export async function upsertShopProfile(db: D1Database, profile: ShopProfile): Promise<void> {
  await upsertShop(db, shopProfileToShopUpsert(profile));
  await upsertProfile(db, shopProfileToProfileUpsert(profile));
}

export async function softDeleteShopProfile(
  db: D1Database,
  shopId: string,
  deletedAt: string,
): Promise<boolean> {
  return softDeleteShop(db, shopId, deletedAt);
}
