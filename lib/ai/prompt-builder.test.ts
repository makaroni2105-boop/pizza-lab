import { describe, expect, it } from "vitest";

import type { KnowledgeSearchResult } from "@/lib/knowledge/knowledge-types";
import type { ShopProfile } from "@/types/profile";
import type { DieOutput } from "@/types/die";
import { buildResearchContext } from "./research-context";
import {
  RESEARCH_PARTNER_SYSTEM_PROMPT,
  buildAskPrompt,
} from "./prompt-builder";

const SYNTHESIZED_AT = "2026-07-07T10:00:00.000Z";

const profile: ShopProfile = {
  id: "shop-a",
  name: "Test Pizzeria",
  flour: { primaryFlourId: "caputo-pizzeria" },
  mixer: { type: "spiral" },
  method: { method: "napoli", ballWeightG: 250 },
  ddt: { defaultDdt: 24 },
  presets: [],
};

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

describe("buildAskPrompt", () => {
  it("includes research partner system instructions", () => {
    const context = buildResearchContext({
      shopId: "shop-a",
      question: "なぜ水温が低い？",
      synthesizedAt: SYNTHESIZED_AT,
      profile,
      knowledgeEntries: [knowledgeResult],
    });

    const prompt = buildAskPrompt(context);

    expect(prompt.system).toBe(RESEARCH_PARTNER_SYSTEM_PROMPT);
    expect(prompt.system).toContain("research partner");
    expect(prompt.system).toContain("Never override or recalculate DIE");
    expect(prompt.system).toContain("Never rank flours");
    expect(prompt.system).toContain("STG, VPN, and APN");
    expect(prompt.system).toContain("一緒に検証");
  });

  it("embeds question and context JSON in user prompt", () => {
    const context = buildResearchContext({
      shopId: "shop-a",
      question: "テスト質問",
      synthesizedAt: SYNTHESIZED_AT,
    });

    const prompt = buildAskPrompt(context);

    expect(prompt.user).toContain("Question: テスト質問");
    expect(prompt.user).toContain("reference-only");
    expect(prompt.contextSummary).toContain('"shopId": "shop-a"');
    expect(prompt.contextSummary).toContain('"question": "テスト質問"');
  });

  it("marks die output as reference-only in summary", () => {
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

    const context = buildResearchContext({
      shopId: "shop-a",
      question: "DIE について",
      synthesizedAt: SYNTHESIZED_AT,
      dieOutput,
    });

    const prompt = buildAskPrompt(context);

    expect(prompt.contextSummary).toContain('"dieOutputReferenceOnly": true');
  });
});
