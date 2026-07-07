/**
 * LearningRun の localStorage 永続化（Phase 2b）。
 * 純粋関数による集計は lib/learning/learning-summary.ts に委譲。
 */

import type { LearningSummary, ShopProfile } from "@/types/profile";

import type { StorageLike } from "@/lib/profile/profile-storage";
import { getBrowserStorage, getProfile, saveProfile } from "@/lib/profile/profile-storage";

import { filterRunsByShopId } from "./learning-run";
import {
  buildLearningSummariesByMixer,
  toProfileLearningSummary,
} from "./learning-summary";
import type { LearningRun } from "./learning-types";

export const LEARNING_STORAGE_KEY = "pizzalab-learning-runs-v1";

export interface LearningStorageState {
  runs: LearningRun[];
}

const EMPTY_STATE: LearningStorageState = {
  runs: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLearningRun(value: unknown): value is LearningRun {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.shopId === "string" &&
    typeof value.mixerKey === "string" &&
    typeof value.recordedAt === "string" &&
    isRecord(value.snapshot) &&
    typeof value.predictedFrictionC === "number" &&
    typeof value.predictedDoughTempC === "number" &&
    typeof value.actualDoughTempC === "number"
  );
}

export function parseLearningStorageState(raw: string | null): LearningStorageState {
  if (!raw) {
    return { ...EMPTY_STATE };
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed) || !Array.isArray(parsed.runs)) {
      return { ...EMPTY_STATE };
    }

    return {
      runs: parsed.runs.filter(isLearningRun),
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function serializeLearningStorageState(state: LearningStorageState): string {
  return JSON.stringify(state);
}

function readState(storage: StorageLike): LearningStorageState {
  return parseLearningStorageState(storage.getItem(LEARNING_STORAGE_KEY));
}

function writeState(storage: StorageLike, state: LearningStorageState): void {
  storage.setItem(LEARNING_STORAGE_KEY, serializeLearningStorageState(state));
}

export function listLearningRuns(storage?: StorageLike): LearningRun[] {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return [];
  }

  return readState(store).runs;
}

export function listLearningRunsByShopId(
  shopId: string,
  storage?: StorageLike,
): LearningRun[] {
  return filterRunsByShopId(listLearningRuns(storage), shopId);
}

export function getLearningRun(id: string, storage?: StorageLike): LearningRun | null {
  return listLearningRuns(storage).find((run) => run.id === id) ?? null;
}

export function saveLearningRun(run: LearningRun, storage?: StorageLike): LearningRun {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return run;
  }

  const state = readState(store);
  const index = state.runs.findIndex((item) => item.id === run.id);
  const runs =
    index >= 0
      ? state.runs.map((item, itemIndex) => (itemIndex === index ? run : item))
      : [...state.runs, run];

  writeState(store, { runs });
  return run;
}

export function deleteLearningRun(id: string, storage?: StorageLike): boolean {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return false;
  }

  const state = readState(store);
  const runs = state.runs.filter((run) => run.id !== id);

  if (runs.length === state.runs.length) {
    return false;
  }

  writeState(store, { runs });
  return true;
}

/** Run 履歴から profile.learning（LearningSummary[]）を再計算 */
export function buildProfileLearningFromRuns(
  shopId: string,
  runs: LearningRun[],
): LearningSummary[] {
  const shopRuns = filterRunsByShopId(runs, shopId);

  return buildLearningSummariesByMixer(shopRuns).map(toProfileLearningSummary);
}

/** 既存 learning と新サマリーを mixerKey でマージ */
export function mergeLearningSummaries(
  existing: LearningSummary[] | undefined,
  next: LearningSummary[],
): LearningSummary[] {
  const map = new Map((existing ?? []).map((entry) => [entry.mixerKey, entry]));

  for (const entry of next) {
    map.set(entry.mixerKey, entry);
  }

  return [...map.values()];
}

/** 保存済み Run から profile.learning を更新したコピーを返す */
export function applyStoredLearningToProfile(
  profile: ShopProfile,
  storage?: StorageLike,
): ShopProfile {
  const runs = listLearningRunsByShopId(profile.id, storage);
  const learning = buildProfileLearningFromRuns(profile.id, runs);

  return {
    ...profile,
    learning: mergeLearningSummaries(profile.learning, learning),
  };
}

/** Run 保存後、localStorage 上の ShopProfile に learning を反映（存在する場合のみ） */
export function persistProfileLearningFromRuns(
  shopId: string,
  storage?: StorageLike,
): ShopProfile | null {
  const profile = getProfile(shopId, storage);

  if (!profile) {
    return null;
  }

  const updated = applyStoredLearningToProfile(profile, storage);
  return saveProfile(updated, storage);
}

/** Run 保存 + profile.learning 反映を一括実行 */
export function recordLearningRun(
  run: LearningRun,
  storage?: StorageLike,
): { run: LearningRun; profile: ShopProfile | null } {
  const savedRun = saveLearningRun(run, storage);
  const profile = persistProfileLearningFromRuns(run.shopId, storage);

  return { run: savedRun, profile };
}
