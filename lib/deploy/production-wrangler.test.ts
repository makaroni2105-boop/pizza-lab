/**
 * 本番 wrangler.toml — 営業 Worker pizza-lab（deploy しない）。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import packageJson from "../../package.json";

const ROOT_WRANGLER = join(process.cwd(), "wrangler.toml");
const PIZZA_LAB_D1_ID = "06fd466a-3878-4e89-b3d7-2d680bfba17f";
const NALIPO_D1_ID = "daa3eb2b-5638-4d24-b165-dce7a13a152a";

describe("wrangler.toml (production pizza-lab)", () => {
  it("keeps production worker non-public until Access (workers_dev=false, preview_urls=false)", () => {
    const raw = readFileSync(ROOT_WRANGLER, "utf8");
    expect(raw).toMatch(/name\s*=\s*"pizza-lab"/);
    expect(raw).toMatch(/workers_dev\s*=\s*false/);
    expect(raw).not.toMatch(/workers_dev\s*=\s*true/);
    expect(raw).toMatch(/preview_urls\s*=\s*false/);
    expect(raw).not.toMatch(/\[\[routes\]\]/i);
  });

  it("defines pizza-lab with pizza_lab_db and preview_urls=false", () => {
    const raw = readFileSync(ROOT_WRANGLER, "utf8");
    expect(raw).toMatch(/name\s*=\s*"pizza-lab"/);
    expect(raw).toMatch(/preview_urls\s*=\s*false/);
    expect(raw).toMatch(/database_name\s*=\s*"pizza_lab_db"/);
    expect(raw).toMatch(new RegExp(`database_id\\s*=\\s*"${PIZZA_LAB_D1_ID}"`));
    expect(raw).toMatch(/binding\s*=\s*"DB"/);
    expect(raw).toMatch(/binding\s*=\s*"ASSETS"/);
    expect(raw).toMatch(/service\s*=\s*"pizza-lab"/);
    expect(raw).not.toMatch(/database_name\s*=\s*"nalipo-db"/);
    expect(raw).not.toMatch(/database_name\s*=\s*"nalipo-takeout-db"/);
    expect(raw).not.toContain(NALIPO_D1_ID);
    expect(raw).not.toMatch(/name\s*=\s*"pizza-lab-staging"/);
  });

  it("does not declare NALIPO custom routes in wrangler.toml", () => {
    const raw = readFileSync(ROOT_WRANGLER, "utf8");
    if (/\[\[routes\]\]/i.test(raw)) {
      expect(raw).not.toMatch(/nalipo/i);
    }
  });
});

describe("validate:production-config script", () => {
  it("is wired in package.json", () => {
    const validate = packageJson.scripts["validate:production-config"] ?? "";
    expect(validate).toContain("validate-production-wrangler.mjs");
  });
});