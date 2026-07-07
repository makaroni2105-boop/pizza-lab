import { describe, expect, it } from "vitest";

import {
  isFlourBlendPercentValid,
  isValidDNAScore,
  isValidDNAScores,
  hasComparisonSideReference,
  sumFlourBlendPercents,
  validateDoughDNA,
  validateFlourBlend,
  validateDoughJournal,
  validateComparisonRun,
} from "@/lib/lab";

describe("lab validation", () => {
  it("validates DNA scores in range", () => {
    expect(isValidDNAScore(0)).toBe(true);
    expect(isValidDNAScore(100)).toBe(true);
    expect(isValidDNAScore(101)).toBe(false);
    expect(isValidDNAScore(-1)).toBe(false);
  });

  it("validates DNAScores object keys", () => {
    expect(isValidDNAScores({ lightness: 70, chewiness: null })).toBe(true);
    expect(isValidDNAScores({ invalidKey: 50 })).toBe(false);
    expect(isValidDNAScores({ lightness: 150 })).toBe(false);
  });

  it("validates flour blend percents sum to 100", () => {
    const valid = [
      { flourId: "a", percent: 70 },
      { flourId: "b", percent: 30 },
    ];

    expect(sumFlourBlendPercents(valid)).toBe(100);
    expect(isFlourBlendPercentValid(valid)).toBe(true);
    expect(isFlourBlendPercentValid([{ flourId: "a", percent: 100 }])).toBe(false);
  });

  it("requires run or session on comparison side", () => {
    expect(hasComparisonSideReference({ label: "A", runId: "run-1" })).toBe(true);
    expect(hasComparisonSideReference({ label: "B", labSessionId: "sess-1" })).toBe(true);
    expect(hasComparisonSideReference({ label: "C" })).toBe(false);
  });

  it("validates DoughDNA objects", () => {
    expect(validateDoughDNA(null).valid).toBe(false);
    expect(
      validateDoughDNA({
        id: "dna-1",
        shopId: "shop-1",
        name: "理想",
        presetType: "research",
        scores: { lightness: 70 },
        createdAt: "2026-07-07T10:00:00.000Z",
        updatedAt: "2026-07-07T10:00:00.000Z",
      }).valid,
    ).toBe(true);
    expect(
      validateDoughDNA({
        id: "dna-1",
        shopId: "shop-1",
        name: "理想",
        presetType: "research",
        scores: { lightness: 120 },
        createdAt: "2026-07-07T10:00:00.000Z",
        updatedAt: "2026-07-07T10:00:00.000Z",
      }).valid,
    ).toBe(false);
  });

  it("validates FlourBlend percent totals", () => {
    expect(
      validateFlourBlend({
        id: "blend-1",
        shopId: "shop-1",
        name: "Test",
        components: [
          { flourId: "a", percent: 70 },
          { flourId: "b", percent: 30 },
        ],
        createdAt: "2026-07-07T10:00:00.000Z",
        updatedAt: "2026-07-07T10:00:00.000Z",
      }).valid,
    ).toBe(true);

    expect(
      validateFlourBlend({
        id: "blend-1",
        shopId: "shop-1",
        name: "Test",
        components: [
          { flourId: "a", percent: 60 },
          { flourId: "b", percent: 30 },
        ],
        createdAt: "2026-07-07T10:00:00.000Z",
        updatedAt: "2026-07-07T10:00:00.000Z",
      }).valid,
    ).toBe(false);
  });

  it("validates DoughJournal entries", () => {
    expect(
      validateDoughJournal({
        id: "journal-1",
        shopId: "shop-1",
        title: "観察メモ",
        body: "## 観察\n良好",
        entryType: "observation",
        createdAt: "2026-07-07T10:00:00.000Z",
        updatedAt: "2026-07-07T10:00:00.000Z",
      }).valid,
    ).toBe(true);

    expect(
      validateDoughJournal({
        id: "journal-1",
        shopId: "shop-1",
        title: "",
        body: "",
        entryType: "invalid",
        createdAt: "2026-07-07T10:00:00.000Z",
        updatedAt: "2026-07-07T10:00:00.000Z",
      }).valid,
    ).toBe(false);
  });

  it("validates ComparisonRun entries", () => {
    expect(
      validateComparisonRun({
        id: "compare-1",
        shopId: "shop-1",
        title: "65% vs 62%",
        status: "draft",
        sideA: { label: "Side A", runId: "run-1" },
        sideB: { label: "Side B", labSessionId: "lab-1" },
        dimensions: [{ key: "custom-1", label: "加水率", valueA: "65%", valueB: "62%" }],
        createdAt: "2026-07-07T10:00:00.000Z",
        updatedAt: "2026-07-07T10:00:00.000Z",
      }).valid,
    ).toBe(true);

    expect(
      validateComparisonRun({
        id: "compare-1",
        shopId: "shop-1",
        title: "",
        status: "draft",
        sideA: { label: "" },
        sideB: { label: "Side B" },
        dimensions: [],
        createdAt: "2026-07-07T10:00:00.000Z",
        updatedAt: "2026-07-07T10:00:00.000Z",
      }).valid,
    ).toBe(false);
  });
});
