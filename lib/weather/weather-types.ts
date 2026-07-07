/**
 * 天気 API 型定義。
 */

export interface WeatherCoordinates {
  latitude: number;
  longitude: number;
}

/** 取得した外気スナップショット（DIE weather 引数互換） */
export interface WeatherCurrent {
  ambientTempC: number;
  ambientHumidityPct: number;
  fetchedAt: string;
  latitude: number;
  longitude: number;
  source: string;
}

export interface WeatherCacheEntry {
  weather: WeatherCurrent;
  expiresAt: number;
}

export interface WeatherApiSuccessResponse {
  success: true;
  weather: WeatherCurrent;
  cached: boolean;
  expiresAt: string;
}

export interface WeatherApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type WeatherApiResponse = WeatherApiSuccessResponse | WeatherApiErrorResponse;

/** Open-Meteo current レスポンス（必要部分のみ） */
export interface OpenMeteoCurrentResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
  };
}

export const WEATHER_PROVIDER = "open-meteo";
export const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

/** デフォルト座標（東京 — 固定値フォールバック用） */
export const DEFAULT_WEATHER_COORDINATES: WeatherCoordinates = {
  latitude: 35.6762,
  longitude: 139.6503,
};
