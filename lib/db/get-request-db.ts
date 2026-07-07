/**
 * API Route / Worker から optional な D1 binding を取得。
 * Next.js dev（Node）では undefined — インメモリキャッシュへフォールバック。
 * NALIPO 等の他 DB binding は参照しない（PIZZALAB_D1_BINDING = "DB" のみ）。
 */

import { PIZZA_LAB_D1_BINDING, type D1Database } from "./d1-types";

interface CloudflareEnv {
  DB?: D1Database;
}

function readBindingFromEnv(env: CloudflareEnv | undefined): D1Database | undefined {
  if (!env) {
    return undefined;
  }

  return env[PIZZA_LAB_D1_BINDING as keyof CloudflareEnv] as D1Database | undefined;
}

/**
 * Cloudflare Workers / OpenNext 等で注入された env から DB を取得。
 * ローカル Next.js dev では通常 undefined。
 */
export function getOptionalRequestDb(env?: CloudflareEnv): D1Database | undefined {
  const fromArgument = readBindingFromEnv(env);
  if (fromArgument) {
    return fromArgument;
  }

  const globalEnv = (globalThis as unknown as { env?: CloudflareEnv }).env;
  return readBindingFromEnv(globalEnv);
}
