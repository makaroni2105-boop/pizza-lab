import { describe, expect, it } from "vitest";

import {
  buildOpenMeteoUrl,
  parseOpenMeteoResponse,
  validateCoordinates,
} from "./weather-client";

describe("weather-client", () => {
  it("builds Open-Meteo URL", () => {
    const url = buildOpenMeteoUrl({ latitude: 35.68, longitude: 139.65 });

    expect(url).toContain("api.open-meteo.com");
    expect(url).toContain("latitude=35.68");
    expect(url).toContain("relative_humidity_2m");
  });

  it("parses valid Open-Meteo response", () => {
    const weather = parseOpenMeteoResponse(
      { current: { temperature_2m: 22.5, relative_humidity_2m: 55 } },
      { latitude: 35, longitude: 139 },
      "2026-07-06T10:00:00.000Z",
    );

    expect(weather?.ambientTempC).toBe(22.5);
    expect(weather?.ambientHumidityPct).toBe(55);
  });

  it("returns null for incomplete response", () => {
    expect(
      parseOpenMeteoResponse({}, { latitude: 35, longitude: 139 }, "2026-07-06"),
    ).toBeNull();
  });

  it("validates coordinates", () => {
    expect(validateCoordinates(35, 139).valid).toBe(true);
    expect(validateCoordinates(100, 139).valid).toBe(false);
    expect(validateCoordinates(35, 200).valid).toBe(false);
  });
});
