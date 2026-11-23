/**
 * 本番 wrangler.toml — 営業公開ゲート用の構造化検証（コメント行を設定値として数えない）。
 */
import { parse } from "smol-toml";
import { isAbsolute, join, resolve } from "node:path";

export const PIZZA_LAB_D1_ID = "06fd466a-3878-4e89-b3d7-2d680bfba17f";
export const NALIPO_D1_ID = "daa3eb2b-5638-4d24-b165-dce7a13a152a";

/**
 * 最初の `[section]`（`[[` 除く）より前のトップレベル行のみ。コメント行は除外。
 */
export function topLevelAssignmentLines(raw) {
  const lines = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (/^\[(?!\[)/.test(trimmed)) break;
    lines.push(trimmed);
  }
  return lines;
}

/**
 * @param {string} key
 * @returns {{ count: number; rawValues: string[] }}
 */
export function collectTopLevelAssignments(raw, key) {
  const re = new RegExp(`^${key}\\s*=\\s*(.+)$`);
  const rawValues = topLevelAssignmentLines(raw)
    .map((line) => {
      const m = line.match(re);
      return m ? m[1].trim() : null;
    })
    .filter(Boolean);
  return { count: rawValues.length, rawValues };
}

/**
 * @param {string} raw
 * @param {"go-live" | "private"} phase
 * @returns {true | { ok: false; message: string }}
 */
export function assertWorkersDevPhase(raw, phase) {
  const { count, rawValues } = collectTopLevelAssignments(raw, "workers_dev");
  if (count === 0) {
    return { ok: false, message: "workers_dev assignment is missing" };
  }
  if (count > 1) {
    return {
      ok: false,
      message: `workers_dev must appear exactly once (found ${count} assignments)`,
    };
  }

  let parsed;
  try {
    parsed = parse(raw);
  } catch (error) {
    return {
      ok: false,
      message: `wrangler.toml is not valid TOML: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const value = parsed.workers_dev;
  if (value === undefined || value === null) {
    return { ok: false, message: "workers_dev is missing in parsed TOML" };
  }
  if (typeof value !== "boolean") {
    return {
      ok: false,
      message: `workers_dev must be a boolean (got ${typeof value})`,
    };
  }

  const token = rawValues[0];
  if (value === true && !/^true$/i.test(token)) {
    return { ok: false, message: "workers_dev=true assignment is malformed" };
  }
  if (value === false && !/^false$/i.test(token)) {
    return { ok: false, message: "workers_dev=false assignment is malformed" };
  }

  if (phase === "go-live") {
    if (value !== true) {
      return {
        ok: false,
        message:
          "workers_dev = true is required for go-live (keep workers_dev = false until Access + checklist complete; use validate:production-config for private phase)",
      };
    }
    return true;
  }

  if (phase === "private") {
    if (value === true) {
      return {
        ok: false,
        message:
          "workers_dev = true must not be set before Access go-live; keep workers_dev = false",
      };
    }
    if (value !== false) {
      return { ok: false, message: "workers_dev = false is required for private phase" };
    }
    return true;
  }

  return { ok: false, message: `unknown phase: ${phase}` };
}

/**
 * @returns {true | { ok: false; message: string }}
 */
export function assertPreviewUrlsFalse(raw) {
  const { count } = collectTopLevelAssignments(raw, "preview_urls");
  if (count === 0) {
    return { ok: false, message: "preview_urls assignment is missing" };
  }
  if (count > 1) {
    return {
      ok: false,
      message: `preview_urls must appear exactly once (found ${count})`,
    };
  }

  let parsed;
  try {
    parsed = parse(raw);
  } catch {
    return { ok: false, message: "wrangler.toml is not valid TOML" };
  }
  if (parsed.preview_urls !== false) {
    return { ok: false, message: "preview_urls = false is required for production Worker" };
  }
  return true;
}

/**
 * @returns {string | { ok: false; message: string }}
 */
export function parseProductionWranglerName(raw) {
  let parsed;
  try {
    parsed = parse(raw);
  } catch {
    return { ok: false, message: "wrangler.toml is not valid TOML" };
  }
  if (typeof parsed.name !== "string" || !parsed.name) {
    return { ok: false, message: 'name assignment is missing' };
  }
  return parsed.name;
}

/**
 * 公開ゲート — TOML 構造と D1 / NALIPO 分離（dry-run は別）。
 * @returns {true | { ok: false; message: string }}
 */
export function validateProductionGoLiveToml(raw) {
  const workers = assertWorkersDevPhase(raw, "go-live");
  if (workers !== true) return workers;

  const preview = assertPreviewUrlsFalse(raw);
  if (preview !== true) return preview;

  const name = parseProductionWranglerName(raw);
  if (typeof name !== "string") return name;
  if (name !== "pizza-lab") {
    return { ok: false, message: 'name must be "pizza-lab" (not pizza-lab-staging)' };
  }

  if (!/database_name\s*=\s*"pizza_lab_db"/.test(raw)) {
    return { ok: false, message: 'database_name must be "pizza_lab_db"' };
  }
  if (!new RegExp(`database_id\\s*=\\s*"${PIZZA_LAB_D1_ID}"`).test(raw)) {
    return {
      ok: false,
      message: `database_id must be pizza_lab_db UUID ${PIZZA_LAB_D1_ID}`,
    };
  }
  if (/database_name\s*=\s*"nalipo-db"/.test(raw)) {
    return { ok: false, message: "must not bind nalipo-db" };
  }
  if (/database_name\s*=\s*"nalipo-takeout-db"/.test(raw)) {
    return { ok: false, message: "must not bind nalipo-takeout-db" };
  }
  if (raw.includes(NALIPO_D1_ID)) {
    return { ok: false, message: "must not reference NALIPO reservation database_id" };
  }
  if (!/binding\s*=\s*"DB"/.test(raw)) {
    return { ok: false, message: 'D1 binding must be "DB"' };
  }
  if (!/binding\s*=\s*"ASSETS"/.test(raw)) {
    return { ok: false, message: 'ASSETS binding must remain' };
  }
  if (!/service\s*=\s*"pizza-lab"/.test(raw)) {
    return { ok: false, message: 'WORKER_SELF_REFERENCE service must be "pizza-lab"' };
  }
  if (/\[\[routes\]\]/i.test(raw)) {
    return {
      ok: false,
      message:
        "wrangler.toml must not define [[routes]] (no custom domains or zone routes in wrangler)",
    };
  }

  return true;
}

/**
 * @param {string} root
 * @param {string} configRel
 */
export function resolveGoLiveConfigPath(root, configRel) {
  const cleaned = configRel.replace(/\\/g, "/");
  if (cleaned.includes("..")) {
    return { ok: false, message: "WRANGLER_GO_LIVE_CONFIG must not contain .." };
  }
  const abs = isAbsolute(cleaned) ? resolve(cleaned) : resolve(root, cleaned);
  const rootResolved = resolve(root);
  if (!abs.startsWith(rootResolved)) {
    return {
      ok: false,
      message: "WRANGLER_GO_LIVE_CONFIG must resolve under the repository root",
    };
  }
  return abs;
}