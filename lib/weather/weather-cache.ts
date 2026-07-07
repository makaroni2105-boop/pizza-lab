/**
 * 天気レスポンスのインメモリキャッシュ（TTL 30 分）。
 * Cloudflare Workers 移行時も Map + expiresAt で同パターンを維持可能。
 */

import type { WeatherCacheEntry, WeatherCurrent } from "./weather-types";
import { WEATHER_CACHE_TTL_MS } from "./weather-types";

export function buildWeatherCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export class WeatherCache {
  private store = new Map<string, WeatherCacheEntry>();

  get(key: string, nowMs: number = Date.now()): WeatherCurrent | null {
    return this.getEntry(key, nowMs)?.weather ?? null;
  }

  getEntry(key: string, nowMs: number = Date.now()): WeatherCacheEntry | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= nowMs) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  set(
    key: string,
    weather: WeatherCurrent,
    ttlMs: number = WEATHER_CACHE_TTL_MS,
    nowMs: number = Date.now(),
  ): WeatherCacheEntry {
    const entry: WeatherCacheEntry = {
      weather,
      expiresAt: nowMs + ttlMs,
    };

    this.store.set(key, entry);
    return entry;
  }

  clear(): void {
    this.store.clear();
  }
}

/** サーバー側シングルトン（Route Handler 用） */
let defaultCache: WeatherCache | null = null;

export function getDefaultWeatherCache(): WeatherCache {
  if (!defaultCache) {
    defaultCache = new WeatherCache();
  }

  return defaultCache;
}

export function resetDefaultWeatherCache(): void {
  defaultCache = null;
}
