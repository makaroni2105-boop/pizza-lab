/**
 * 計量表示用の丸め。Pizza-Lab Calculator と同じ 0.1g 単位。
 * Calculator の roundGrams と同一ロジック（重複は Phase A 統合時に意図的に維持）。
 */

export function roundGrams(value: number): number {
  if (!Number.isFinite(value)) {
    return NaN;
  }
  return Math.round(value * 10) / 10;
}