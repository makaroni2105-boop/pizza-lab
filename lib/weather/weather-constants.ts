/**
 * 天気プロバイダ定数（OpenWeather Current Weather API）。
 */

export const WEATHER_PROVIDER = "openweathermap" as const;

/** OpenWeather Current Weather 2.5 */
export const OPENWEATHER_CURRENT_WEATHER_URL =
  "https://api.openweathermap.org/data/2.5/weather";

export const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

export const WEATHER_FETCH_TIMEOUT_MS = 8_000;

export const OPENWEATHER_ATTRIBUTION_URL = "https://openweathermap.org/";
export const OPENWEATHER_LOGO_URL =
  "https://openweathermap.org/themes/openweathermap/assets/img/brand_guide/Logo_OpenWeatherMap_orange.svg";

/** デフォルト座標（東京 — 固定値フォールバック用） */
export const DEFAULT_WEATHER_COORDINATES = {
  latitude: 35.6762,
  longitude: 139.6503,
} as const;