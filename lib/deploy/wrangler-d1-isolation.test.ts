import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");

const NALIPO_D1_ID = "daa3eb2b-5638-4d24-b165-dce7a13a152a";
const PIZZA_LAB_D1_ID = "06fd466a-3878-4e89-b3d7-2d680bfba17f";

describe("wrangler D1 isolation (Pizza Lab vs NALIPO)", () => {
  it("production wrangler binds pizza_lab_db only", () => {
    const raw = readFileSync(resolve(ROOT, "wrangler.toml"), "utf8");
    expect(raw).toMatch(/name\s*=\s*"pizza-lab"/);
    expect(raw).toMatch(/preview_urls\s*=\s*false/);
    expect(raw).toMatch(/database_name\s*=\s*"pizza_lab_db"/);
    expect(raw).toMatch(new RegExp(`database_id\\s*=\\s*"${PIZZA_LAB_D1_ID}"`));
    expect(raw).not.toMatch(/database_name\s*=\s*"nalipo-db"/);
    expect(raw).not.toMatch(/database_name\s*=\s*"nalipo-takeout-db"/);
    expect(raw).not.toContain(NALIPO_D1_ID);
    expect(raw).toMatch(/binding\s*=\s*"DB"/);
  });

  it("staging wrangler has no D1 binding", () => {
    const raw = readFileSync(resolve(ROOT, "wrangler.staging.toml"), "utf8");
    expect(raw).not.toMatch(/\[\[d1_databases\]\]/);
    expect(raw).not.toMatch(/database_name\s*=\s*"pizza_lab_db"/);
    expect(raw).not.toContain(PIZZA_LAB_D1_ID);
    expect(raw).not.toContain(NALIPO_D1_ID);
  });
});