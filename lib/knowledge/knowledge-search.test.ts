import { describe, expect, it } from "vitest";

import type { KnowledgeEntry } from "./knowledge-types";
import { searchKnowledgeEntries, tokenizeQuery } from "./knowledge-search";

const entries: KnowledgeEntry[] = [
  {
    id: "a",
    tier: 2,
    category: "science/fermentation",
    titleJa: "冷蔵発酵の考え方",
    summaryType: "practice",
    tags: ["発酵", "冷蔵"],
    keywords: ["酵母", "24時間"],
    aiUsable: true,
    body: "冷蔵発酵は風味を深めます。",
    relativePath: "content/knowledge/science/fermentation-cold.md",
  },
  {
    id: "b",
    tier: 2,
    category: "science/temperature",
    titleJa: "DDT 4要素モデル",
    summaryType: "parameter",
    tags: ["温度", "DDT"],
    keywords: ["水温", "摩擦"],
    aiUsable: true,
    body: "DDT は粉温と水温と室温と摩擦から構成されます。",
    relativePath: "content/knowledge/science/temperature-ddt.md",
  },
];

describe("knowledge-search", () => {
  it("tokenizes query", () => {
    expect(tokenizeQuery("冷蔵 発酵")).toEqual(["冷蔵", "発酵"]);
  });

  it("returns all entries when query is empty", () => {
    const results = searchKnowledgeEntries(entries, "");
    expect(results).toHaveLength(2);
  });

  it("ranks matching entries by score", () => {
    const results = searchKnowledgeEntries(entries, "冷蔵発酵");

    expect(results[0]?.entry.id).toBe("a");
    expect(results[0]?.score).toBeGreaterThan(0);
    expect(results[0]?.excerpt).toContain("冷蔵");
  });

  it("returns empty for unrelated query", () => {
    const results = searchKnowledgeEntries(entries, "存在しない語");
    expect(results).toHaveLength(0);
  });
});
