import { describe, expect, it } from "vitest";

import { createLearningRun } from "@/lib/learning/learning-run";
import type { KnowledgeSearchResult } from "@/lib/knowledge/knowledge-types";
import type { ShopProfile } from "@/types/profile";
import type { DieOutput } from "@/types/die";
import type { DoughDNA, DoughJournal } from "@/types/lab";
import {
  buildResearchContext,
  mapDieOutputToContextSlice,
} from "./research-context";

const SYNTHESIZED_AT = "2026-07-07T10:00:00.000Z";

const profile: ShopProfile = {
  id: "shop-a",
  name: "Test Pizzeria",
  flour: { primaryFlourId: "caputo-pizzeria" },
  mixer: { type: "spiral", modelId: "model-a" },
  method: { method: "napoli", ballWeightG: 250 },
  ddt: { defaultDdt: 24 },
  presets: [
    {
      id: "preset-1",
      name: "Business",
      type: "business",
      method: { method: "napoli", ballWeightG: 250 },
      targetDdt: 24,
      ballWeightG: 250,
      isDefault: true,
    },
  ],
  defaultPresetId: "preset-1",
  learning: [
    {
      mixerKey: "spiral:model-a",
      runCount: 2,
      learnedFrictionOffset: 0.5,
      isLearningComplete: false,
      lastUpdatedAt: SYNTHESIZED_AT,
    },
  ],
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
    body: "Desired Dough Temperature",
    relativePath: "content/knowledge/science/ddt.md",
  },
  score: 10,
  excerpt: "Desired Dough Temperature の説明",
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
  yeastAdjustment: {
    adjustmentPct: 0,
    adjustedYeastPct: 0.3,
    reason: "none",
  },
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
    learningRunCount: 2,
    isLearningComplete: false,
  },
  calculatedAt: SYNTHESIZED_AT,
};

describe("mapDieOutputToContextSlice", () => {
  it("copies DIE values without recalculation", () => {
    const slice = mapDieOutputToContextSlice(dieOutput);

    expect(slice.referenceOnly).toBe(true);
    expect(slice.hydrationPct).toBe(65);
    expect(slice.recommendedWaterTempC).toBe(12);
    expect(slice.predictedDoughTempC).toBe(24);
    expect(slice.frictionSource).toBe("learning");
  });
});

describe("buildResearchContext", () => {
  it("assembles all context blocks for a shop", () => {
    const journal: DoughJournal = {
      id: "journal-1",
      shopId: "shop-a",
      title: "7/7",
      body: "## 観察\n良好",
      entryType: "observation",
      createdAt: SYNTHESIZED_AT,
      updatedAt: SYNTHESIZED_AT,
    };

    const dna: DoughDNA = {
      id: "dna-1",
      shopId: "shop-a",
      name: "うちの100点",
      presetType: "research",
      scores: { lightness: 80 },
      createdAt: SYNTHESIZED_AT,
      updatedAt: SYNTHESIZED_AT,
    };

    const run = createLearningRun({
      id: "run-1",
      shopId: "shop-a",
      mixerKey: "spiral:model-a",
      recordedAt: SYNTHESIZED_AT,
      snapshot: { flourTempC: 18, waterTempC: 12, roomTempC: 24 },
      predictedFrictionC: 4,
      predictedDoughTempC: 24,
      actualDoughTempC: 25,
    });

    const context = buildResearchContext({
      shopId: "shop-a",
      question: "  なぜ水温が低い？ ",
      synthesizedAt: SYNTHESIZED_AT,
      knowledgeEntries: [knowledgeResult],
      profile,
      learningRuns: [run],
      weather: { ambientTempC: 28, ambientHumidityPct: 70 },
      journals: [journal],
      doughDnas: [dna],
      dieOutput,
    });

    expect(context.question).toBe("なぜ水温が低い？");
    expect(context.knowledge).toHaveLength(1);
    expect(context.knowledge[0]?.titleJa).toBe("DDT の基礎");
    expect(context.learning).toHaveLength(1);
    expect(context.weather?.ambientTempC).toBe(28);
    expect(context.runHistory).toHaveLength(1);
    expect(context.runHistory[0]?.tempDeltaC).toBe(1);
    expect(context.doughDna).toHaveLength(1);
    expect(context.journal).toHaveLength(1);
    expect(context.profile?.shopName).toBe("Test Pizzeria");
    expect(context.dieOutput?.referenceOnly).toBe(true);
    expect(context.researchMemory.shopId).toBe("shop-a");
    expect(context.meta.synthesizedAt).toBe(SYNTHESIZED_AT);
    expect(context.meta.totalRunCount).toBe(1);
    expect(context.meta.isLearningComplete).toBe(false);
  });

  it("marks missing sources when data is absent", () => {
    const context = buildResearchContext({
      shopId: "shop-a",
      question: "テスト",
      synthesizedAt: SYNTHESIZED_AT,
    });

    expect(context.meta.missingSources).toContain("knowledge");
    expect(context.meta.missingSources).toContain("profile");
    expect(context.meta.missingSources).toContain("die_output");
    expect(context.meta.missingSources).toContain("run_history");
  });

  it("filters other shop entities out of context", () => {
    const context = buildResearchContext({
      shopId: "shop-a",
      question: "テスト",
      synthesizedAt: SYNTHESIZED_AT,
      learningRuns: [
        createLearningRun({
          id: "run-other",
          shopId: "shop-b",
          mixerKey: "hand:unknown",
          recordedAt: SYNTHESIZED_AT,
          snapshot: { flourTempC: 18, waterTempC: 12, roomTempC: 24 },
          predictedFrictionC: 2,
          predictedDoughTempC: 24,
          actualDoughTempC: 24,
        }),
      ],
    });

    expect(context.runHistory).toHaveLength(0);
    expect(context.meta.totalRunCount).toBe(0);
  });

  it("reports truncated sources when entity count exceeds limit", () => {
    const runs = Array.from({ length: 7 }, (_, index) =>
      createLearningRun({
        id: `run-${index}`,
        shopId: "shop-a",
        mixerKey: "spiral:model-a",
        recordedAt: `2026-07-0${index + 1}T10:00:00.000Z`,
        snapshot: { flourTempC: 18, waterTempC: 12, roomTempC: 24 },
        predictedFrictionC: 4,
        predictedDoughTempC: 24,
        actualDoughTempC: 24,
      }),
    );

    const context = buildResearchContext({
      shopId: "shop-a",
      question: "テスト",
      synthesizedAt: SYNTHESIZED_AT,
      learningRuns: runs,
      limits: { runHistory: 3 },
    });

    expect(context.runHistory).toHaveLength(3);
    expect(context.meta.truncatedSources).toContain("run_history");
  });
});
