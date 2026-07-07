/**
 * Baker's % Calculator 型定義。
 * DIE / Learning / DB とは独立した研究用計算機。
 */

/** 配合の起点 */
export type BakersPercentMode = "total_dough" | "flour_weight";

export interface BakersPercentInput {
  mode: BakersPercentMode;
  /** 総生地量 (g) — mode = total_dough で ballCount 未使用時 */
  totalDoughWeightG?: number | null;
  /** 1 枚重量 (g) */
  ballWeightG?: number | null;
  /** 枚数 */
  ballCount?: number | null;
  /** 粉量 (g) — mode = flour_weight */
  flourWeightG?: number | null;
  /** 加水率 (% Baker's) */
  hydrationPercent: number | null;
  /** 塩 (% Baker's) */
  saltPercent: number | null;
  /** 酵母 (% Baker's) */
  yeastPercent: number | null;
  /** 油 (% Baker's)。省略時 0 */
  oilPercent?: number | null;
}

export interface BakersPercentResult {
  flourG: number;
  waterG: number;
  saltG: number;
  yeastG: number;
  oilG: number;
  totalDoughWeightG: number;
  hydrationPercent: number;
  saltPercent: number;
  yeastPercent: number;
  oilPercent: number;
  /** 100 + 各 % の合計 */
  totalBakersPercent: number;
}

export type PrefermentType = "biga" | "poolish";

export interface PrefermentDefaults {
  hydrationPercent: number;
  yeastPercent: number;
}

export interface PrefermentInput {
  /** 配合全体の粉量 (g) */
  totalFlourG: number | null;
  prefermentType: PrefermentType;
  /** 全体粉に占める preferment 粉の割合 (%) */
  prefermentFlourPercent: number | null;
  /** 配合全体の加水率 (% Baker's) — main + preferment 合算 */
  totalHydrationPercent: number | null;
  /** preferment 内加水率 (% Baker's)。省略時は type デフォルト */
  prefermentHydrationPercent?: number | null;
  /** preferment 粉に対する酵母 (% Baker's)。省略時は type デフォルト */
  prefermentYeastPercent?: number | null;
}

export interface PrefermentResult {
  prefermentType: PrefermentType;
  prefermentFlourPercent: number;
  prefermentFlourG: number;
  prefermentWaterG: number;
  prefermentYeastG: number;
  mainFlourG: number;
  mainWaterG: number;
  totalWaterG: number;
  prefermentHydrationPercent: number;
  prefermentYeastPercent: number;
}

export interface CalculatorOutcome<T> {
  result: T | null;
  error: string | null;
}

/** 文字列入力を安全に数値化。空・不正・NaN は null */
export function parseCalculatorNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

export function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isNonNegativeNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function isValidPercent(value: number | null | undefined): value is number {
  return isNonNegativeNumber(value);
}

export function isValidPrefermentFlourPercent(
  value: number | null | undefined,
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value < 100;
}
