import { describe, expect, it } from "vitest";

import { buildWeatherCacheKey } from "./d1-client";

describe("d1-client", () => {
  it("buildWeatherCacheKey rounds coordinates to 4 decimals", () => {
    expect(buildWeatherCacheKey(35.67623, 139.65031)).toBe("35.6762:139.6503");
  });
});
