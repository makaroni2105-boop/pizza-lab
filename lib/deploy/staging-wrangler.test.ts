/**
 * staging Wrangler 設定 — D1 なし・Worker 名固定（営業用 /daily）。
 * deploy は行わない。設定ファイルの回帰検知のみ。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import packageJson from "../../package.json";

const STAGING_WRANGLER = join(process.cwd(), "wrangler.staging.toml");
const ROOT_WRANGLER = join(process.cwd(), "wrangler.toml");

function readToml(relativeFromRoot: string): string {
  return readFileSync(join(process.cwd(), relativeFromRoot), "utf8");
}

describe("wrangler.staging.toml (NALIPO daily staging)", () => {
  it("defines pizza-lab-staging without d1_databases", () => {
    const raw = readFileSync(STAGING_WRANGLER, "utf8");
    expect(raw).toMatch(/name\s*=\s*"pizza-lab-staging"/);
    expect(raw).toMatch(/service\s*=\s*"pizza-lab-staging"/);
    expect(raw).not.toMatch(/\[\[d1_databases\]\]/);
    expect(raw).not.toMatch(/database_id/);
    expect(raw).not.toMatch(/nalipo-db/);
    expect(raw).toMatch(/workers_dev\s*=\s*true/);
    expect(raw).toMatch(/preview_urls\s*=\s*false/);
  });

  it("keeps root wrangler.toml D1 separate from staging file", () => {
    const root = readFileSync(ROOT_WRANGLER, "utf8");
    expect(root).toMatch(/name\s*=\s*"pizza-lab"/);
    expect(root).toMatch(/\[\[d1_databases\]\]/);
    expect(root).toMatch(/database_name\s*=\s*"pizza_lab_db"/);
  });
});

describe("deploy:staging script", () => {
  it("references wrangler.staging.toml not --env staging alone", () => {
    const pkg = JSON.parse(readToml("package.json")) as {
      scripts: Record<string, string>;
    };
    const deploy = pkg.scripts["deploy:staging"] ?? "";
    expect(deploy).toContain("wrangler.staging.toml");
    expect(deploy).not.toMatch(/--env\s+staging/);
  });

  it("validate:staging-config enforces preview_urls and dry-run", () => {
    const validate = packageJson.scripts["validate:staging-config"] ?? "";
    expect(validate).toContain("validate-staging-wrangler.mjs");
  });
});

describe("wrangler version (preview_urls)", () => {
  it("uses wrangler 4.107+ for preview_urls support", () => {
    const version = packageJson.devDependencies?.wrangler ?? "0";
    const match = /^(\^|~)?(\d+)\.(\d+)\./.exec(version);
    expect(match, `unexpected wrangler version: ${version}`).not.toBeNull();
    const major = Number(match![2]);
    const minor = Number(match![3]);
    expect(major > 4 || (major === 4 && minor >= 107)).toBe(true);
  });
});