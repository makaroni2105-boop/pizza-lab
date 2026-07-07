/**
 * 1 Run（1回の仕込み・焼成）記録の純粋関数。
 */

import type { CraftsmanScore, LearningRun, LearningRunSnapshot } from "./learning-types";
import { isCraftsmanScore } from "./learning-score";

import type { DieOutput } from "@/types/die";
import type { ShopProfile } from "@/types/profile";
import { buildMixerKey } from "@/lib/defaults/masters";

export interface LearningRunInput {
  id: string;
  shopId: string;
  mixerKey: string;
  recordedAt: string;
  snapshot: LearningRunSnapshot;
  predictedFrictionC: number;
  predictedDoughTempC: number;
  actualDoughTempC: number;
  targetDdtC?: number;
  craftsmanScore?: CraftsmanScore;
  memo?: string | null;
}

export interface LearningRunValidationResult {
  valid: boolean;
  errors: string[];
}

function isFiniteNumber(value: number): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateLearningRunSnapshot(
  snapshot: LearningRunSnapshot,
): LearningRunValidationResult {
  const errors: string[] = [];

  if (!isFiniteNumber(snapshot.flourTempC)) {
    errors.push("snapshot.flourTempC が不正です");
  }

  if (!isFiniteNumber(snapshot.waterTempC)) {
    errors.push("snapshot.waterTempC が不正です");
  }

  if (!isFiniteNumber(snapshot.roomTempC)) {
    errors.push("snapshot.roomTempC が不正です");
  }

  return { valid: errors.length === 0, errors };
}

export function validateLearningRun(input: LearningRunInput): LearningRunValidationResult {
  const errors: string[] = [];

  if (!input.id.trim()) {
    errors.push("id が空です");
  }

  if (!input.shopId.trim()) {
    errors.push("shopId が空です");
  }

  if (!input.mixerKey.trim()) {
    errors.push("mixerKey が空です");
  }

  if (!input.recordedAt.trim()) {
    errors.push("recordedAt が空です");
  }

  const snapshotResult = validateLearningRunSnapshot(input.snapshot);
  errors.push(...snapshotResult.errors);

  if (!isFiniteNumber(input.predictedFrictionC)) {
    errors.push("predictedFrictionC が不正です");
  }

  if (!isFiniteNumber(input.predictedDoughTempC)) {
    errors.push("predictedDoughTempC が不正です");
  }

  if (!isFiniteNumber(input.actualDoughTempC)) {
    errors.push("actualDoughTempC が不正です");
  }

  if (input.targetDdtC !== undefined && !isFiniteNumber(input.targetDdtC)) {
    errors.push("targetDdtC が不正です");
  }

  if (
    input.craftsmanScore !== undefined &&
    !isCraftsmanScore(input.craftsmanScore)
  ) {
    errors.push("craftsmanScore は 1〜5 の整数です");
  }

  return { valid: errors.length === 0, errors };
}

export function createLearningRun(input: LearningRunInput): LearningRun {
  const validation = validateLearningRun(input);

  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  return { ...input };
}

export function generateLearningRunId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface QuickRecordInput {
  shopId: string;
  profile: ShopProfile;
  output: DieOutput;
  actualDoughTempC: number;
  craftsmanScore: CraftsmanScore;
  memo?: string | null;
  recordedAt?: string;
  /** resolvedInput が無いときの室温フォールバック */
  shopRoomTempC?: number;
}

/** Quick Mode の DIE 結果と実測入力から LearningRun を組み立てる */
export function buildLearningRunFromQuickRecord(
  input: QuickRecordInput,
): LearningRun {
  const resolved = input.output.resolvedInput;
  const flourTempC =
    resolved?.flour.effectiveFlourTempC ??
    resolved?.temperature.flourTempC ??
    20;
  const waterTempC =
    input.output.temperature.effectiveWaterTempC ??
    input.output.temperature.recommendedWaterTempC;
  const roomTempC =
    resolved?.environment.shopRoomTempC ?? input.shopRoomTempC ?? 26;

  const snapshot: LearningRunSnapshot = {
    flourTempC,
    waterTempC,
    roomTempC,
  };

  const mixerKey = buildMixerKey(
    input.profile.mixer.type,
    input.profile.mixer.modelId,
  );

  return createLearningRun({
    id: generateLearningRunId(),
    shopId: input.shopId,
    mixerKey,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    snapshot,
    predictedFrictionC: input.output.temperature.frictionRiseC,
    predictedDoughTempC: input.output.temperature.predictedDoughTempC,
    actualDoughTempC: input.actualDoughTempC,
    targetDdtC: input.output.temperature.targetDdtC,
    craftsmanScore: input.craftsmanScore,
    memo: input.memo?.trim() ? input.memo.trim() : undefined,
  });
}

/**
 * 実測摩擦 (°C)。
 * 実測生地温 × 4 − 粉温 − 水温 − 室温
 */
export function computeActualFrictionC(
  actualDoughTempC: number,
  snapshot: LearningRunSnapshot,
): number {
  return (
    actualDoughTempC * 4 -
    snapshot.flourTempC -
    snapshot.waterTempC -
    snapshot.roomTempC
  );
}

/** 摩擦誤差 = 実測摩擦 − 予測摩擦 */
export function computeFrictionErrorC(run: LearningRun): number {
  const actualFrictionC = computeActualFrictionC(
    run.actualDoughTempC,
    run.snapshot,
  );

  return actualFrictionC - run.predictedFrictionC;
}

/** DDT 誤差 = 実測生地温 − 目標 DDT。targetDdtC 未設定時は NaN */
export function computeDdtErrorC(run: LearningRun): number {
  if (run.targetDdtC === undefined) {
    return Number.NaN;
  }

  return run.actualDoughTempC - run.targetDdtC;
}

export function filterRunsByMixerKey(
  runs: LearningRun[],
  mixerKey: string,
): LearningRun[] {
  return runs.filter((run) => run.mixerKey === mixerKey);
}

export function filterRunsByShopId(
  runs: LearningRun[],
  shopId: string,
): LearningRun[] {
  return runs.filter((run) => run.shopId === shopId);
}

export function sortRunsByRecordedAt(runs: LearningRun[]): LearningRun[] {
  return [...runs].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
}

export function takeRecentRuns(
  runs: LearningRun[],
  windowSize: number,
): LearningRun[] {
  if (windowSize <= 0) {
    return [];
  }

  const sorted = sortRunsByRecordedAt(runs);
  return sorted.slice(-windowSize);
}
