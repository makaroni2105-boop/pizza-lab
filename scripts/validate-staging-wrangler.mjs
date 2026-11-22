/**
 * staging Wrangler 事前検証（deploy しない）。
 * - wrangler.staging.toml: workers_dev, preview_urls, D1 なし
 * - wrangler deploy --dry-run: Worker 名・binding
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const STAGING_TOML = join(ROOT, "wrangler.staging.toml");

function fail(message) {
  console.error(`validate:staging-config — ${message}`);
  process.exit(1);
}

const raw = readFileSync(STAGING_TOML, "utf8");

if (!/name\s*=\s*"pizza-lab-staging"/.test(raw)) {
  fail('name must be "pizza-lab-staging"');
}
if (!/workers_dev\s*=\s*true/.test(raw)) {
  fail("workers_dev = true is required (production workers.dev for Access hostname)");
}
if (!/preview_urls\s*=\s*false/.test(raw)) {
  fail("preview_urls = false is required (disable Preview / Version URLs)");
}
if (/\[\[d1_databases\]\]/.test(raw) || /database_id/.test(raw)) {
  fail("D1 bindings must not appear in wrangler.staging.toml");
}

let dryRunOutput;
try {
  dryRunOutput = execSync(
    "npx wrangler deploy --dry-run -c wrangler.staging.toml",
    { encoding: "utf8", cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
  );
} catch (error) {
  const out = error.stdout?.toString() ?? "";
  const err = error.stderr?.toString() ?? "";
  fail(`wrangler deploy --dry-run failed:\n${out}\n${err}`);
}

const combined = dryRunOutput;
if (!/pizza-lab-staging/.test(combined)) {
  fail("dry-run output must reference Worker pizza-lab-staging");
}
if (/D1 Database|env\.DB/.test(combined)) {
  fail("dry-run must not include D1 bindings");
}

console.log("validate:staging-config OK — pizza-lab-staging, workers_dev=true, preview_urls=false, no D1");