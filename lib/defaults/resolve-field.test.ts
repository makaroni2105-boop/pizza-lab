import { describe, expect, it } from "vitest";

import {
  FieldResolutionTracker,
  isUnresolved,
  resolveNumber,
  resolveString,
} from "./resolve-field";

describe("resolve-field", () => {
  it("detects unresolved values", () => {
    expect(isUnresolved(null)).toBe(true);
    expect(isUnresolved("unknown")).toBe(true);
    expect(isUnresolved(undefined)).toBe(true);
    expect(isUnresolved(24)).toBe(false);
  });

  it("prefers user over profile and master", () => {
    const result = resolveNumber({
      fieldKey: "test.field",
      userValue: 22,
      profileValue: 24,
      masterValue: 26,
    });
    expect(result.value).toBe(22);
    expect(result.resolution?.source).toBe("user");
    expect(result.isUnresolved).toBe(false);
  });

  it("falls back to profile then master", () => {
    const fromProfile = resolveNumber({
      fieldKey: "test.field",
      userValue: "unknown",
      profileValue: 24,
      masterValue: 26,
    });
    expect(fromProfile.value).toBe(24);
    expect(fromProfile.resolution?.source).toBe("profile");

    const fromMaster = resolveNumber({
      fieldKey: "test.field",
      userValue: null,
      profileValue: "unknown",
      masterValue: 26,
      masterSourceDetail: "master:test",
    });
    expect(fromMaster.value).toBe(26);
    expect(fromMaster.resolution?.source).toBe("master");
    expect(fromMaster.resolution?.sourceDetail).toBe("master:test");
  });

  it("returns unresolved when no source has a value", () => {
    const result = resolveNumber({
      fieldKey: "test.field",
      userValue: "unknown",
      profileValue: null,
      masterValue: null,
    });
    expect(result.value).toBeNull();
    expect(result.resolution).toBeNull();
    expect(result.isUnresolved).toBe(true);
  });

  it("resolves string fields with preset layer", () => {
    const result = resolveString({
      fieldKey: "method.method",
      userValue: "unknown",
      presetValue: "napoli",
      profileValue: "ny",
      masterValue: "roma",
    });
    expect(result.value).toBe("napoli");
    expect(result.resolution?.source).toBe("preset");
  });

  it("tracks estimated field count excluding user input", () => {
    const tracker = new FieldResolutionTracker();

    tracker.record(
      "a",
      resolveNumber({
        fieldKey: "a",
        userValue: 1,
        masterValue: 2,
      }),
    );
    tracker.record(
      "b",
      resolveNumber({
        fieldKey: "b",
        userValue: "unknown",
        masterValue: 2,
      }),
    );
    tracker.record(
      "c",
      resolveNumber({
        fieldKey: "c",
        userValue: null,
        profileValue: null,
        masterValue: null,
      }),
    );

    expect(tracker.getEstimatedFieldCount()).toBe(1);
    expect(tracker.unresolvedFields).toEqual(["c"]);
    expect(tracker.getFieldResolution().a.source).toBe("user");
    expect(tracker.getFieldResolution().b.wasEstimated).toBe(true);
  });
});
