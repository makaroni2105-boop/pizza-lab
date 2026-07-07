import { describe, expect, it } from "vitest";

import type { KnowledgeEntry } from "@/lib/knowledge/knowledge-types";
import { buildResearchContext } from "@/lib/ai/research-context";

import {
  handleAskLlmRequest,
  isResearchContext,
  resolveAskResearchContext,
} from "./ask-llm-handler";
import { routeAskQuestion } from "./ask-router";

const SYNTHESIZED_AT = "2026-07-07T10:00:00.000Z";

const entries: KnowledgeEntry[] = [
  {
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
];

describe("ask-llm-handler", () => {
  it("handleAskLlmRequest returns llm_rag with mock provider", async () => {
    const route = routeAskQuestion("DDT", entries);
    const result = await handleAskLlmRequest(
      { question: "DDT とは", useLlm: true, shopId: "shop-a" },
      "DDT とは",
      route,
      { entries, synthesizedAt: SYNTHESIZED_AT },
    );

    expect(result.status).toBe(200);
    if (result.body.success && result.body.mode === "llm_rag") {
      expect(result.body.aiUsed).toBe(true);
      expect(result.body.provider).toBe("mock");
      expect(result.body.model).toContain("mock");
      expect(result.body.answer.length).toBeGreaterThan(0);
    }
  });

  it("resolveAskResearchContext uses default shop when omitted", () => {
    const route = routeAskQuestion("DDT", entries);
    const context = resolveAskResearchContext(
      "DDT",
      { question: "DDT" },
      route,
      SYNTHESIZED_AT,
    );

    expect(context.shopId).toBe("default-shop");
  });

  it("isResearchContext validates meta and researchMemory", () => {
    const context = buildResearchContext({
      shopId: "shop-a",
      question: "test",
      synthesizedAt: SYNTHESIZED_AT,
    });

    expect(isResearchContext(context)).toBe(true);
  });
});
