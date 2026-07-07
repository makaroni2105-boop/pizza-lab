/**
 * unknown / null 補完の共通プリミティブと fieldResolution 記録。
 */

import type { FieldSource, ResolvedValue } from "@/types/die";
import type { UnknownOrNumber, UnknownOrString } from "@/types/profile";

export function isUnresolved(
  value: UnknownOrNumber | UnknownOrString | undefined,
): boolean {
  return value === null || value === undefined || value === "unknown";
}

export function isResolvedNumber(value: UnknownOrNumber | undefined): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export interface ResolveNumberInput {
  fieldKey: string;
  userValue?: UnknownOrNumber;
  presetValue?: UnknownOrNumber;
  profileValue?: UnknownOrNumber;
  masterValue?: number | null;
  learningValue?: number;
  masterSourceDetail?: string;
}

export interface ResolveStringInput {
  fieldKey: string;
  userValue?: string | null | "unknown";
  presetValue?: string | null | "unknown";
  profileValue?: string | null | "unknown";
  masterValue?: string | null;
  masterSourceDetail?: string;
}

export interface FieldResolveResult<T> {
  value: T | null;
  resolution: ResolvedValue<T | null> | null;
  isUnresolved: boolean;
}

function buildResolution<T>(
  value: T,
  source: FieldSource,
  wasEstimated: boolean,
  sourceDetail?: string,
): ResolvedValue<T> {
  return {
    value,
    source,
    ...(sourceDetail ? { sourceDetail } : {}),
    wasEstimated,
  };
}

export function resolveNumber(input: ResolveNumberInput): FieldResolveResult<number> {
  const {
    userValue,
    presetValue,
    profileValue,
    masterValue,
    learningValue,
    masterSourceDetail,
  } = input;

  if (isResolvedNumber(userValue)) {
    return {
      value: userValue,
      resolution: buildResolution(userValue, "user", false),
      isUnresolved: false,
    };
  }

  if (isResolvedNumber(presetValue)) {
    return {
      value: presetValue,
      resolution: buildResolution(presetValue, "preset", true),
      isUnresolved: false,
    };
  }

  if (isResolvedNumber(profileValue)) {
    return {
      value: profileValue,
      resolution: buildResolution(profileValue, "profile", true),
      isUnresolved: false,
    };
  }

  if (typeof masterValue === "number" && !Number.isNaN(masterValue)) {
    return {
      value: masterValue,
      resolution: buildResolution(masterValue, "master", true, masterSourceDetail),
      isUnresolved: false,
    };
  }

  if (typeof learningValue === "number" && !Number.isNaN(learningValue)) {
    return {
      value: learningValue,
      resolution: buildResolution(learningValue, "learning", true),
      isUnresolved: false,
    };
  }

  return {
    value: null,
    resolution: null,
    isUnresolved: true,
  };
}

export function resolveString(input: ResolveStringInput): FieldResolveResult<string> {
  const { userValue, presetValue, profileValue, masterValue, masterSourceDetail } = input;

  if (typeof userValue === "string" && userValue !== "unknown" && userValue.length > 0) {
    return {
      value: userValue,
      resolution: buildResolution(userValue, "user", false),
      isUnresolved: false,
    };
  }

  if (typeof presetValue === "string" && presetValue !== "unknown" && presetValue.length > 0) {
    return {
      value: presetValue,
      resolution: buildResolution(presetValue, "preset", true),
      isUnresolved: false,
    };
  }

  if (
    typeof profileValue === "string" &&
    profileValue !== "unknown" &&
    profileValue.length > 0
  ) {
    return {
      value: profileValue,
      resolution: buildResolution(profileValue, "profile", true),
      isUnresolved: false,
    };
  }

  if (typeof masterValue === "string" && masterValue.length > 0) {
    return {
      value: masterValue,
      resolution: buildResolution(masterValue, "master", true, masterSourceDetail),
      isUnresolved: false,
    };
  }

  return {
    value: null,
    resolution: null,
    isUnresolved: true,
  };
}

export class FieldResolutionTracker {
  private readonly map: Record<string, ResolvedValue> = {};
  private estimatedCount = 0;
  readonly unresolvedFields: string[] = [];

  record(fieldKey: string, result: FieldResolveResult<unknown>): void {
    if (result.resolution) {
      this.map[fieldKey] = result.resolution;
      if (result.resolution.source !== "user") {
        this.estimatedCount += 1;
      }
      return;
    }

    if (result.isUnresolved) {
      this.unresolvedFields.push(fieldKey);
    }
  }

  recordComputed(
    fieldKey: string,
    value: unknown,
    sourceDetail: string,
    wasEstimated = true,
  ): void {
    this.map[fieldKey] = {
      value,
      source: "computed",
      sourceDetail,
      wasEstimated,
    };
    if (wasEstimated) {
      this.estimatedCount += 1;
    }
  }

  recordWeather(fieldKey: string, value: number, sourceDetail?: string): void {
    this.map[fieldKey] = {
      value,
      source: "weather",
      ...(sourceDetail ? { sourceDetail } : {}),
      wasEstimated: true,
    };
    this.estimatedCount += 1;
  }

  getFieldResolution(): Record<string, ResolvedValue> {
    return { ...this.map };
  }

  getEstimatedFieldCount(): number {
    return this.estimatedCount;
  }
}
