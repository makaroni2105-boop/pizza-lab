/**
 * 本番 Wrangler 事前検証（deploy しない）。
 * - wrangler.toml: Worker 名、D1 pizza_lab_db、workers_dev=false、preview_urls、NALIPO 分離
 * - 必須: wrangler deploy --dry-run（.open-next ビルド後 — 省略時は失敗）
 *
 * NALIPO 予約・テイクアウトの Routes / カスタムドメインは
 * 本リポジトリの wrangler から変更しない（ダッシュボード操作も deploy 手順で禁止）。
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PROD_TOML = join(ROOT, "wrangler.toml");
const PIZZA_LAB_D1_ID = "06fd466a-3878-4e89-b3d7-2d680bfba17f";
const NALIPO_D1_ID = "daa3eb2b-5638-4d24-b165-dce7a13a152a";

function fail(message) {
  console.error(`validate:production-config — ${message}`);
  process.exit(1);
}

const raw = readFileSync(PROD_TOML, "utf8");

if (!/name\s*=\s*"pizza-lab"/.test(raw)) {
  fail('name must be "pizza-lab" (not pizza-lab-staging)');
}
if (!/workers_dev\s*=\s*false/.test(raw)) {
  fail(
    "workers_dev = false is required until Cloudflare Access protection is complete (workers_dev = true fails this check)",
  );
}
if (/workers_dev\s*=\s*true/.test(raw)) {
  fail(
    "workers_dev = true must not be set before Access go-live; keep workers_dev = false",
  );
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
  fail("wrangler.toml must not define [[routes]] (no custom domains or zone routes)");
}

const openNextMain = join(ROOT, ".open-next", "worker.js");
if (existsSync(openNextMain)) {
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
} else {
  fail(
    "wrangler deploy --dry-run required — run npm run build:cloudflare first (.open-next/worker.js missing)",
  );
}

console.log(
  "validate:production-config OK — pizza-lab, pizza_lab_db, workers_dev=false, preview_urls=false, NALIPO D1 isolated",
);