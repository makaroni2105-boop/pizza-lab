import { describe, expect, it } from "vitest";

import { createLearningRun } from "@/lib/learning/learning-run";
import type { KnowledgeSearchResult } from "@/lib/knowledge/knowledge-types";
import type { ShopProfile } from "@/types/profile";
import type { DieOutput } from "@/types/die";
import { buildResearchContext } from "./research-context";
import {
  MockLLMAdapter,
  createMockLLMAdapter,
  generateMockLlmAnswer,
} from "./llm-mock";
import { buildAskPrompt } from "./prompt-builder";
import { MOCK_LLM_MODEL } from "./llm-adapter";
import { runAskLlmPipeline } from "./ask-llm";

const SYNTHESIZED_AT = "2026-07-07T10:00:00.000Z";

const profile: ShopProfile = {
  id: "shop-a",
  name: "Napoli Lab",
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
  excerpt: "Desired Dough Temperature",
};

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
    frictionSource: "learning",
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

function makeContext() {
  return buildResearchContext({
    shopId: "shop-a",
    question: "なぜ水温が低い？",
    synthesizedAt: SYNTHESIZED_AT,
    profile,
    knowledgeEntries: [knowledgeResult],
    dieOutput,
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

describe("MockLLMAdapter", () => {
  it("uses mock provider and model without external fetch", async () => {
    const adapter = createMockLLMAdapter();
    const context = makeContext();
    const prompt = buildAskPrompt(context);

    expect(adapter.provider).toBe("mock");
    expect(adapter.model).toBe(MOCK_LLM_MODEL);

    const result = await adapter.complete({ prompt, context });

    expect(result.provider).toBe("mock");
    expect(result.finishReason).toBe("stop");
    expect(result.text).toContain("一緒に検証");
    expect(result.text).toContain("参照のみ");
    expect(result.text).not.toContain("正解は");
  });

  it("references DIE values as read-only", () => {
    const answer = generateMockLlmAnswer(makeContext());

    expect(answer).toContain("65%");
    expect(answer).toContain("参照のみ");
    expect(answer).toContain("DIE Core");
  });

  it("respects research partner tone about methods and flour", () => {
    const answer = generateMockLlmAnswer(makeContext());

    expect(answer).toContain("限定しません");
    expect(answer).toMatch(/優劣ではなく/);
  });

  it("runAskLlmPipeline returns aiUsed true with sources", async () => {
    const result = await runAskLlmPipeline(makeContext());

    expect(result.aiUsed).toBe(true);
    expect(result.mode).toBe("llm_rag");
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("MockLLMAdapter class implements LLMAdapter", () => {
    const adapter = new MockLLMAdapter();
    expect(adapter.provider).toBe("mock");
  });
});
