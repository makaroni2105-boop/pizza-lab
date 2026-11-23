import { describe, expect, it } from "vitest";

import { computeNalipoDailyPrep } from "@/lib/daily-prep/poolish-daily-recipe";

import { buildActualUsageFromForm } from "./actual-usage-parse";

describe("buildActualUsageFromForm", () => {
  const result = computeNalipoDailyPrep({ totalFlourKg: 10 });

  if (!result) {
    throw new Error("compute failed");
  }

  it("returns no overrides when fields empty", () => {
    const built = buildActualUsageFromForm(result, {});
    expect(built.hasActualOverrides).toBe(false);
    expect(built.actualMaterials).toBeUndefined();
  });

  it("overrides yeast only", () => {
    const built = buildActualUsageFromForm(result, {
      poolishYeastG: "12",
      mainYeastG: "8",
    });
    expect(built.hasActualOverrides).toBe(true);
    expect(built.actualMaterials?.dayBefore?.yeastG).toBe(12);
    expect(built.actualMaterials?.dayOf?.yeastG).toBe(8);
  });
});