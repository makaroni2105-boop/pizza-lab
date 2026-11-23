import { describe, expect, it } from "vitest";

import {
  canUseMemoryPersistence,
  isD1RequiredForDailyPrep,
} from "@/lib/runtime/daily-prep-persistence";

describe("daily-prep persistence policy", () => {
  it("requires D1 in production without db", () => {
    expect(isD1RequiredForDailyPrep("production", false, {})).toBe(true);
    expect(canUseMemoryPersistence("production", {})).toBe(false);
  });

  it("allows memory in test mode", () => {
    expect(canUseMemoryPersistence("test", {})).toBe(true);
    expect(isD1RequiredForDailyPrep("test", false, {})).toBe(false);
  });
});