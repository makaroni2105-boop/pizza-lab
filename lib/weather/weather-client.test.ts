import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildOpenWeatherUrl,
  fetchWeatherFromProvider,
  parseOpenWeatherResponse,
  validateCoordinates,
} from "./weather-client";
import { WEATHER_PROVIDER } from "./weather-constants";
import { WeatherFetchError } from "./weather-errors";

describe("weather-client (OpenWeather)", () => {
  const originalKey = process.env.OPENWEATHER_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OPENWEATHER_API_KEY;
    } else {
      process.env.OPENWEATHER_API_KEY = originalKey;
    }
    vi.restoreAllMocks();
  });

  it("builds OpenWeather URL without leaking key into path shape", () => {
    const url = buildOpenWeatherUrl(
      { latitude: 34.2386, longitude: 132.5616 },
      "test-key-only-in-query",
    );

    expect(url).toContain("api.openweathermap.org");
    expect(url).toContain("lat=34.2386");
    expect(url).toContain("units=metric");
    expect(url).toContain("appid=");
  });

  it("parses valid OpenWeather response with observation time", () => {
    const weather = parseOpenWeatherResponse(
      { main: { temp: 22.5, humidity: 55 }, dt: 1_700_000_000 },
      { latitude: 34.2, longitude: 132.5 },
      "2026-07-06T10:00:00.000Z",
    );

    expect(weather?.ambientTempC).toBe(22.5);
    expect(weather?.ambientHumidityPct).toBe(55);
    expect(weather?.source).toBe(WEATHER_PROVIDER);
    expect(weather?.observationTimeIso).toBe(
      new Date(1_700_000_000 * 1000).toISOString(),
    );
  });

  it("returns null for incomplete response", () => {
    expect(
      parseOpenWeatherResponse({}, { latitude: 35, longitude: 139 }, "2026-07-06"),
    ).toBeNull();
  });

  it("validates coordinates", () => {
    expect(validateCoordinates(35, 139).valid).toBe(true);
    expect(validateCoordinates(100, 139).valid).toBe(false);
    expect(validateCoordinates(35, 200).valid).toBe(false);
  });

  it("throws when API key is not configured", async () => {
    delete process.env.OPENWEATHER_API_KEY;

    await expect(
      fetchWeatherFromProvider({
        coordinates: { latitude: 34, longitude: 132 },
        apiKey: null,
      }),
    ).rejects.toMatchObject({ code: "API_KEY_NOT_CONFIGURED" });
  });

  it("fetches successfully with injected key and fetchImpl", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          main: { temp: 18.2, humidity: 60 },
          dt: 1_700_000_100,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const weather = await fetchWeatherFromProvider({
      coordinates: { latitude: 34.2386, longitude: 132.5616 },
      apiKey: "unit-test-key",
      fetchImpl: fetchImpl as typeof fetch,
      fetchedAt: "2026-11-23T01:00:00.000Z",
    });

    expect(weather.ambientTempC).toBe(18.2);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const calledUrl = String(fetchImpl.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("openweathermap.org");
    expect(calledUrl).not.toContain("open-meteo");
  });

  it("maps timeout to WeatherFetchError", async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    await expect(
      fetchWeatherFromProvider({
        coordinates: { latitude: 34, longitude: 132 },
        apiKey: "unit-test-key",
        fetchImpl: fetchImpl as typeof fetch,
        timeoutMs: 20,
      }),
    ).rejects.toBeInstanceOf(WeatherFetchError);

    await expect(
      fetchWeatherFromProvider({
        coordinates: { latitude: 34, longitude: 132 },
        apiKey: "unit-test-key",
        fetchImpl: fetchImpl as typeof fetch,
        timeoutMs: 20,
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});