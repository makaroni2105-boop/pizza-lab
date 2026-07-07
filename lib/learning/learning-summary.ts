/**
 * Run 履歴から摩擦・DDT・推奨補正を集計する純粋関数。
 * 平均・中央値・件数のみ。推論・AI 不使用。
 */

import type { LearningSummary } from "@/types/profile";

import {
  computeBiasFromNeutral,
  computeHundredPointMean,
  aggregateCraftsmanScores,
} from "./learning-score";
import {
  computeDdtErrorC,
  computeFrictionErrorC,
  takeRecentRuns,
} from "./learning-run";
import type {
  DdtCorrectionResult,
  FrictionCorrectionResult,
  LearningRun,
  LearningSummaryResult,
  RecommendationCorrectionResult,
} from "./learning-types";
import {
  LEARNING_FRICTION_WINDOW_SIZE,
  LEARNING_MIN_RUN_COUNT,
} from "./learning-types";

function mean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }

  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface LearningSummaryOptions {
  minRunCount?: number;
  frictionWindowSize?: number;
  ddtWindowSize?: number;
  lastUpdatedAt?: string;
}

/**
 * 摩擦補正 = 直近 N Run の摩擦誤差の平均。
 * Run 数が minRunCount 未満のとき offsetC は 0。
 */
export function computeFrictionCorrection(
  runs: LearningRun[],
  options?: Pick<LearningSummaryOptions, "minRunCount" | "frictionWindowSize">,
): FrictionCorrectionResult {
  const minRunCount = options?.minRunCount ?? LEARNING_MIN_RUN_COUNT;
  const windowSize = options?.frictionWindowSize ?? LEARNING_FRICTION_WINDOW_SIZE;
  const runCount = runs.length;
  const recent = takeRecentRuns(runs, windowSize);
  const errors = recent.map(computeFrictionErrorC);

  if (runCount < minRunCount) {
    return {
      offsetC: 0,
      runCount,
      windowRunCount: recent.length,
      isLearningComplete: false,
      statistic: "mean",
    };
  }

  return {
    offsetC: mean(errors) ?? 0,
    runCount,
    windowRunCount: recent.length,
    isLearningComplete: true,
    statistic: "mean",
  };
}

/**
 * DDT 補正 = 直近 N Run の (実測生地温 − 目標 DDT) の中央値。
 * targetDdtC がある Run のみ集計。
 */
export function computeDdtCorrection(
  runs: LearningRun[],
  options?: Pick<LearningSummaryOptions, "minRunCount" | "ddtWindowSize">,
): DdtCorrectionResult {
  const minRunCount = options?.minRunCount ?? LEARNING_MIN_RUN_COUNT;
  const windowSize = options?.ddtWindowSize ?? LEARNING_FRICTION_WINDOW_SIZE;
  const runCount = runs.length;
  const recent = takeRecentRuns(runs, windowSize);
  const errors = recent
    .map(computeDdtErrorC)
    .filter((value) => Number.isFinite(value));

  if (runCount < minRunCount || errors.length === 0) {
    return {
      offsetC: 0,
      runCount,
      windowRunCount: errors.length,
      isLearningComplete: false,
      statistic: "median",
    };
  }

  return {
    offsetC: median(errors) ?? 0,
    runCount,
    windowRunCount: errors.length,
    isLearningComplete: true,
    statistic: "median",
  };
}

/**
 * 推奨補正 = 職人評価 (1〜5) の平均・中央値・100点換算・中立偏差。
 * 推論は行わず、記録されたスコアの集計のみ。
 */
export function computeRecommendationCorrection(
  runs: LearningRun[],
  options?: Pick<LearningSummaryOptions, "minRunCount">,
): RecommendationCorrectionResult {
  const minRunCount = options?.minRunCount ?? LEARNING_MIN_RUN_COUNT;
  const aggregate = aggregateCraftsmanScores(runs);
  const scoredRunCount = aggregate.count;
  const isLearningComplete = scoredRunCount >= minRunCount;

  return {
    scoreMean: aggregate.mean,
    scoreMedian: aggregate.median,
    hundredPointMean: computeHundredPointMean(runs),
    biasFromNeutral: computeBiasFromNeutral(runs),
    scoredRunCount,
    isLearningComplete,
  };
}

/** ミキサー単位の学習サマリーを組み立てる */
export function buildLearningSummaryResult(
  mixerKey: string,
  runs: LearningRun[],
  options?: LearningSummaryOptions,
): LearningSummaryResult {
  const friction = computeFrictionCorrection(runs, options);
  const ddt = computeDdtCorrection(runs, options);
  const recommendation = computeRecommendationCorrection(runs, options);

  const lastRun = takeRecentRuns(runs, 1)[0];

  return {
    mixerKey,
    runCount: runs.length,
    learnedFrictionOffset: friction.offsetC,
    learnedDdtOffset: ddt.offsetC,
    recommendationBiasFromNeutral: recommendation.biasFromNeutral,
    hundredPointMean: recommendation.hundredPointMean,
    isLearningComplete: friction.isLearningComplete,
    lastUpdatedAt:
      options?.lastUpdatedAt ?? lastRun?.recordedAt ?? new Date(0).toISOString(),
  };
}

/** profile.learning 用の LearningSummary に変換（摩擦のみ既存型へ） */
export function toProfileLearningSummary(
  summary: LearningSummaryResult,
): LearningSummary {
  return {
    mixerKey: summary.mixerKey,
    runCount: summary.runCount,
    learnedFrictionOffset: summary.learnedFrictionOffset,
    isLearningComplete: summary.isLearningComplete,
    lastUpdatedAt: summary.lastUpdatedAt,
  };
}

/** 複数ミキサーの Run から mixerKey ごとにサマリーを生成 */
export function buildLearningSummariesByMixer(
  runs: LearningRun[],
  options?: LearningSummaryOptions,
): LearningSummaryResult[] {
  const mixerKeys = [...new Set(runs.map((run) => run.mixerKey))];

  return mixerKeys.map((mixerKey) =>
    buildLearningSummaryResult(
      mixerKey,
      runs.filter((run) => run.mixerKey === mixerKey),
      options,
    ),
  );
}
