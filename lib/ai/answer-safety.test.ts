import { describe, expect, it } from "vitest";

import { createLearningRun } from "@/lib/learning/learning-run";
import type { KnowledgeSearchResult } from "@/lib/knowledge/knowledge-types";
import { buildResearchContext } from "./research-context";
import {
  applyAnswerSafetyRules,
  extractSourcesFromContext,
  FORBIDDEN_ANSWER_PHRASES,
} from "./answer-safety";

const SYNTHESIZED_AT = "2026-07-07T10:00:00.000Z";

const knowledgeResult: KnowledgeSearchResult = {
  entry: {
    id: "k-1",
    tier: 2,
    category: "science",
    titleJa: "DDT の基礎",
    summaryType: "summary",
    tags: [],
    keywords: ["ddt"],
    aiUsable: true,
    body: "body",
    relativePath: "content/knowledge/science/ddt.md",
  },
  score: 10,
  excerpt: "DDT 説明",
};

function makeContext() {
  return buildResearchContext({
    shopId: "shop-a",
    question: "なぜ水温が低い？",
    synthesizedAt: SYNTHESIZED_AT,
    knowledgeEntries: [knowledgeResult],
    learningRuns: [
      createLearningRun({
        id: "run-1",
        shopId: "shop-a",
        mixerKey: "spiral:a",
        recordedAt: SYNTHESIZED_AT,
        snapshot: { flourTempC: 18, waterTempC: 12, roomTempC: 24 },
        predictedFrictionC: 4,
        predictedDoughTempC: 24,
        actualDoughTempC: 25,
      }),
    ],
  });
}

describe("extractSourcesFromContext", () => {
  it("extracts knowledge and run citations", () => {
    const context = makeContext();
    const sources = extractSourcesFromContext(context);

    expect(sources.some((source) => source.type === "knowledge" && source.id === "k-1")).toBe(
      true,
    );
    expect(sources.some((source) => source.type === "run" && source.id === "run-1")).toBe(true);
    expect(sources.find((source) => source.type === "knowledge")?.href).toBe("/knowledge");
  });
});

describe("applyAnswerSafetyRules", () => {
  it("sets aiUsed true and llm_rag mode", () => {
    const context = makeContext();
    const result = applyAnswerSafetyRules({
      answer: "一緒に検証していきましょう。",
      context,
    });

    expect(result.aiUsed).toBe(true);
    expect(result.mode).toBe("llm_rag");
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it("flags forbidden phrases", () => {
    const context = makeContext();
    const result = applyAnswerSafetyRules({
      answer: "正解は加水率 70% です。必ずこの値にしてください。",
      context,
    });

    expect(result.warnings.some((warning) => warning.code === "forbidden_phrase")).toBe(true);
    expect(result.disclaimers.some((item) => item.includes("禁止フレーズ"))).toBe(true);
    expect(result.answer).toContain("安全チェック");
  });

  it("adds disclaimer when learning is incomplete", () => {
    const context = makeContext();
    const result = applyAnswerSafetyRules({
      answer: "記録を見ると傾向が出始めています。",
      context,
    });

    expect(result.disclaimers.some((item) => item.includes("Run が"))).toBe(true);
  });

  it("documents all forbidden phrase constants", () => {
    expect(FORBIDDEN_ANSWER_PHRASES.length).toBeGreaterThan(0);
    expect(FORBIDDEN_ANSWER_PHRASES).toContain("正解は");
    expect(FORBIDDEN_ANSWER_PHRASES).toContain("最良の粉");
  });
});
