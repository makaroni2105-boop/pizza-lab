import { describe, expect, it, beforeEach } from "vitest";

import { WEATHER_CACHE_TTL_MS } from "@/lib/weather/weather-types";

import { createMemoryD1 } from "./d1-mock";
import {
  deleteExpiredWeatherCache,
  findValidWeatherCacheByCoordinates,
  findValidWeatherCacheEntry,
  upsertWeatherCache,
  weatherCurrentToExpiresAtIso,
} from "./weather-cache-repository";

describe("weather-cache-repository", () => {
  const db = createMemoryD1();

  beforeEach(() => {
    db.clear();
  });

  it("stores and reads valid cache entry", async () => {
    const fetchedAt = "2026-07-07T10:00:00.000Z";
    const expiresAt = weatherCurrentToExpiresAtIso(fetchedAt, WEATHER_CACHE_TTL_MS);

    await upsertWeatherCache(
      db,
      {
        ambientTempC: 28,
        ambientHumidityPct: 65,
        fetchedAt,
        latitude: 35.6762,
        longitude: 139.6503,
        source: "open-meteo",
      },
      expiresAt,
    );

    const cached = await findValidWeatherCacheByCoordinates(
      db,
      35.6762,
      139.6503,
      "2026-07-07T10:15:00.000Z",
    );

    expect(cached?.ambientTempC).toBe(28);
  });

  it("returns null for expired cache", async () => {
    const fetchedAt = "2026-07-07T10:00:00.000Z";
    const expiresAt = weatherCurrentToExpiresAtIso(fetchedAt, WEATHER_CACHE_TTL_MS);

    await upsertWeatherCache(
      db,
      {
        ambientTempC: 28,
        ambientHumidityPct: 65,
        fetchedAt,
        latitude: 35.6762,
        longitude: 139.6503,
        source: "open-meteo",
      },
      expiresAt,
    );

    const cached = await findValidWeatherCacheByCoordinates(
      db,
      35.6762,
      139.6503,
      "2026-07-07T11:00:00.000Z",
    );

    expect(cached).toBeNull();
  });

  it("returns valid cache entry with expiresAt", async () => {
    const fetchedAt = "2026-07-07T10:00:00.000Z";
    const expiresAt = weatherCurrentToExpiresAtIso(fetchedAt, WEATHER_CACHE_TTL_MS);

    await upsertWeatherCache(
      db,
      {
        ambientTempC: 30,
        ambientHumidityPct: 55,
        fetchedAt,
        latitude: 35.6762,
        longitude: 139.6503,
        source: "open-meteo",
      },
      expiresAt,
    );

    const entry = await findValidWeatherCacheEntry(
      db,
      35.6762,
      139.6503,
      "2026-07-07T10:15:00.000Z",
    );

    expect(entry?.weather.ambientTempC).toBe(30);
    expect(entry?.expiresAtIso).toBe(expiresAt);
  });

  it("deletes expired rows", async () => {
    const db2 = createMemoryD1();
    db2.seed("pizza_lab_weather_cache", [
      {
        cache_key: "35.6762:139.6503",
        latitude: 35.6762,
        longitude: 139.6503,
        ambient_temp_c: 28,
        ambient_humidity_pct: 65,
        source: "open-meteo",
        fetched_at: "2026-07-07T10:00:00.000Z",
        expires_at: "2026-07-07T10:30:00.000Z",
      },
    ]);

    const removed = await deleteExpiredWeatherCache(db2, "2026-07-07T11:00:00.000Z");
    expect(removed).toBe(1);
    expect(db2.rows("pizza_lab_weather_cache")).toHaveLength(0);
  });
});
