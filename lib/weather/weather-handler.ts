/**
 * GET /api/weather ハンドラー（テスト可能）。
 * D1（pizza_lab_weather_cache）が利用可能なら Repository 経由でキャッシュ。
 * 無い場合・失敗時はインメモリ WeatherCache にフォールバック。
 */

import type { D1Database } from "@/lib/db/d1-types";
import {
  findValidWeatherCacheEntry,
  upsertWeatherCache,
  weatherCurrentToExpiresAtIso,
} from "@/lib/db/weather-cache-repository";

import {
  fetchWeatherFromProvider,
  validateCoordinates,
  WeatherFetchError,
} from "./weather-client";
import {
  WeatherCache,
  buildWeatherCacheKey,
  getDefaultWeatherCache,
} from "./weather-cache";
import type { WeatherApiResponse } from "./weather-types";
import { WEATHER_CACHE_TTL_MS } from "./weather-types";

export interface WeatherHandlerResult {
  status: number;
  body: WeatherApiResponse;
}

export interface WeatherHandlerDeps {
  cache?: WeatherCache;
  /** Cloudflare D1 binding（optional） */
  db?: D1Database;
  fetchWeather?: typeof fetchWeatherFromProvider;
  now?: () => number;
}

export async function handleWeatherRequest(
  latitude: number,
  longitude: number,
  deps?: WeatherHandlerDeps,
): Promise<WeatherHandlerResult> {
  const validation = validateCoordinates(latitude, longitude);

  if (!validation.valid) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: "INVALID_COORDINATES",
          message: validation.message,
        },
      },
    };
  }

  const cache = deps?.cache ?? getDefaultWeatherCache();
  const fetchWeather = deps?.fetchWeather ?? fetchWeatherFromProvider;
  const nowMs = deps?.now?.() ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const cacheKey = buildWeatherCacheKey(latitude, longitude);

  let useMemoryFallback = !deps?.db;

  if (deps?.db) {
    try {
      const d1Hit = await findValidWeatherCacheEntry(deps.db, latitude, longitude, nowIso);
      if (d1Hit) {
        return {
          status: 200,
          body: {
            success: true,
            weather: d1Hit.weather,
            cached: true,
            expiresAt: d1Hit.expiresAtIso,
          },
        };
      }
    } catch {
      useMemoryFallback = true;
    }
  }

  if (useMemoryFallback) {
    const memoryHit = cache.getEntry(cacheKey, nowMs);
    if (memoryHit) {
      return {
        status: 200,
        body: {
          success: true,
          weather: memoryHit.weather,
          cached: true,
          expiresAt: new Date(memoryHit.expiresAt).toISOString(),
        },
      };
    }
  }

  try {
    const weather = await fetchWeather({
      coordinates: { latitude, longitude },
      fetchedAt: nowIso,
    });

    const expiresAtIso = weatherCurrentToExpiresAtIso(weather.fetchedAt, WEATHER_CACHE_TTL_MS);

    if (deps?.db && !useMemoryFallback) {
      try {
        await upsertWeatherCache(deps.db, weather, expiresAtIso);
        return {
          status: 200,
          body: {
            success: true,
            weather,
            cached: false,
            expiresAt: expiresAtIso,
          },
        };
      } catch {
        useMemoryFallback = true;
      }
    }

    const entry = cache.set(cacheKey, weather, WEATHER_CACHE_TTL_MS, nowMs);

    return {
      status: 200,
      body: {
        success: true,
        weather,
        cached: false,
        expiresAt: new Date(entry.expiresAt).toISOString(),
      },
    };
  } catch (error) {
    const code =
      error instanceof WeatherFetchError
        ? error.code === "API_KEY_NOT_CONFIGURED"
          ? "API_KEY_NOT_CONFIGURED"
          : "WEATHER_FETCH_FAILED"
        : "WEATHER_FETCH_FAILED";

    const message =
      code === "API_KEY_NOT_CONFIGURED"
        ? "天気 API キーが未設定のため外気温を取得できません"
        : "天気情報を取得できませんでした。手入力または既定値をご利用ください";

    return {
      status: 200,
      body: {
        success: false,
        error: {
          code,
          message,
        },
      },
    };
  }
}
