import { describe, expect, it, vi } from "vitest";

import { createMemoryD1 } from "@/lib/db/d1-mock";
import {
  upsertWeatherCache,
  weatherCurrentToExpiresAtIso,
} from "@/lib/db/weather-cache-repository";

import { WeatherCache } from "./weather-cache";
import type { WeatherCurrent } from "./weather-types";
import { WEATHER_CACHE_TTL_MS } from "./weather-types";
import { handleWeatherRequest } from "./weather-handler";
const sampleWeather: WeatherCurrent = {
  ambientTempC: 28,
  ambientHumidityPct: 62,
  fetchedAt: "2026-07-06T10:00:00.000Z",
  latitude: 35.6762,
  longitude: 139.6503,
  source: "open-meteo",
};

describe("handleWeatherRequest", () => {
  it("returns 400 for invalid coordinates", async () => {
    const result = await handleWeatherRequest(999, 139, {
      cache: new WeatherCache(),
    });

    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
    if (!result.body.success) {
      expect(result.body.error.code).toBe("INVALID_COORDINATES");
    }
  });

  it("returns cached weather without refetch", async () => {
    const cache = new WeatherCache();
    const now = 1_700_000_000_000;
    cache.set("35.6762,139.6503", sampleWeather, WEATHER_CACHE_TTL_MS, now);

    const fetchWeather = vi.fn();

    const result = await handleWeatherRequest(35.6762, 139.6503, {
      cache,
      fetchWeather,
      now: () => now + 1000,
    });

    expect(fetchWeather).not.toHaveBeenCalled();
    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    if (result.body.success) {
      expect(result.body.cached).toBe(true);
      expect(result.body.weather.ambientTempC).toBe(28);
    }
  });

  it("fetches and caches on miss", async () => {
    const cache = new WeatherCache();
    const fetchWeather = vi.fn().mockResolvedValue(sampleWeather);
    const now = 1_700_000_000_000;

    const result = await handleWeatherRequest(35.6762, 139.6503, {
      cache,
      fetchWeather,
      now: () => now,
    });

    expect(fetchWeather).toHaveBeenCalledOnce();
    expect(result.body.success).toBe(true);
    if (result.body.success) {
      expect(result.body.cached).toBe(false);
    }
  });

  it("returns safe JSON on fetch failure without HTTP 500", async () => {
    const result = await handleWeatherRequest(35.6762, 139.6503, {
      cache: new WeatherCache(),
      fetchWeather: vi.fn().mockRejectedValue(new Error("network")),
    });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(false);
    if (!result.body.success) {
      expect(result.body.error.code).toBe("WEATHER_FETCH_FAILED");
    }
  });

  it("returns D1 cached weather when db is provided", async () => {
    const db = createMemoryD1();
    const fetchedAt = "2026-07-06T10:00:00.000Z";
    const expiresAt = weatherCurrentToExpiresAtIso(fetchedAt, WEATHER_CACHE_TTL_MS);

    await upsertWeatherCache(
      db,
      { ...sampleWeather, fetchedAt },
      expiresAt,
    );

    const fetchWeather = vi.fn();
    const memoryCache = new WeatherCache();

    const result = await handleWeatherRequest(35.6762, 139.6503, {
      db,
      cache: memoryCache,
      fetchWeather,
      now: () => new Date("2026-07-06T10:15:00.000Z").getTime(),
    });

    expect(fetchWeather).not.toHaveBeenCalled();
    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    if (result.body.success) {
      expect(result.body.cached).toBe(true);
      expect(result.body.expiresAt).toBe(expiresAt);
      expect(result.body.weather.ambientTempC).toBe(28);
    }
  });

  it("stores fetch result in D1 when db is provided", async () => {
    const db = createMemoryD1();
    const fetchWeather = vi.fn().mockResolvedValue(sampleWeather);
    const now = 1_700_000_000_000;

    const result = await handleWeatherRequest(35.6762, 139.6503, {
      db,
      cache: new WeatherCache(),
      fetchWeather,
      now: () => now,
    });

    expect(fetchWeather).toHaveBeenCalledOnce();
    expect(result.body.success).toBe(true);
    if (result.body.success) {
      expect(result.body.cached).toBe(false);
    }

    const hit = await handleWeatherRequest(35.6762, 139.6503, {
      db,
      cache: new WeatherCache(),
      fetchWeather: vi.fn(),
      now: () => now + 1000,
    });

    expect(hit.body.success).toBe(true);
    if (hit.body.success) {
      expect(hit.body.cached).toBe(true);
    }
  });

  it("falls back to memory cache when D1 read fails", async () => {
    const cache = new WeatherCache();
    const now = 1_700_000_000_000;
    cache.set("35.6762,139.6503", sampleWeather, WEATHER_CACHE_TTL_MS, now);

    const brokenDb = {
      prepare: () => {
        throw new Error("d1 unavailable");
      },
    };

    const fetchWeather = vi.fn();

    const result = await handleWeatherRequest(35.6762, 139.6503, {
      db: brokenDb,
      cache,
      fetchWeather,
      now: () => now + 1000,
    });

    expect(fetchWeather).not.toHaveBeenCalled();
    expect(result.body.success).toBe(true);
    if (result.body.success) {
      expect(result.body.cached).toBe(true);
      expect(result.body.weather.ambientTempC).toBe(28);
    }
  });
});
