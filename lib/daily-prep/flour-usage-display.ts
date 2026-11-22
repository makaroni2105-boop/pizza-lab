/**
 * よく使う粉量の表示順（純粋関数）。
 * 頻度の再計算は「画面表示時」に行い、セッション中は beginDisplayPinSession で固定する。
 */

import {
  DAILY_PREP_DEFAULT_PIN_KG,
  DAILY_PREP_FLOUR_KG_MAX,
  DAILY_PREP_FLOUR_KG_MIN,
} from "@/types/daily-prep";

import type { FlourUsageStorageState } from "./flour-usage-storage";

const PIN_COUNT = 4;

/** 将来の手動固定ピン用（Phase C 以降）。未設定時は頻度＋初期候補で埋める。 */
export interface FlourUsageDisplayOptions {
  manualPinnedKg?: readonly number[];
}

export interface FlourDisplayPinSession {
  pins: readonly number[];
}

function isValidKg(kg: number): boolean {
  return (
    Number.isInteger(kg) &&
    kg >= DAILY_PREP_FLOUR_KG_MIN &&
    kg <= DAILY_PREP_FLOUR_KG_MAX
  );
}

/** 保存状態から使用回数を取得（不正キーは 0） */
export function getFlourUsageCount(
  state: FlourUsageStorageState,
  kg: number,
): number {
  if (!isValidKg(kg)) {
    return 0;
  }

  const raw = state.counts[String(kg)];

  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0
    ? Math.floor(raw)
    : 0;
}

/**
 * 頻度上位＋初期候補の補完で 4 種類の kg を決定する。
 * 同数は kg 昇順。履歴が空なら [5, 8, 10, 16]。
 */
export function computeDisplayPinKg(
  state: FlourUsageStorageState,
  options?: FlourUsageDisplayOptions,
): number[] {
  const manual = options?.manualPinnedKg;

  if (manual && manual.length > 0) {
    const fromManual = manual.filter(isValidKg).slice(0, PIN_COUNT);

    if (fromManual.length === PIN_COUNT) {
      return [...fromManual];
    }
  }

  const ranked: { kg: number; count: number }[] = [];

  for (let kg = DAILY_PREP_FLOUR_KG_MIN; kg <= DAILY_PREP_FLOUR_KG_MAX; kg++) {
    const count = getFlourUsageCount(state, kg);

    if (count > 0) {
      ranked.push({ kg, count });
    }
  }

  if (ranked.length === 0) {
    return [...DAILY_PREP_DEFAULT_PIN_KG];
  }

  ranked.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    return a.kg - b.kg;
  });

  const pins: number[] = [];

  for (const item of ranked) {
    if (pins.length >= PIN_COUNT) {
      break;
    }

    if (!pins.includes(item.kg)) {
      pins.push(item.kg);
    }
  }

  for (const kg of DAILY_PREP_DEFAULT_PIN_KG) {
    if (pins.length >= PIN_COUNT) {
      break;
    }

    if (!pins.includes(kg)) {
      pins.push(kg);
    }
  }

  for (let kg = DAILY_PREP_FLOUR_KG_MIN; kg <= DAILY_PREP_FLOUR_KG_MAX; kg++) {
    if (pins.length >= PIN_COUNT) {
      break;
    }

    if (!pins.includes(kg)) {
      pins.push(kg);
    }
  }

  return pins.slice(0, PIN_COUNT);
}

/** 画面マウント時に呼び、操作中はこの pins を使う（確定記録では更新しない）。 */
export function beginDisplayPinSession(
  state: FlourUsageStorageState,
  options?: FlourUsageDisplayOptions,
): FlourDisplayPinSession {
  return {
    pins: computeDisplayPinKg(state, options),
  };
}

export function getDisplayPinSessionPins(session: FlourDisplayPinSession): number[] {
  return [...session.pins];
}