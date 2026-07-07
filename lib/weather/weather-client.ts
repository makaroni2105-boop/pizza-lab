/**
 * 外部天気 API クライアント（fetch ベース）。
 * プロバイダ: Open-Meteo（API キー不要）。
 */

import type { OpenMeteoCurrentResponse, WeatherCoordinates, WeatherCurrent } from "./weather-types";
import { WEATHER_PROVIDER } from "./weather-types";

export interface FetchWeatherOptions {
  coordinates: WeatherCoordinates;
  fetchImpl?: typeof fetch;
  fetchedAt?: string;
}

export function buildOpenMeteoUrl(coordinates: WeatherCoordinates): string {
  const params = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    current: "temperature_2m,relative_humidity_2m",
  });

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export function parseOpenMeteoResponse(
  data: OpenMeteoCurrentResponse,
  coordinates: WeatherCoordinates,
  fetchedAt: string,
): WeatherCurrent | null {
  const temp = data.current?.temperature_2m;
  const humidity = data.current?.relative_humidity_2m;

  if (
    typeof temp !== "number" ||
    Number.isNaN(temp) ||
    typeof humidity !== "number" ||
    Number.isNaN(humidity)
  ) {
    return null;
  }

  return {
    ambientTempC: temp,
    ambientHumidityPct: humidity,
    fetchedAt,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    source: WEATHER_PROVIDER,
  };
}

export async function fetchWeatherFromProvider(
  options: FetchWeatherOptions,
): Promise<WeatherCurrent> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const url = buildOpenMeteoUrl(options.coordinates);

  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Weather provider returned ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoCurrentResponse;
  const weather = parseOpenMeteoResponse(data, options.coordinates, fetchedAt);

  if (!weather) {
    throw new Error("Weather provider response was incomplete");
  }

  return weather;
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
