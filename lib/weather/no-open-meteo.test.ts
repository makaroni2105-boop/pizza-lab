import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const WEATHER_DIR = resolve(import.meta.dirname);

const SERVER_WEATHER_FILES = [
  "weather-client.ts",
  "weather-handler.ts",
  "weather-cache.ts",
  "weather-constants.ts",
];

describe("weather provider — no Open-Meteo endpoints", () => {
  it("does not reference open-meteo.com in server weather modules", () => {
    for (const file of SERVER_WEATHER_FILES) {
      const raw = readFileSync(resolve(WEATHER_DIR, file), "utf8");
      expect(raw).not.toMatch(/open-meteo\.com/i);
      expect(raw).not.toMatch(/api\.open-meteo/i);
    }
  });
});