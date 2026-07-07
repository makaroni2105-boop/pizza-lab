/**
 * pizza_lab_shops Repository。
 */

import { queryAll, queryFirst, execute } from "./d1-client";
import { PIZZA_LAB_TABLES, type D1Database, type PizzaLabShopRow, type ShopUpsertInput } from "./d1-types";

const TABLE = PIZZA_LAB_TABLES.shops;

export async function findShopById(
  db: D1Database,
  id: string,
): Promise<PizzaLabShopRow | null> {
  return queryFirst<PizzaLabShopRow>(
    db,
    `SELECT * FROM ${TABLE} WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
}

export async function listActiveShops(db: D1Database): Promise<PizzaLabShopRow[]> {
  return queryAll<PizzaLabShopRow>(
    db,
    `SELECT * FROM ${TABLE} WHERE deleted_at IS NULL ORDER BY updated_at DESC`,
  );
}

export async function upsertShop(db: D1Database, input: ShopUpsertInput): Promise<void> {
  await execute(
    db,
    `INSERT OR REPLACE INTO ${TABLE} (
      id, name, city, country, latitude, longitude,
      setup_completed_at, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    input.id,
    input.name,
    input.city ?? null,
    input.country ?? null,
    input.latitude ?? null,
    input.longitude ?? null,
    input.setupCompletedAt ?? null,
    input.createdAt,
    input.updatedAt,
  );
}

export async function softDeleteShop(db: D1Database, id: string, deletedAt: string): Promise<boolean> {
  const result = await execute(
    db,
    `UPDATE ${TABLE} SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    deletedAt,
    deletedAt,
    id,
  );

  return result.meta.changes > 0;
}

export function shopRowToLocation(row: PizzaLabShopRow): {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
} | undefined {
  if (
    row.city === null &&
    row.country === null &&
    row.latitude === null &&
    row.longitude === null
  ) {
    return undefined;
  }

  return {
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
  };
}
