import { describe, expect, it } from "vitest";

import type { KnowledgeEntry } from "@/lib/knowledge/knowledge-types";

import {
  extractAskKeywords,
  isAskRequestBody,
  normalizeAskQuestion,
  routeAskQuestion,
} from "./ask-router";

const entries: KnowledgeEntry[] = [
  {
    id: "fermentation-cold",
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
    id: "temperature-ddt",
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

describe("ask-router", () => {
  it("extracts keywords from question", () => {
    expect(extractAskKeywords("冷蔵 発酵 について教えて")).toContain("冷蔵");
    expect(extractAskKeywords("冷蔵 発酵 について教えて")).toContain("発酵");
  });

  it("extracts latin tokens like DDT", () => {
    expect(extractAskKeywords("DDTとは何ですか")).toContain("ddt");
  });

  it("validates request body", () => {
    expect(isAskRequestBody({ question: "test" })).toBe(true);
    expect(isAskRequestBody({ q: "test" })).toBe(false);
  });

  it("normalizes question", () => {
    expect(normalizeAskQuestion("  発酵  ")).toBe("発酵");
    expect(normalizeAskQuestion("   ")).toBeNull();
  });

  it("routes question to knowledge search results", () => {
    const route = routeAskQuestion("冷蔵発酵", entries);

    expect(route.question).toBe("冷蔵発酵");
    expect(route.results.length).toBeGreaterThan(0);
    expect(route.results[0]?.entry.id).toBe("fermentation-cold");
  });

  it("returns empty results safely for unrelated question", () => {
    const route = routeAskQuestion("存在しない専門用語xyz", entries);

    expect(route.results).toHaveLength(0);
    expect(route.keywords.length).toBeGreaterThan(0);
  });
});
