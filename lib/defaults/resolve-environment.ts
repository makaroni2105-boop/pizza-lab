/**
 * 環境値（外気温・湿度・店舗室温）の補完。
 * 正本: docs/defaults-fallback.md §3.1
 */

import type { EnvironmentInput } from "@/types/die";
import type { ShopProfile } from "@/types/profile";

import {
  FieldResolutionTracker,
  isResolvedNumber,
  resolveNumber,
} from "./resolve-field";

export const DEFAULT_AMBIENT_TEMP_C = 20;
export const DEFAULT_AMBIENT_HUMIDITY_PCT = 50;
export const DEFAULT_SHOP_HUMIDITY_PCT = 50;

export interface WeatherSnapshot {
  ambientTempC?: number;
  ambientHumidityPct?: number;
}

export interface ResolvedEnvironment {
  ambientTempC: number | null;
  ambientHumidityPct: number | null;
  shopRoomTempC: number | null;
  shopHumidityPct: number | null;
}

function getShopRoomTempOffset(ambientTempC: number): number {
  if (ambientTempC >= 25) {
    return 3;
  }
  if (ambientTempC < 10) {
    return 5;
  }
  return 4;
}

export function resolveEnvironment(
  input: EnvironmentInput | undefined,
  profile: ShopProfile,
  weather: WeatherSnapshot | undefined,
  tracker: FieldResolutionTracker,
): ResolvedEnvironment {
  const userAmbient = input?.ambientTempC;
  const weatherAmbient = weather?.ambientTempC;

  let ambientTempC: number | null = null;

  if (isResolvedNumber(userAmbient)) {
    ambientTempC = userAmbient;
    tracker.record("environment.ambientTempC", {
      value: userAmbient,
      resolution: {
        value: userAmbient,
        source: "user",
        wasEstimated: false,
      },
      isUnresolved: false,
    });
  } else if (typeof weatherAmbient === "number" && !Number.isNaN(weatherAmbient)) {
    ambientTempC = weatherAmbient;
    tracker.recordWeather("environment.ambientTempC", weatherAmbient, "weather-api");
  } else {
    ambientTempC = DEFAULT_AMBIENT_TEMP_C;
    tracker.recordWeather(
      "environment.ambientTempC",
      DEFAULT_AMBIENT_TEMP_C,
      "weather-api-fallback",
    );
  }

  const ambientHumidity = resolveNumber({
    fieldKey: "environment.ambientHumidityPct",
    userValue: input?.ambientHumidityPct,
    masterValue:
      typeof weather?.ambientHumidityPct === "number"
        ? weather.ambientHumidityPct
        : DEFAULT_AMBIENT_HUMIDITY_PCT,
    masterSourceDetail:
      typeof weather?.ambientHumidityPct === "number"
        ? "weather-api"
        : "weather-api-fallback",
  });
  tracker.record("environment.ambientHumidityPct", ambientHumidity);

  const shopRoomTemp = resolveNumber({
    fieldKey: "environment.shopRoomTempC",
    userValue: input?.shopRoomTempC,
    profileValue: undefined,
    masterValue: null,
  });

  let shopRoomTempC = shopRoomTemp.value;

  if (shopRoomTemp.isUnresolved && ambientTempC !== null) {
    shopRoomTempC = ambientTempC + getShopRoomTempOffset(ambientTempC);
    tracker.recordComputed(
      "environment.shopRoomTempC",
      shopRoomTempC,
      `ambientTemp+${getShopRoomTempOffset(ambientTempC)}C`,
    );
  } else {
    tracker.record("environment.shopRoomTempC", shopRoomTemp);
  }

  const shopHumidity = resolveNumber({
    fieldKey: "environment.shopHumidityPct",
    userValue: input?.shopHumidityPct,
    profileValue: undefined,
    masterValue: DEFAULT_SHOP_HUMIDITY_PCT,
    masterSourceDetail: "default-50pct",
  });
  tracker.record("environment.shopHumidityPct", shopHumidity);

  return {
    ambientTempC,
    ambientHumidityPct: ambientHumidity.value,
    shopRoomTempC,
    shopHumidityPct: shopHumidity.value,
  };
}
