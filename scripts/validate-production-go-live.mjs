/**
 * 本番 Wrangler 営業公開ゲート（deploy しない）。
 * - wrangler.toml: workers_dev=true（公開 hostname 用）、preview_urls=false、D1 分離
 * - 必須: wrangler deploy --dry-run（.open-next ビルド後）
 *
 * 非公開フェーズは validate:production-config（workers_dev=false）を使用する。
 * 本スクリプトは workers_dev=false の wrangler.toml では意図的に失敗する。
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PROD_TOML = join(ROOT, "wrangler.toml");
const PIZZA_LAB_D1_ID = "06fd466a-3878-4e89-b3d7-2d680bfba17f";
const NALIPO_D1_ID = "daa3eb2b-5638-4d24-b165-dce7a13a152a";

function fail(message) {
  console.error(`validate:production-go-live — ${message}`);
  process.exit(1);
}

const raw = readFileSync(PROD_TOML, "utf8");

if (!/name\s*=\s*"pizza-lab"/.test(raw)) {
  fail('name must be "pizza-lab" (not pizza-lab-staging)');
}
if (!/workers_dev\s*=\s*true/.test(raw)) {
  fail(
    "workers_dev = true is required for go-live (keep workers_dev = false until Access + checklist complete; use validate:production-config for private phase)",
  );
}
if (/workers_dev\s*=\s*false/.test(raw)) {
  fail("workers_dev = false is not allowed for go-live; use validate:production-config for private phase");
}
if (!/preview_urls\s*=\s*false/.test(raw)) {
  fail("preview_urls = false is required for production Worker");
}
if (!/database_name\s*=\s*"pizza_lab_db"/.test(raw)) {
  fail('database_name must be "pizza_lab_db"');
}
if (!new RegExp(`database_id\\s*=\\s*"${PIZZA_LAB_D1_ID}"`).test(raw)) {
  fail(`database_id must be pizza_lab_db UUID ${PIZZA_LAB_D1_ID}`);
}
if (/database_name\s*=\s*"nalipo-db"/.test(raw)) {
  fail("must not bind nalipo-db");
}
if (/database_name\s*=\s*"nalipo-takeout-db"/.test(raw)) {
  fail("must not bind nalipo-takeout-db");
}
if (raw.includes(NALIPO_D1_ID)) {
  fail("must not reference NALIPO reservation database_id");
}
if (!/binding\s*=\s*"DB"/.test(raw)) {
  fail('D1 binding must be "DB"');
}
if (!/binding\s*=\s*"ASSETS"/.test(raw)) {
  fail('ASSETS binding must remain');
}
if (!/service\s*=\s*"pizza-lab"/.test(raw)) {
  fail('WORKER_SELF_REFERENCE service must be "pizza-lab"');
}

if (/\[\[routes\]\]/i.test(raw)) {
  fail("wrangler.toml must not define [[routes]] (no custom domains or zone routes in wrangler)");
}

const openNextMain = join(ROOT, ".open-next", "worker.js");
if (!existsSync(openNextMain)) {
  fail(
    "wrangler deploy --dry-run required — run npm run build:cloudflare first (.open-next/worker.js missing)",
  );
}

let dryRunOutput;
try {
  dryRunOutput = execSync("npx wrangler deploy --dry-run", {
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