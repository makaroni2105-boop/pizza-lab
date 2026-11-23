/**
 * 営業公開ゲート — workers_dev 誤検知防止（コメント行除外）。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertWorkersDevPhase,
  collectTopLevelAssignments,
  validateProductionGoLiveToml,
} from "../../scripts/lib/wrangler-production-gate.mjs";

const ROOT = process.cwd();
const PROD_WRANGLER = join(ROOT, "wrangler.toml");

describe("wrangler-production-gate", () => {
  it("ignores workers_dev in comments when counting assignments", () => {
    const prod = readFileSync(PROD_WRANGLER, "utf8");
    expect(prod).toMatch(/#\s*workers_dev\s*=\s*false/);
    const { count } = collectTopLevelAssignments(prod, "workers_dev");
    expect(count).toBe(1);
  });

  it("private phase accepts production wrangler despite comment workers_dev=false", () => {
    const prod = readFileSync(PROD_WRANGLER, "utf8");
    expect(assertWorkersDevPhase(prod, "private")).toBe(true);
  });

  it("go-live rejects production wrangler (assignment workers_dev=false)", () => {
    const prod = readFileSync(PROD_WRANGLER, "utf8");
    const result = assertWorkersDevPhase(prod, "go-live");
    expect(result).not.toBe(true);
    if (result !== true) {
      expect(result.message).toContain("workers_dev = true is required");
    }
  });

  it("go-live accepts workers_dev=true when comment still documents false", () => {
    const prod = readFileSync(PROD_WRANGLER, "utf8");
    const goLive = prod.replace(/^workers_dev\s*=\s*false/m, "workers_dev = true");
    expect(assertWorkersDevPhase(goLive, "go-live")).toBe(true);
    expect(validateProductionGoLiveToml(goLive)).toBe(true);
  });

  it("go-live rejects duplicate workers_dev assignments", () => {
    const prod = readFileSync(PROD_WRANGLER, "utf8");
    const duplicate = prod.replace(
      /^workers_dev\s*=\s*false/m,
      "workers_dev = true\nworkers_dev = true",
    );
    const result = assertWorkersDevPhase(duplicate, "go-live");
    expect(result).not.toBe(true);
    if (result !== true) {
      expect(result.message).toContain("exactly once");
    }
  });

  it("go-live rejects missing workers_dev assignment", () => {
    const prod = readFileSync(PROD_WRANGLER, "utf8");
    const missing = prod.replace(/^workers_dev\s*=\s*false/m, "# removed");
    const result = assertWorkersDevPhase(missing, "go-live");
    expect(result).not.toBe(true);
    if (result !== true) {
      expect(result.message).toContain("missing");
    }
  });

  it("go-live rejects non-boolean workers_dev", () => {
    const prod = readFileSync(PROD_WRANGLER, "utf8");
    const invalid = prod.replace(/^workers_dev\s*=\s*false/m, 'workers_dev = "true"');
    const result = assertWorkersDevPhase(invalid, "go-live");
    expect(result).not.toBe(true);
  });
});