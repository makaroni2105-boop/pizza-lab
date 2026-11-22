/**
 * 毎日の仕込み（NALIPO ポーリッシュ配合）— 型定義。
 * 基準レシピはここで定義。セッション調整は永続の研究設定に混ぜない。
 */

/** NALIPO 現行の基準配合（確定値） */
export const NALIPO_DAILY_PREP_BASELINE = {
  poolishPercentOfTotalFlour: 30,
  poolishHydrationPercent: 100,
  totalHydrationPercent: 70,
  saltPercent: 3,
  totalYeastPercent: 0.3,
  /** 総イーストのうち前種へ（残りは本練り） */
  poolishYeastFraction: 0.5,
} as const;

/**
 * 仕上げ水ルール（仮仕様）。
 * 基準レシピ JSON / method-presets には書き込まない。
 */
export const DAILY_PREP_FINISH_WATER_RULE = {
  provisional: true as const,
  /** 総粉量に対する % */
  percentOfTotalFlour: 10,
  labelJa: "仮仕様: 仕上げ水 = 総粉量の 10%",
} as const;

/** UI「配合を調整」で許容する範囲（セッションのみ） */
export const DAILY_PREP_ADJUSTMENT_LIMITS = {
  poolishPercentMin: 20,
  poolishPercentMax: 40,
  totalHydrationPercentMin: 60,
  totalHydrationPercentMax: 80,
} as const;

export const DAILY_PREP_FLOUR_KG_MIN = 1;
export const DAILY_PREP_FLOUR_KG_MAX = 20;

/** 初回ピン留め用 kg（頻度学習前） */
export const DAILY_PREP_DEFAULT_PIN_KG = [5, 8, 10, 16] as const;

export interface DailyPrepSessionAdjustment {
  poolishPercentOfTotalFlour?: number;
  totalHydrationPercent?: number;
}

export interface DailyPrepComputeInput {
  totalFlourKg: number;
  adjustment?: DailyPrepSessionAdjustment;
}

export interface DailyPrepDayBefore {
  flourG: number;
  waterG: number;
  yeastG: number;
}

export interface DailyPrepDayOf {
  flourG: number;
  /** ミキサーに最初に入れる氷水 */
  firstWaterG: number;
  /** 別容器に取る仕上げ用の水 */
  finishWaterG: number;
  yeastG: number;
  saltG: number;
}

export interface DailyPrepAppliedFormula {
  poolishPercentOfTotalFlour: number;
  poolishHydrationPercent: number;
  totalHydrationPercent: number;
  saltPercent: number;
  totalYeastPercent: number;
}

export interface DailyPrepInvariantChecks {
  flourSumMatchesTotal: boolean;
  waterSumMatchesTotalHydration: boolean;
  mainWaterSplitMatches: boolean;
  yeastSumMatchesTotal: boolean;
  allNonNegative: boolean;
}

export interface DailyPrepComputeResult {
  totalFlourKg: number;
  totalFlourG: number;
  applied: DailyPrepAppliedFormula;
  finishWaterRule: typeof DAILY_PREP_FINISH_WATER_RULE;
  dayBefore: DailyPrepDayBefore;
  dayOf: DailyPrepDayOf;
  checks: DailyPrepInvariantChecks;
}