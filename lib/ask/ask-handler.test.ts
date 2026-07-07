import { describe, expect, it } from "vitest";

import type { KnowledgeEntry } from "@/lib/knowledge/knowledge-types";
import type { DieOutput } from "@/types/die";
import { buildResearchContext } from "@/lib/ai/research-context";

import { handleAskRequest, processAskQuestion } from "./index";
import { routeAskQuestion } from "./ask-router";
import { buildAskGuide, buildAskSuccessResponse } from "./ask-response";
import {
  isResearchContext,
  resolveAskResearchContext,
} from "./ask-llm-handler";

const SYNTHESIZED_AT = "2026-07-07T10:00:00.000Z";

const entries: KnowledgeEntry[] = [
  {
    id: "a",
    tier: 2,
    category: "science/fermentation",
    titleJa: "冷蔵発酵の考え方",
    summaryType: "practice",
    tags: ["発酵"],
    keywords: ["冷蔵"],
    aiUsable: true,
    body: "冷蔵発酵は風味を深めます。",
    relativePath: "content/knowledge/science/fermentation-cold.md",
  },
];

describe("ask-response", () => {
  it("builds collaborative guide when results exist", () => {
    const route = routeAskQuestion("冷蔵発酵", entries);
    const guide = buildAskGuide(route);

    expect(guide).toContain("一緒に検証");
    expect(guide).not.toContain("正解は");
  });

  it("builds safe guide when no results", () => {
    const route = routeAskQuestion("存在しない語", entries);
    const guide = buildAskGuide(route);

    expect(guide).toContain("見つかりませんでした");
    expect(guide).toContain("一緒に");
  });

  it("marks aiUsed false in success response", () => {
    const route = routeAskQuestion("冷蔵", entries);
    const response = buildAskSuccessResponse(route);

    expect(response.success).toBe(true);
    expect(response.aiUsed).toBe(false);
    expect(response.mode).toBe("knowledge_search");
    expect(response.candidates[0]?.titleJa).toContain("冷蔵");
  });
});

describe("handleAskRequest", () => {
  it("returns 400 for invalid body", async () => {
    const result = await handleAskRequest({}, { entries });

    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
  });

  it("returns 400 for invalid useLlm type", async () => {
    const result = await handleAskRequest(
      { question: "test", useLlm: "yes" },
      { entries },
    );

    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
  });

  it("returns 400 for empty question", async () => {
    const result = await handleAskRequest({ question: "   " }, { entries });

    expect(result.status).toBe(400);
    if (!result.body.success) {
      expect(result.body.error.code).toBe("INVALID_QUESTION");
    }
  });

  it("returns knowledge candidates without AI when useLlm omitted", async () => {
    const result = await handleAskRequest({ question: "冷蔵発酵" }, { entries });

    expect(result.status).toBe(200);
    if (result.body.success && result.body.mode === "knowledge_search") {
      expect(result.body.aiUsed).toBe(false);
      expect(result.body.candidates.length).toBeGreaterThan(0);
      expect(result.body.guide).toContain("検証");
    }
  });

  it("returns knowledge_search when useLlm is false", async () => {
    const result = await handleAskRequest(
      { question: "冷蔵発酵", useLlm: false },
      { entries },
    );

    expect(result.status).toBe(200);
    if (result.body.success) {
      expect(result.body.mode).toBe("knowledge_search");
      expect(result.body.aiUsed).toBe(false);
    }
  });

  it("returns mock llm_rag when useLlm is true", async () => {
    const result = await handleAskRequest(
      { question: "冷蔵発酵", useLlm: true, shopId: "shop-a" },
      { entries, synthesizedAt: SYNTHESIZED_AT },
    );

    expect(result.status).toBe(200);
    if (result.body.success && result.body.mode === "llm_rag") {
      expect(result.body.aiUsed).toBe(true);
      expect(result.body.answer).toContain("一緒に検証");
      expect(result.body.provider).toBe("mock");
      expect(result.body.sources.length).toBeGreaterThan(0);
      expect(Array.isArray(result.body.disclaimers)).toBe(true);
      expect(Array.isArray(result.body.warnings)).toBe(true);
    } else {
      throw new Error("expected llm_rag response");
    }
  });

  it("uses provided ResearchContext when body.context is complete", async () => {
    const minimalContext = buildResearchContext({
      shopId: "shop-custom",
      question: "placeholder",
      synthesizedAt: SYNTHESIZED_AT,
      knowledgeEntries: [],
    });

    const result = await handleAskRequest(
      {
        question: "実際の質問",
        useLlm: true,
        context: minimalContext,
      },
      { entries, synthesizedAt: SYNTHESIZED_AT },
    );

    expect(result.status).toBe(200);
    if (result.body.success && result.body.mode === "llm_rag") {
      expect(result.body.question).toBe("実際の質問");
    }
  });

  it("processAskQuestion returns error for empty input", () => {
    const response = processAskQuestion("", entries);

    expect(response.success).toBe(false);
  });
});

describe("resolveAskResearchContext", () => {
  it("builds minimal context from knowledge search when context omitted", () => {
    const route = routeAskQuestion("冷蔵", entries);
    const context = resolveAskResearchContext(
      "冷蔵",
      { question: "冷蔵", shopId: "shop-a" },
      route,
      SYNTHESIZED_AT,
    );

    expect(context.shopId).toBe("shop-a");
    expect(context.question).toBe("冷蔵");
    expect(context.knowledge.length).toBeGreaterThan(0);
  });

  it("detects full ResearchContext", () => {
    const context = buildResearchContext({
      shopId: "shop-a",
      question: "test",
      synthesizedAt: SYNTHESIZED_AT,
    });

    expect(isResearchContext(context)).toBe(true);
    expect(isResearchContext({ shopId: "x" })).toBe(false);
  });

  it("passes dieOutput as referenceOnly in built context", () => {
    const dieOutput: DieOutput = {
      recipe: {
        flourG: 1000,
        waterG: 650,
        saltG: 25,
        yeastG: 3,
        totalDoughWeightG: 1678,
        hydrationPct: 65,
        saltPct: 2.5,
        yeastPct: 0.3,
      },
      temperature: {
        recommendedWaterTempC: 12,
        useIce: false,
        predictedDoughTempC: 24,
        targetDdtC: 24,
        ddtDeltaC: 0,
        frictionRiseC: 4,
      },
      yeastAdjustment: { adjustmentPct: 0, adjustedYeastPct: 0.3, reason: "none" },
      fermentationSchedule: {
        fermentationType: "cold",
        baseHours: 24,
        adjustedHours: 24,
        mixStartTime: "2026-07-07T08:00:00.000Z",
        useTime: "2026-07-08T08:00:00.000Z",
      },
      confidence: {
        level: "medium",
        estimatedFieldCount: 0,
        learningRunCount: 1,
      },
    };

    const route = routeAskQuestion("DDT", entries);
    const context = resolveAskResearchContext(
      "DDT",
      {
        question: "DDT",
        shopId: "shop-a",
        context: { shopId: "shop-a", question: "DDT", dieOutput },
      },
      route,
      SYNTHESIZED_AT,
    );

    expect(context.dieOutput?.referenceOnly).toBe(true);
    expect(context.dieOutput?.hydrationPct).toBe(65);
  });
});
