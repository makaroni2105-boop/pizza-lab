/**
 * OpenWeather API キー（サーバー専用 — Cloudflare Secret: OPENWEATHER_API_KEY）。
 * クライアント・レスポンス・ログに含めない。
 */

export function readOpenWeatherApiKey(
  envValue: string | undefined = process.env.OPENWEATHER_API_KEY,
): string | null {
  const trimmed = envValue?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}