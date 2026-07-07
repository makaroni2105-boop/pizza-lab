import { describe, expect, it, beforeEach } from "vitest";

import {
  createDoughJournal,
  createEmptyJournalBodySections,
  deleteDoughJournal,
  formatJournalBody,
  getDoughJournal,
  getJournalBodyPreview,
  listDoughJournals,
  listDoughJournalsByShopId,
  parseJournalBody,
  parseJournalStorageState,
  saveDoughJournal,
  LAB_STORAGE_KEYS,
} from "./journal-storage";
import type { StorageLike } from "@/lib/profile/profile-storage";

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();

  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

describe("journal-storage", () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("creates journal with formatted body sections", () => {
    const entry = createDoughJournal(
      {
        shopId: "shop-1",
        title: "  冷蔵24h 観察  ",
        entryType: "observation",
        craftsmanMood: "curious",
        sections: {
          ...createEmptyJournalBodySections(),
          observation: "コルニチョーネが高い",
          nextTry: "加水を 1% 下げる",
        },
      },
      () => new Date("2026-07-07T10:00:00.000Z").getTime(),
    );

    expect(entry.title).toBe("冷蔵24h 観察");
    expect(entry.body).toContain("## 観察");
    expect(entry.body).toContain("## 次に試すこと");
    expect(entry.craftsmanMood).toBe("curious");
    expect(entry.createdAt).toBe("2026-07-07T10:00:00.000Z");
  });

  it("formats and parses journal body sections", () => {
    const sections = {
      observation: "焼色が均一",
      hypothesis: "発酵を 2h 延ばす",
      procedure: "室温 22°C で 6h",
      result: "中心が軽くなった",
      nextTry: "酵母 0.05% 減",
    };

    const body = formatJournalBody(sections);
    expect(parseJournalBody(body)).toEqual(sections);
  });

  it("saves and lists journals newest first", () => {
    const older = createDoughJournal({ shopId: "shop-1", title: "Older" });
    const newer = createDoughJournal({ shopId: "shop-1", title: "Newer" });

    saveDoughJournal({ ...older, updatedAt: "2026-07-07T09:00:00.000Z" }, storage);
    saveDoughJournal({ ...newer, updatedAt: "2026-07-07T11:00:00.000Z" }, storage);

    const entries = listDoughJournals(storage);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.title).toBe("Newer");
  });

  it("filters journals by shop id", () => {
    saveDoughJournal(createDoughJournal({ shopId: "shop-a", title: "A" }), storage);
    saveDoughJournal(createDoughJournal({ shopId: "shop-b", title: "B" }), storage);

    expect(listDoughJournalsByShopId("shop-a", storage)).toHaveLength(1);
    expect(listDoughJournalsByShopId("shop-a", storage)[0]?.title).toBe("A");
  });

  it("updates journal and rejects invalid title", () => {
    const entry = createDoughJournal({ shopId: "shop-1", title: "Valid" });
    saveDoughJournal(entry, storage);

    const updated = {
      ...entry,
      body: formatJournalBody({
        ...createEmptyJournalBodySections(),
        result: "良好",
      }),
    };
    const result = saveDoughJournal(updated, storage);

    expect(result.ok).toBe(true);
    expect(getJournalBodyPreview(getDoughJournal(entry.id, storage)?.body ?? "")).toBe("良好");

    const invalid = { ...entry, title: "" };
    const invalidResult = saveDoughJournal(invalid, storage);
    expect(invalidResult.ok).toBe(false);
  });

  it("deletes journal", () => {
    const entry = createDoughJournal({ shopId: "shop-1", title: "Delete me" });
    saveDoughJournal(entry, storage);

    expect(deleteDoughJournal(entry.id, storage)).toBe(true);
    expect(getDoughJournal(entry.id, storage)).toBeNull();
    expect(listDoughJournals(storage)).toHaveLength(0);
  });

  it("parses invalid storage safely", () => {
    expect(parseJournalStorageState(null).entries).toEqual([]);
    expect(parseJournalStorageState("{bad").entries).toEqual([]);
    expect(
      parseJournalStorageState(JSON.stringify({ entries: [{ id: "x" }] })).entries,
    ).toEqual([]);
  });

  it("uses LAB_STORAGE_KEYS.journal", () => {
    const entry = createDoughJournal({ shopId: "shop-1", title: "Stored" });
    saveDoughJournal(entry, storage);

    const raw = storage.getItem(LAB_STORAGE_KEYS.journal);
    expect(raw).toContain("Stored");
  });
});
