-- Pizza-Lab: weather_cache
-- Phase 3 設計 DDL（未実行）
-- 対応: lib/weather/weather-types.ts WeatherCurrent, WeatherCacheEntry
-- Phase 2: 30 分インメモリ → Phase 3: D1 永続化（Workers 共有キャッシュ）

CREATE TABLE IF NOT EXISTS weather_cache (
  -- 例: "35.6762:139.6503"（小数4桁丸め）または geohash
  cache_key           TEXT PRIMARY KEY NOT NULL,

  latitude            REAL NOT NULL,
  longitude           REAL NOT NULL,

  ambient_temp_c      REAL NOT NULL,
  ambient_humidity_pct REAL NOT NULL,

  source              TEXT NOT NULL DEFAULT 'open-meteo',

  fetched_at          TEXT NOT NULL,
  expires_at          TEXT NOT NULL,

  CHECK (latitude >= -90.0 AND latitude <= 90.0),
  CHECK (longitude >= -180.0 AND longitude <= 180.0),
  CHECK (ambient_humidity_pct >= 0.0 AND ambient_humidity_pct <= 100.0)
);

CREATE INDEX IF NOT EXISTS idx_weather_cache_expires_at
  ON weather_cache (expires_at);

CREATE INDEX IF NOT EXISTS idx_weather_cache_lat_lon
  ON weather_cache (latitude, longitude);

-- PG 移行メモ:
--   expires_at 経過行の定期 DELETE（cron / pg_cron）
--   TTL: WEATHER_CACHE_TTL_MS = 30 * 60 * 1000（lib/weather/weather-types.ts）
