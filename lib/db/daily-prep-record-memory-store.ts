/**
 * 仕込み記録のインメモリ永続化（Next dev / D1 無し時フォールバック）。
 */

import type {
  DailyPrepRecord,
  DailyPrepRecordRevision,
} from "@/types/daily-prep-record";

export interface DailyPrepRecordMemoryStore {
  list(limit: number): DailyPrepRecord[];
  findById(id: string): DailyPrepRecord | null;
  insert(record: DailyPrepRecord): void;
  update(record: DailyPrepRecord): boolean;
  insertRevision(revision: DailyPrepRecordRevision): void;
  listRevisions(recordId: string): DailyPrepRecordRevision[];
}

export function createDailyPrepRecordMemoryStore(): DailyPrepRecordMemoryStore {
  const records = new Map<string, DailyPrepRecord>();
  const revisions = new Map<string, DailyPrepRecordRevision[]>();

  return {
    list(limit) {
      return [...records.values()]
        .sort((left, right) => {
          const dateCmp = right.prepDateJst.localeCompare(left.prepDateJst);
          if (dateCmp !== 0) {
            return dateCmp;
          }
          return right.updatedAt.localeCompare(left.updatedAt);
        })
        .slice(0, limit);
    },
    findById(id) {
      return records.get(id) ?? null;
    },
    insert(record) {
      records.set(record.id, structuredClone(record));
    },
    update(record) {
      if (!records.has(record.id)) {
        return false;
      }
      records.set(record.id, structuredClone(record));
      return true;
    },
    insertRevision(revision) {
      const list = revisions.get(revision.recordId) ?? [];
      list.push(structuredClone(revision));
      revisions.set(revision.recordId, list);
    },
    listRevisions(recordId) {
      const list = revisions.get(recordId) ?? [];
      return [...list].sort((a, b) => a.revisionNumber - b.revisionNumber);
    },
  };
}

let defaultStore: DailyPrepRecordMemoryStore | null = null;

export function getDefaultDailyPrepRecordMemoryStore(): DailyPrepRecordMemoryStore {
  if (!defaultStore) {
    defaultStore = createDailyPrepRecordMemoryStore();
  }
  return defaultStore;
}

export function resetDailyPrepRecordMemoryStoreForTests(): void {
  defaultStore = null;
}