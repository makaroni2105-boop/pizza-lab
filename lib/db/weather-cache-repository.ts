/**
 * pizza_lab_weather_cache Repository。
 */

import type { WeatherCurrent } from "@/lib/weather/weather-types";

import { buildWeatherCacheKey, queryFirst, execute } from "./d1-client";
import { PIZZA_LAB_TABLES, type D1Database, type PizzaLabWeatherCacheRow } from "./d1-types";

const TABLE = PIZZA_LAB_TABLES.weatherCache;

export async function findValidWeatherCache(
  db: D1Database,
  cacheKey: string,
  nowIso: string,
): Promise<WeatherCurrent | null> {
  const row = await queryFirst<PizzaLabWeatherCacheRow>(
    db,
    `SELECT * FROM ${TABLE} WHERE cache_key = ? AND expires_at > ?`,
    cacheKey,
    nowIso,
  );

  return row ? rowToWeatherCurrent(row) : null;
}

export async function findValidWeatherCacheByCoordinates(
  db: D1Database,
  latitude: number,
  longitude: number,
  nowIso: string,
): Promise<WeatherCurrent | null> {
  return findValidWeatherCache(db, buildWeatherCacheKey(latitude, longitude), nowIso);
}

export interface WeatherCacheLookup {
  weather: WeatherCurrent;
  expiresAtIso: string;
}

export async function findValidWeatherCacheEntry(
  db: D1Database,
  latitude: number,
  longitude: number,
  nowIso: string,
): Promise<WeatherCacheLookup | null> {
  const row = await queryFirst<PizzaLabWeatherCacheRow>(
    db,
    `SELECT * FROM ${TABLE} WHERE cache_key = ? AND expires_at > ?`,
    buildWeatherCacheKey(latitude, longitude),
    nowIso,
  );

  if (!row) {
    return null;
  }

  return {
    weather: rowToWeatherCurrent(row),
    expiresAtIso: row.expires_at,
  };
}

export async function upsertWeatherCache(
  db: D1Database,
  weather: WeatherCurrent,
  expiresAtIso: string,
): Promise<void> {
  const cacheKey = buildWeatherCacheKey(weather.latitude, weather.longitude);

  await execute(
    db,
    `INSERT OR REPLACE INTO ${TABLE} (
      cache_key, latitude, longitude,
      ambient_temp_c, ambient_humidity_pct,
      source, fetched_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    cacheKey,
    weather.latitude,
    weather.longitude,
    weather.ambientTempC,
    weather.ambientHumidityPct,
    weather.source,
    weather.fetchedAt,
    expiresAtIso,
  );
}

export async function deleteExpiredWeatherCache(db: D1Database, nowIso: string): Promise<number> {
  const result = await execute(
    db,
    `DELETE FROM ${TABLE} WHERE expires_at <= ?`,
    nowIso,
  );

  return result.meta.changes;
}

function rowToWeatherCurrent(row: PizzaLabWeatherCacheRow): WeatherCurrent {
  return {
    ambientTempC: row.ambient_temp_c,
    ambientHumidityPct: row.ambient_humidity_pct,
    fetchedAt: row.fetched_at,
    latitude: row.latitude,
    longitude: row.longitude,
    source: row.source,
  };
}

export function weatherCurrentToExpiresAtIso(fetchedAtIso: string, ttlMs: number): string {
  return new Date(new Date(fetchedAtIso).getTime() + ttlMs).toISOString();
}
