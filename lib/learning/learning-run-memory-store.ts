/**
 * サーバー側インメモリ LearningRun ストア（API fallback 用）。
 * ブラウザ localStorage（learning-storage.ts）とは独立。
 */

import type { LearningRun } from "./learning-types";

export class LearningRunMemoryStore {
  private runs = new Map<string, LearningRun>();

  listByShopId(shopId: string): LearningRun[] {
    return Array.from(this.runs.values())
      .filter((run) => run.shopId === shopId)
      .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
  }

  get(id: string): LearningRun | null {
    return this.runs.get(id) ?? null;
  }

  upsert(run: LearningRun): LearningRun {
    this.runs.set(run.id, run);
    return run;
  }

  delete(id: string): boolean {
    return this.runs.delete(id);
  }

  clear(): void {
    this.runs.clear();
  }
}

let defaultStore: LearningRunMemoryStore | null = null;

export function getDefaultLearningRunMemoryStore(): LearningRunMemoryStore {
  if (!defaultStore) {
    defaultStore = new LearningRunMemoryStore();
  }

  return defaultStore;
}

export function resetDefaultLearningRunMemoryStore(): void {
  defaultStore = null;
}
