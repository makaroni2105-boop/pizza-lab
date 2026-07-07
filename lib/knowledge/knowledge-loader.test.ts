import { describe, expect, it } from "vitest";

import { parseFrontmatterLines, parseKnowledgeMarkdown } from "./knowledge-loader";

const sampleMarkdown = `---
id: test-entry
tier: 2
category: science/fermentation
titleJa: テスト記事
summaryType: practice
tags: 発酵,テスト
keywords: 酵母,24時間
aiUsable: true
---

# 本文

冷蔵発酵のテスト記事です。
`;

describe("knowledge-loader", () => {
  it("parses frontmatter lines", () => {
    const meta = parseFrontmatterLines("id: abc\ntier: 2\naiUsable: false");

    expect(meta.id).toBe("abc");
    expect(meta.tier).toBe(2);
    expect(meta.aiUsable).toBe(false);
  });

  it("parses knowledge markdown", () => {
    const entry = parseKnowledgeMarkdown(sampleMarkdown, "content/knowledge/test.md");

    expect(entry?.id).toBe("test-entry");
    expect(entry?.titleJa).toBe("テスト記事");
    expect(entry?.tags).toEqual(["発酵", "テスト"]);
    expect(entry?.body).toContain("冷蔵発酵");
  });

  it("loads all knowledge entries from content directory", async () => {
    const { loadAllKnowledgeEntries } = await import("./knowledge-loader");
    const entries = loadAllKnowledgeEntries();

    expect(entries.length).toBeGreaterThanOrEqual(10);
  });
});
