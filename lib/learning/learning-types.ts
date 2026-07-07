/**
 * Learning Engine 型定義。
 * 「その店の100点」を Run 記録と集計で学習するためのデータ構造。
 */

/** 学習補正を適用する最小 Run 数 */
export const LEARNING_MIN_RUN_COUNT = 5;

/** 信頼度「高」とみなす Run 数（DIE confidence 参照） */
export const LEARNING_HIGH_CONFIDENCE_RUN_COUNT = 20;

/** 摩擦補正の集計ウィンドウ（直近 N 回） */
export const LEARNING_FRICTION_WINDOW_SIZE = 20;

/** 職人評価（1=遠い … 5=その店の100点に近い） */
export type CraftsmanScore = 1 | 2 | 3 | 4 | 5;

export const CRAFTSMAN_SCORE_MIN = 1;
export const CRAFTSMAN_SCORE_MAX = 5;

/** 100点換算の中立点（スコア 3 ≒ 60点） */
export const CRAFTSMAN_NEUTRAL_SCORE = 3;

/** 1 Run 時点の環境スナップショット（摩擦逆算用） */
export interface LearningRunSnapshot {
  flourTempC: number;
  waterTempC: number;
  roomTempC: number;
}

/** 1回の仕込み・焼成記録 */
export interface LearningRun {
  id: string;
  shopId: string;
  mixerKey: string;
  recordedAt: string;
  snapshot: LearningRunSnapshot;
  /** DIE 予測摩擦 (°C) */
  predictedFrictionC: number;
  /** DIE 予測生地温 (°C) */
  predictedDoughTempC: number;
  /** 職人が入力する実測生地温 (°C) */
  actualDoughTempC: number;
  /** その Run の目標 DDT (°C)。任意 */
  targetDdtC?: number;
  /** 職人評価 1〜5（その店の100点への近さ） */
  craftsmanScore?: CraftsmanScore;
  /** 任意メモ（今日の一枚の記録） */
  memo?: string | null;
}

/** 摩擦補正の集計結果 */
export interface FrictionCorrectionResult {
  offsetC: number;
  runCount: number;
  windowRunCount: number;
  isLearningComplete: boolean;
  statistic: "mean";
}

/** DDT 補正の集計結果 */
export interface DdtCorrectionResult {
  offsetC: number;
  runCount: number;
  windowRunCount: number;
  isLearningComplete: boolean;
  statistic: "median";
}

/** 職人評価に基づく推奨補正の集計結果（推論なし・集計のみ） */
export interface RecommendationCorrectionResult {
  /** スコア平均（1〜5） */
  scoreMean: number | null;
  /** スコア中央値（1〜5） */
  scoreMedian: number | null;
  /** 100点換算の平均 */
  hundredPointMean: number | null;
  /** 中立(3)からの偏差平均。正=100点側、負=改善余地 */
  biasFromNeutral: number;
  scoredRunCount: number;
  isLearningComplete: boolean;
}

/** ミキサー単位の学習サマリー（profile.learning へ渡す形） */
export interface LearningSummaryResult {
  mixerKey: string;
  runCount: number;
  learnedFrictionOffset: number;
  learnedDdtOffset: number;
  recommendationBiasFromNeutral: number;
  hundredPointMean: number | null;
  isLearningComplete: boolean;
  lastUpdatedAt: string;
}

/** 集計用の統計量 */
export interface NumericAggregate {
  mean: number | null;
  median: number | null;
  count: number;
}
