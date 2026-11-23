/**
 * 外部天気 API クライアント（fetch ベース）。
 * プロバイダ: OpenWeather Current Weather API（サーバー側・API キー必須）。
 */

import {
  OPENWEATHER_CURRENT_WEATHER_URL,
  WEATHER_FETCH_TIMEOUT_MS,
  WEATHER_PROVIDER,
} from "./weather-constants";
import { WeatherFetchError } from "./weather-errors";
import { readOpenWeatherApiKey } from "./openweather-api-key";
import type {
  OpenWeatherCurrentResponse,
  WeatherCoordinates,
  WeatherCurrent,
} from "./weather-types";

export { WeatherFetchError } from "./weather-errors";
export { readOpenWeatherApiKey } from "./openweather-api-key";

export interface FetchWeatherOptions {
  coordinates: WeatherCoordinates;
  apiKey?: string | null;
  fetchImpl?: typeof fetch;
  fetchedAt?: string;
  timeoutMs?: number;
}

export function buildOpenWeatherUrl(
  coordinates: WeatherCoordinates,
  apiKey: string,
): string {
  const params = new URLSearchParams({
    lat: String(coordinates.latitude),
    lon: String(coordinates.longitude),
    units: "metric",
    appid: apiKey,
  });

  return `${OPENWEATHER_CURRENT_WEATHER_URL}?${params.toString()}`;
}

export function parseOpenWeatherResponse(
  data: OpenWeatherCurrentResponse,
  coordinates: WeatherCoordinates,
  fetchedAt: string,
): WeatherCurrent | null {
  const temp = data.main?.temp;
  const humidity = data.main?.humidity;

  if (
    typeof temp !== "number" ||
    Number.isNaN(temp) ||
    typeof humidity !== "number" ||
    Number.isNaN(humidity)
  ) {
    return null;
  }

  const observationTimeIso =
    typeof data.dt === "number" && Number.isFinite(data.dt)
      ? new Date(data.dt * 1000).toISOString()
      : null;

  return {
    ambientTempC: temp,
    ambientHumidityPct: humidity,
    observationTimeIso,
    fetchedAt,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    source: WEATHER_PROVIDER,
  };
}

export async function fetchWeatherFromProvider(
  options: FetchWeatherOptions,
): Promise<WeatherCurrent> {
  const apiKey =
    options.apiKey === undefined
      ? readOpenWeatherApiKey()
      : options.apiKey?.trim() || null;

  if (!apiKey) {
    throw new WeatherFetchError(
      "API_KEY_NOT_CONFIGURED",
      "OPENWEATHER_API_KEY is not configured",
    );
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const url = buildOpenWeatherUrl(options.coordinates, apiKey);
  const timeoutMs = options.timeoutMs ?? WEATHER_FETCH_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new WeatherFetchError(
        "HTTP_ERROR",
        `Weather provider returned ${response.status}`,
      );
    }

    const data = (await response.json()) as OpenWeatherCurrentResponse;
    const weather = parseOpenWeatherResponse(data, options.coordinates, fetchedAt);

    if (!weather) {
      throw new WeatherFetchError(
        "INCOMPLETE_RESPONSE",
        "Weather provider response was incomplete",
      );
    }

    return weather;
  } catch (error) {
    if (error instanceof WeatherFetchError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new WeatherFetchError("TIMEOUT", "Weather fetch timed out");
    }

    throw new WeatherFetchError("NETWORK", "Weather fetch failed");
  } finally {
    clearTimeout(timeoutId);
  }
}

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function validateCoordinates(
  latitude: number,
  longitude: number,
): { valid: true } | { valid: false; message: string } {
  if (!isValidLatitude(latitude)) {
    return { valid: false, message: "緯度は -90〜90 の範囲で指定してください" };
  }

  if (!isValidLongitude(longitude)) {
    return { valid: false, message: "経度は -180〜180 の範囲で指定してください" };
  }

  return { valid: true };
}