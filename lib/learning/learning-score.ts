/**
 * 職人評価（1〜5）— 「その店の100点」への近さ。
 * 純粋関数のみ。推論・AI 不使用。
 */

import type { CraftsmanScore, LearningRun, NumericAggregate } from "./learning-types";
import {
  CRAFTSMAN_NEUTRAL_SCORE,
  CRAFTSMAN_SCORE_MAX,
  CRAFTSMAN_SCORE_MIN,
  LEARNING_MIN_RUN_COUNT,
} from "./learning-types";

export function isCraftsmanScore(value: number): value is CraftsmanScore {
  return (
    Number.isInteger(value) &&
    value >= CRAFTSMAN_SCORE_MIN &&
    value <= CRAFTSMAN_SCORE_MAX
  );
}

/** 1〜5 を 20〜100 の「100点」スケールに線形換算 */
export function scoreToHundredPoint(score: CraftsmanScore): number {
  return score * 20;
}

/** 100点スケールを最も近い 1〜5 スコアに丸める（検証用） */
export function hundredPointToScore(hundredPoint: number): CraftsmanScore {
  const clamped = Math.min(100, Math.max(20, Math.round(hundredPoint / 20) * 20));
  return (clamped / 20) as CraftsmanScore;
}

export function collectCraftsmanScores(runs: LearningRun[]): CraftsmanScore[] {
  const scores: CraftsmanScore[] = [];

  for (const run of runs) {
    if (run.craftsmanScore !== undefined && isCraftsmanScore(run.craftsmanScore)) {
      scores.push(run.craftsmanScore);
    }
  }

  return scores;
}

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

export function aggregateNumericValues(values: number[]): NumericAggregate {
  return {
    mean: mean(values),
    median: median(values),
    count: values.length,
  };
}

export function aggregateCraftsmanScores(runs: LearningRun[]): NumericAggregate {
  const scores = collectCraftsmanScores(runs).map((score) => score as number);
  return aggregateNumericValues(scores);
}

export function computeHundredPointMean(runs: LearningRun[]): number | null {
  const scores = collectCraftsmanScores(runs);

  if (scores.length === 0) {
    return null;
  }

  const hundredPoints = scores.map(scoreToHundredPoint);
  return mean(hundredPoints);
}

/** 中立(3)からの偏差。正=100点側、負=改善余地 */
export function computeBiasFromNeutral(runs: LearningRun[]): number {
  const aggregate = aggregateCraftsmanScores(runs);

  if (aggregate.mean === null) {
    return 0;
  }

  return aggregate.mean - CRAFTSMAN_NEUTRAL_SCORE;
}

export function isScoredLearningComplete(runs: LearningRun[]): boolean {
  return collectCraftsmanScores(runs).length >= LEARNING_MIN_RUN_COUNT;
}
