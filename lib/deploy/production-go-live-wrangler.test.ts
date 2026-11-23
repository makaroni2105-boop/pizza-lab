/**
 * 公開用 validate:production-go-live と非公開 validate:production-config の分離。
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import packageJson from "../../package.json";

const ROOT = process.cwd();
const GO_LIVE_SCRIPT = join(ROOT, "scripts", "validate-production-go-live.mjs");

describe("validate:production-go-live script", () => {
  it("is wired in package.json", () => {
    expect(packageJson.scripts["validate:production-go-live"] ?? "").toContain(
      "validate-production-go-live.mjs",
    );
  });

  it("uses structured TOML gate (not raw regex on comments)", () => {
    const raw = readFileSync(GO_LIVE_SCRIPT, "utf8");
    expect(raw).toContain("wrangler-production-gate.mjs");
    expect(raw).toContain("WRANGLER_GO_LIVE_CONFIG");
  });

  it("rejects current private wrangler.toml (workers_dev=false)", () => {
    const wrangler = readFileSync(join(ROOT, "wrangler.toml"), "utf8");
    expect(wrangler).toMatch(/workers_dev\s*=\s*false/);
    expect(() => {
      execSync("node scripts/validate-production-go-live.mjs", {
        cwd: ROOT,
        stdio: "pipe",
      });
    }).toThrow();
  });

  it("private-phase script still requires workers_dev=false", () => {
    const privateScript = readFileSync(
      join(ROOT, "scripts", "validate-production-wrangler.mjs"),
      "utf8",
    );
    expect(privateScript).toContain("workers_dev = false is required");
    expect(privateScript).toContain("workers_dev = true must not be set before Access go-live");
  });
});