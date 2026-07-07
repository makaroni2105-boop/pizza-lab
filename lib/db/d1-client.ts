/**
 * D1 クライアント薄ラッパー。
 * Repository 層から env.DB を直接散在させない。
 */

import type { D1Database, D1Result } from "./d1-types";

export function nowIso(): string {
  return new Date().toISOString();
}

/** 天気キャッシュキー（小数 4 桁丸め） */
export function buildWeatherCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
}

export async function queryAll<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...bindings: unknown[]
): Promise<T[]> {
  const statement = db.prepare(sql);
  const bound = bindings.length > 0 ? statement.bind(...bindings) : statement;
  const result = await bound.all<T>();
  return result.results ?? [];
}

export async function queryFirst<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...bindings: unknown[]
): Promise<T | null> {
  const statement = db.prepare(sql);
  const bound = bindings.length > 0 ? statement.bind(...bindings) : statement;
  return bound.first<T>();
}

export async function execute(
  db: D1Database,
  sql: string,
  ...bindings: unknown[]
): Promise<D1Result> {
  const statement = db.prepare(sql);
  const bound = bindings.length > 0 ? statement.bind(...bindings) : statement;
  return bound.run();
}
