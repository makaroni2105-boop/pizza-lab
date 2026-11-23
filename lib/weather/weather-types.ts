/**
 * 天気 API 型定義。
 */

export type { WeatherFetchErrorCode } from "./weather-errors";
export {
  DEFAULT_WEATHER_COORDINATES,
  OPENWEATHER_ATTRIBUTION_URL,
  OPENWEATHER_LOGO_URL,
  WEATHER_CACHE_TTL_MS,
  WEATHER_FETCH_TIMEOUT_MS,
  WEATHER_PROVIDER,
} from "./weather-constants";

export interface WeatherCoordinates {
  latitude: number;
  longitude: number;
}

/** 取得した外気スナップショット（DIE weather 引数互換） */
export interface WeatherCurrent {
  ambientTempC: number;
  ambientHumidityPct: number;
  /** 気象データの対象時刻（プロバイダ観測時刻、ISO UTC） */
  observationTimeIso: string | null;
  /** API 呼び出し完了時刻（ISO UTC） */
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

/** OpenWeather Current Weather レスポンス（必要部分のみ） */
export interface OpenWeatherCurrentResponse {
  main?: {
    temp?: number;
    humidity?: number;
  };
  /** 観測時刻（unix sec, UTC） */
  dt?: number;
}