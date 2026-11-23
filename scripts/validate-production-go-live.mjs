/**
 * 本番 Wrangler 営業公開ゲート（deploy しない）。
 * - wrangler.toml: workers_dev=true（公開 hostname 用）、preview_urls=false、D1 分離
 * - 必須: wrangler deploy --dry-run（.open-next ビルド後）
 *
 * 非公開フェーズは validate:production-config（workers_dev=false）を使用する。
 * 本スクリプトは workers_dev=false の wrangler.toml では意図的に失敗する。
 *
 * 環境変数 WRANGLER_GO_LIVE_CONFIG — リポジトリ直下相対パス（go-live 前の一時 toml 検証用）。
 * 一時ファイルはリポジトリルートに置くこと（.open-next 相対パス解決のため）。
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import {
  resolveGoLiveConfigPath,
  validateProductionGoLiveToml,
} from "./lib/wrangler-production-gate.mjs";

const ROOT = process.cwd();
const CONFIG_REL = process.env.WRANGLER_GO_LIVE_CONFIG ?? "wrangler.toml";

function fail(message) {
  console.error(`validate:production-go-live — ${message}`);
  process.exit(1);
}

const resolved = resolveGoLiveConfigPath(ROOT, CONFIG_REL);
if (typeof resolved !== "string") {
  fail(resolved.message);
}

if (!existsSync(resolved)) {
  fail(`config file not found: ${CONFIG_REL}`);
}

const raw = readFileSync(resolved, "utf8");
const gate = validateProductionGoLiveToml(raw);
if (gate !== true) {
  fail(gate.message);
}

const openNextMain = join(ROOT, ".open-next", "worker.js");
if (!existsSync(openNextMain)) {
  fail(
    "wrangler deploy --dry-run required — run npm run build:cloudflare first (.open-next/worker.js missing)",
  );
}

const configArg =
  resolved === join(ROOT, "wrangler.toml")
    ? ""
    : ` --config ${relative(ROOT, resolved).replace(/\\/g, "/")}`;

let dryRunOutput;
try {
  dryRunOutput = execSync(`npx wrangler deploy --dry-run${configArg}`, {
    encoding: "utf8",
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  const out = error.stdout?.toString() ?? "";
  const err = error.stderr?.toString() ?? "";
  fail(`wrangler deploy --dry-run failed:\n${out}\n${err}`);
}

if (!/pizza-lab/.test(dryRunOutput)) {
  fail("dry-run output must reference Worker pizza-lab");
}
if (/pizza-lab-staging/.test(dryRunOutput)) {
  fail("dry-run must not reference pizza-lab-staging");
}
if (/nalipo-db|nalipo-takeout-db/.test(dryRunOutput)) {
  fail("dry-run must not reference NALIPO D1");
}

console.log(
  "validate:production-go-live OK — pizza-lab, pizza_lab_db, workers_dev=true, preview_urls=false, NALIPO D1 isolated",
);