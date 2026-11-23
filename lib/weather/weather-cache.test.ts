import { describe, expect, it, beforeEach } from "vitest";

import {
  WeatherCache,
  buildWeatherCacheKey,
} from "./weather-cache";
import type { WeatherCurrent } from "./weather-types";
import { WEATHER_CACHE_TTL_MS } from "./weather-types";

const sampleWeather: WeatherCurrent = {
  ambientTempC: 25,
  ambientHumidityPct: 60,
  fetchedAt: "2026-07-06T10:00:00.000Z",
  latitude: 35.6762,
  longitude: 139.6503,
  observationTimeIso: null,
  source: "openweathermap",
};

describe("weather-cache", () => {
  let cache: WeatherCache;

  beforeEach(() => {
    cache = new WeatherCache();
  });

  it("builds stable cache keys", () => {
    expect(buildWeatherCacheKey(35.6762, 139.6503)).toBe("35.6762,139.6503");
  });

  it("stores and retrieves within TTL", () => {
    const key = buildWeatherCacheKey(35.6762, 139.6503);
    const now = Date.now();
    cache.set(key, sampleWeather, WEATHER_CACHE_TTL_MS, now);

    expect(cache.get(key, now + 1000)?.ambientTempC).toBe(25);
  });

  it("expires entries after TTL", () => {
    const key = buildWeatherCacheKey(35.6762, 139.6503);
    const now = Date.now();
    cache.set(key, sampleWeather, WEATHER_CACHE_TTL_MS, now);

    expect(cache.get(key, now + WEATHER_CACHE_TTL_MS + 1)).toBeNull();
  });
});
