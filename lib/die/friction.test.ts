import { describe, expect, it } from "vitest";

import {
  computeFriction,
  determineFrictionSource,
  normalizeFrictionComponent,
} from "./friction";

describe("normalizeFrictionComponent", () => {
  it("returns 0 for null, undefined, and NaN", () => {
    expect(normalizeFrictionComponent(null)).toBe(0);
    expect(normalizeFrictionComponent(undefined)).toBe(0);
    expect(normalizeFrictionComponent(Number.NaN)).toBe(0);
  });

  it("returns the value for finite numbers including negative", () => {
    expect(normalizeFrictionComponent(14)).toBe(14);
    expect(normalizeFrictionComponent(-2.5)).toBe(-2.5);
  });
});

describe("determineFrictionSource", () => {
  it("returns master when offsets are zero", () => {
    expect(determineFrictionSource(0, 0)).toBe("master");
  });

  it("returns learning when only learned offset is non-zero", () => {
    expect(determineFrictionSource(0, 1.5)).toBe("learning");
  });

  it("returns manual when manual offset is non-zero", () => {
    expect(determineFrictionSource(-1, 2)).toBe("manual");
  });
});

describe("computeFriction", () => {
  it("uses base only", () => {
    const result = computeFriction({ baseFrictionC: 14 });

    expect(result.baseFrictionC).toBe(14);
    expect(result.manualFrictionOffsetC).toBe(0);
    expect(result.learnedFrictionOffsetC).toBe(0);
    expect(result.effectiveFrictionC).toBe(14);
    expect(result.frictionRiseC).toBe(14);
    expect(result.frictionSource).toBe("master");
  });

  it("adds manual offset to base", () => {
    const result = computeFriction({
      baseFrictionC: 14,
      manualFrictionOffsetC: 2,
    });

    expect(result.effectiveFrictionC).toBe(16);
    expect(result.frictionSource).toBe("manual");
  });

  it("adds learned offset to base", () => {
    const result = computeFriction({
      baseFrictionC: 14,
      learnedFrictionOffsetC: 1.5,
    });

    expect(result.effectiveFrictionC).toBe(15.5);
    expect(result.frictionSource).toBe("learning");
  });

  it("sums base, manual, and learned", () => {
    const result = computeFriction({
      baseFrictionC: 14,
      manualFrictionOffsetC: 1,
      learnedFrictionOffsetC: 0.5,
    });

    expect(result.effectiveFrictionC).toBe(15.5);
    expect(result.frictionSource).toBe("manual");
  });

  it("treats null and undefined components as zero", () => {
    const result = computeFriction({
      baseFrictionC: null,
      manualFrictionOffsetC: undefined,
      learnedFrictionOffsetC: null,
    });

    expect(result.effectiveFrictionC).toBe(0);
    expect(result.frictionSource).toBe("master");
  });

  it("supports negative correction values", () => {
    const result = computeFriction({
      baseFrictionC: 14,
      manualFrictionOffsetC: -2,
      learnedFrictionOffsetC: -0.5,
    });

    expect(result.effectiveFrictionC).toBe(11.5);
    expect(result.frictionSource).toBe("manual");
  });

  it("prefers manual source when manual and learned are both non-zero", () => {
    const result = computeFriction({
      baseFrictionC: 10,
      manualFrictionOffsetC: 0.5,
      learnedFrictionOffsetC: 1,
    });

    expect(result.effectiveFrictionC).toBe(11.5);
    expect(result.frictionSource).toBe("manual");
  });
});
