import { describe, expect, it, beforeEach } from "vitest";

import {
  applySideDraftToComparisonSide,
  buildComparisonDimensions,
  comparisonSideDraftFromSide,
  createComparisonRun,
  deleteComparisonRun,
  getComparisonObservation,
  getComparisonRun,
  getSideMemo,
  getUserComparisonDimensions,
  listComparisonRuns,
  listComparisonRunsByShopId,
  parseComparisonStorageState,
  saveComparisonRun,
  LAB_STORAGE_KEYS,
} from "./comparison-storage";
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

describe("comparison-storage", () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("creates comparison run with default sides", () => {
    const run = createComparisonRun(
      {
        shopId: "shop-1",
        title: "  65% vs 62%  ",
        hypothesis: "  中心の軽さが違う ",
      },
      () => new Date("2026-07-07T10:00:00.000Z").getTime(),
    );

    expect(run.title).toBe("65% vs 62%");
    expect(run.status).toBe("draft");
    expect(run.sideA.label).toBe("Side A");
    expect(run.hypothesis).toBe("中心の軽さが違う");
    expect(run.createdAt).toBe("2026-07-07T10:00:00.000Z");
  });

  it("saves and lists comparisons newest first", () => {
    const older = createComparisonRun({ shopId: "shop-1", title: "Older" });
    const newer = createComparisonRun({ shopId: "shop-1", title: "Newer" });

    saveComparisonRun({ ...older, updatedAt: "2026-07-07T09:00:00.000Z" }, storage);
    saveComparisonRun({ ...newer, updatedAt: "2026-07-07T11:00:00.000Z" }, storage);

    const runs = listComparisonRuns(storage);
    expect(runs).toHaveLength(2);
    expect(runs[0]?.title).toBe("Newer");
  });

  it("filters comparisons by shop id", () => {
    saveComparisonRun(createComparisonRun({ shopId: "shop-a", title: "A" }), storage);
    saveComparisonRun(createComparisonRun({ shopId: "shop-b", title: "B" }), storage);

    expect(listComparisonRunsByShopId("shop-a", storage)).toHaveLength(1);
    expect(listComparisonRunsByShopId("shop-a", storage)[0]?.title).toBe("A");
  });

  it("builds dimensions with side memos and observation", () => {
    const dimensions = buildComparisonDimensions({
      userDimensions: [
        { key: "custom-1", label: "加水率", valueA: "65%", valueB: "62%" },
      ],
      sideAMemo: "大会用",
      sideBMemo: "営業用",
      observation: "Side A の方が中心が軽い",
    });

    expect(getUserComparisonDimensions(dimensions)).toHaveLength(1);
    expect(getSideMemo(dimensions, "A")).toBe("大会用");
    expect(getSideMemo(dimensions, "B")).toBe("営業用");
    expect(getComparisonObservation(dimensions)).toBe("Side A の方が中心が軽い");
  });

  it("maps side drafts to comparison sides", () => {
    const sessionSide = applySideDraftToComparisonSide({
      label: "昨日",
      memo: "",
      refId: "lab-abc",
      refType: "session",
    });

    expect(sessionSide.labSessionId).toBe("lab-abc");
    expect(comparisonSideDraftFromSide(sessionSide).refType).toBe("session");
  });

  it("rejects invalid comparison run", () => {
    const run = createComparisonRun({ shopId: "shop-1", title: "Valid" });
    saveComparisonRun(run, storage);

    const invalid = { ...run, title: "" };
    const result = saveComparisonRun(invalid, storage);
    expect(result.ok).toBe(false);
  });

  it("deletes comparison run", () => {
    const run = createComparisonRun({ shopId: "shop-1", title: "Delete me" });
    saveComparisonRun(run, storage);

    expect(deleteComparisonRun(run.id, storage)).toBe(true);
    expect(getComparisonRun(run.id, storage)).toBeNull();
    expect(listComparisonRuns(storage)).toHaveLength(0);
  });

  it("parses invalid storage safely", () => {
    expect(parseComparisonStorageState(null).runs).toEqual([]);
    expect(parseComparisonStorageState("{bad").runs).toEqual([]);
    expect(parseComparisonStorageState(JSON.stringify({ runs: [{ id: "x" }] })).runs).toEqual([]);
  });

  it("uses LAB_STORAGE_KEYS.comparisons", () => {
    const run = createComparisonRun({ shopId: "shop-1", title: "Stored" });
    saveComparisonRun(run, storage);

    const raw = storage.getItem(LAB_STORAGE_KEYS.comparisons);
    expect(raw).toContain("Stored");
  });
});
