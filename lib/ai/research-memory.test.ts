import { describe, expect, it } from "vitest";

import { createLearningRun } from "@/lib/learning/learning-run";
import { LEARNING_MIN_RUN_COUNT } from "@/lib/learning/learning-types";
import type {
  ComparisonRun,
  DoughDNA,
  DoughJournal,
  FlourBlend,
  LabSession,
} from "@/types/lab";
import { synthesizeResearchMemory } from "./research-memory";

const SYNTHESIZED_AT = "2026-07-07T10:00:00.000Z";

function makeRun(
  id: string,
  overrides: Partial<Parameters<typeof createLearningRun>[0]> = {},
) {
  return createLearningRun({
    id,
    shopId: "shop-a",
    mixerKey: "spiral:model-a",
    recordedAt: "2026-07-07T09:00:00.000Z",
    snapshot: { flourTempC: 18, waterTempC: 12, roomTempC: 24 },
    predictedFrictionC: 4,
    predictedDoughTempC: 24,
    actualDoughTempC: 25.5,
    craftsmanScore: 4,
    memo: "氷を少し減らした",
    ...overrides,
  });
}

function makeJournal(overrides: Partial<DoughJournal> = {}): DoughJournal {
  return {
    id: "journal-1",
    shopId: "shop-a",
    title: "7/7 試作",
    body: [
      "## 仮説",
      "冷蔵24hで軽さが出る",
      "## 手順",
      "DDT 24°C で仕込み",
      "## 結果",
      "コルニチョーネは良好",
      "## 次に試すこと",
      "発酵時間を2h延ばす",
    ].join("\n"),
    entryType: "observation",
    createdAt: SYNTHESIZED_AT,
    updatedAt: SYNTHESIZED_AT,
    ...overrides,
  };
}

describe("synthesizeResearchMemory", () => {
  it("returns empty categories when no shop data", () => {
    const memory = synthesizeResearchMemory({
      shopId: "shop-a",
      synthesizedAt: SYNTHESIZED_AT,
    });

    expect(memory.shopId).toBe("shop-a");
    expect(memory.hypotheses).toEqual([]);
    expect(memory.experiments).toEqual([]);
    expect(memory.results).toEqual([]);
    expect(memory.openQuestions).toEqual([]);
    expect(memory.nextSteps).toEqual([]);
  });

  it("maps journal sections into memory categories", () => {
    const memory = synthesizeResearchMemory({
      shopId: "shop-a",
      synthesizedAt: SYNTHESIZED_AT,
      journals: [makeJournal()],
    });

    expect(memory.hypotheses.some((item) => item.excerpt.includes("冷蔵24h"))).toBe(true);
    expect(memory.experiments.some((item) => item.excerpt.includes("DDT"))).toBe(true);
    expect(memory.results.some((item) => item.excerpt.includes("コルニチョーネ"))).toBe(true);
    expect(memory.nextSteps.some((item) => item.excerpt.includes("発酵時間"))).toBe(true);
    expect(memory.hypotheses[0]?.confidence).toBe("hypothesis");
    expect(memory.results[0]?.confidence).toBe("fact");
  });

  it("adds open question when learning runs are below threshold", () => {
    const memory = synthesizeResearchMemory({
      shopId: "shop-a",
      synthesizedAt: SYNTHESIZED_AT,
      learningRuns: [makeRun("run-1")],
    });

    expect(memory.openQuestions.some((item) =>
      item.excerpt.includes(String(LEARNING_MIN_RUN_COUNT)),
    )).toBe(true);
    expect(memory.results.some((item) => item.excerpt.includes("実測"))).toBe(true);
  });

  it("maps comparison hypothesis and next steps", () => {
    const comparison: ComparisonRun = {
      id: "cmp-1",
      shopId: "shop-a",
      title: "VPN vs NY",
      status: "ready",
      sideA: { label: "VPN 65%" },
      sideB: { label: "NY 63%" },
      dimensions: [
        { key: "chew", label: "噛み", valueA: 70, valueB: 65 },
      ],
      hypothesis: "VPN の方が軽い",
      nextSteps: "次は発酵温度だけ変える",
      createdAt: SYNTHESIZED_AT,
      updatedAt: SYNTHESIZED_AT,
    };

    const memory = synthesizeResearchMemory({
      shopId: "shop-a",
      synthesizedAt: SYNTHESIZED_AT,
      comparisons: [comparison],
    });

    expect(memory.hypotheses[0]?.source).toBe("comparison");
    expect(memory.nextSteps[0]?.excerpt).toContain("発酵温度");
    expect(memory.openQuestions.some((item) => item.excerpt.includes("ready"))).toBe(true);
  });

  it("filters out other shop data", () => {
    const memory = synthesizeResearchMemory({
      shopId: "shop-a",
      synthesizedAt: SYNTHESIZED_AT,
      journals: [makeJournal({ shopId: "shop-b" })],
    });

    expect(memory.hypotheses).toHaveLength(0);
  });

  it("limits each category to maxItemsPerCategory", () => {
    const journals = Array.from({ length: 8 }, (_, index) =>
      makeJournal({
        id: `journal-${index}`,
        title: `Entry ${index}`,
        body: "## 仮説\nテスト",
        updatedAt: `2026-07-0${index + 1}T10:00:00.000Z`,
      }),
    );

    const memory = synthesizeResearchMemory({
      shopId: "shop-a",
      synthesizedAt: SYNTHESIZED_AT,
      journals,
      maxItemsPerCategory: 3,
    });

    expect(memory.hypotheses).toHaveLength(3);
  });

  it("truncates long excerpts to 200 characters", () => {
    const memory = synthesizeResearchMemory({
      shopId: "shop-a",
      synthesizedAt: SYNTHESIZED_AT,
      labSessions: [
        {
          id: "session-1",
          shopId: "shop-a",
          title: "Long hypothesis",
          status: "draft",
          hypothesis: "あ".repeat(250),
          runIds: [],
          journalEntryIds: [],
          comparisonIds: [],
          createdAt: SYNTHESIZED_AT,
          updatedAt: SYNTHESIZED_AT,
        } satisfies LabSession,
      ],
    });

    expect(memory.hypotheses[0]?.excerpt.length).toBeLessThanOrEqual(200);
  });

  it("maps DNA unset scores to open questions", () => {
    const dna: DoughDNA = {
      id: "dna-1",
      shopId: "shop-a",
      name: "うちの100点",
      presetType: "research",
      scores: { lightness: 80 },
      createdAt: SYNTHESIZED_AT,
      updatedAt: SYNTHESIZED_AT,
    };

    const memory = synthesizeResearchMemory({
      shopId: "shop-a",
      synthesizedAt: SYNTHESIZED_AT,
      doughDnas: [dna],
    });

    expect(memory.openQuestions.some((item) => item.excerpt.includes("未設定"))).toBe(true);
  });

  it("maps flour blend ratio mismatch to open questions", () => {
    const blend: FlourBlend = {
      id: "blend-1",
      shopId: "shop-a",
      name: "Test blend",
      components: [
        { flourId: "flour-a", percent: 60 },
        { flourId: "flour-b", percent: 30 },
      ],
      createdAt: SYNTHESIZED_AT,
      updatedAt: SYNTHESIZED_AT,
    };

    const memory = synthesizeResearchMemory({
      shopId: "shop-a",
      synthesizedAt: SYNTHESIZED_AT,
      flourBlends: [blend],
    });

    expect(memory.openQuestions.some((item) => item.excerpt.includes("90%"))).toBe(true);
  });
});
