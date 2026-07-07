/**
 * Research Memory 合成（Phase 5a）。
 * 純粋関数 — localStorage / D1 非アクセス。
 * 正本: docs/ai/research-memory.md
 */

import { parseJournalBody } from "@/lib/lab/journal-storage";
import { LEARNING_MIN_RUN_COUNT } from "@/lib/learning/learning-types";
import type { LearningRun } from "@/lib/learning/learning-types";
import {
  DNA_KEYS,
  type ComparisonRun,
  type DoughDNA,
  type DoughJournal,
  type FlourBlend,
  type LabSession,
} from "@/types/lab";
import type {
  ResearchConfidence,
  ResearchMemory,
  ResearchMemoryInput,
  ResearchMemoryItem,
  ResearchMemorySource,
} from "@/types/ai";
import {
  RESEARCH_MEMORY_EXCERPT_MAX_LENGTH,
  RESEARCH_MEMORY_MAX_ITEMS_PER_CATEGORY,
} from "@/types/ai";

function truncateExcerpt(
  text: string,
  maxLength = RESEARCH_MEMORY_EXCERPT_MAX_LENGTH,
): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function makeItem(
  id: string,
  source: ResearchMemorySource,
  label: string,
  excerpt: string,
  recordedAt: string,
  confidence: ResearchConfidence,
): ResearchMemoryItem | null {
  const trimmed = truncateExcerpt(excerpt);

  if (!trimmed) {
    return null;
  }

  return { id, source, label, excerpt: trimmed, recordedAt, confidence };
}

function sortAndLimit(
  items: ResearchMemoryItem[],
  maxItems: number,
): ResearchMemoryItem[] {
  return [...items]
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, maxItems);
}

function filterByShopId<T extends { shopId: string }>(
  items: T[] | undefined,
  shopId: string,
): T[] {
  return (items ?? []).filter((item) => item.shopId === shopId);
}

function countUnsetDnaScores(dna: DoughDNA): number {
  return DNA_KEYS.filter((key) => dna.scores[key] == null).length;
}

function countConfiguredDnaScores(dna: DoughDNA): number {
  return DNA_KEYS.filter((key) => dna.scores[key] != null).length;
}

function sumBlendPercent(blend: FlourBlend): number {
  return blend.components.reduce((sum, component) => sum + component.percent, 0);
}

function formatBlendComponents(blend: FlourBlend): string {
  return blend.components
    .map((component) => `${component.label ?? component.flourId} ${component.percent}%`)
    .join(" / ");
}

function formatComparisonSides(comparison: ComparisonRun): string {
  return `${comparison.sideA.label} vs ${comparison.sideB.label}`;
}

function formatDimensionSummary(comparison: ComparisonRun): string {
  const parts = comparison.dimensions
    .filter(
      (dimension) =>
        dimension.valueA != null ||
        dimension.valueB != null ||
        dimension.valueC != null,
    )
    .slice(0, 3)
    .map((dimension) => {
      const a = dimension.valueA ?? "—";
      const b = dimension.valueB ?? "—";
      return `${dimension.label}: A=${a} B=${b}`;
    });

  return parts.join("; ");
}

function collectFromLabSession(session: LabSession): {
  hypotheses: ResearchMemoryItem[];
  experiments: ResearchMemoryItem[];
  openQuestions: ResearchMemoryItem[];
} {
  const hypotheses: ResearchMemoryItem[] = [];
  const experiments: ResearchMemoryItem[] = [];
  const openQuestions: ResearchMemoryItem[] = [];

  if (session.hypothesis?.trim()) {
    const item = makeItem(
      session.id,
      "lab_session",
      session.title ?? "Lab セッション",
      session.hypothesis,
      session.updatedAt,
      "hypothesis",
    );

    if (item) {
      hypotheses.push(item);
    }
  }

  if (session.title?.trim() || session.status !== "draft") {
    const experimentText = [session.title, `status: ${session.status}`]
      .filter(Boolean)
      .join(" — ");

    const item = makeItem(
      session.id,
      "lab_session",
      session.title ?? "Lab セッション",
      experimentText,
      session.updatedAt,
      "fact",
    );

    if (item) {
      experiments.push(item);
    }
  }

  if (session.status === "draft") {
    const item = makeItem(
      session.id,
      "lab_session",
      session.title ?? "Lab セッション",
      "セッションが下書きのままです",
      session.updatedAt,
      "hypothesis",
    );

    if (item) {
      openQuestions.push(item);
    }
  }

  return { hypotheses, experiments, openQuestions };
}

function collectFromLearningRun(
  run: LearningRun,
  shopRunCount: number,
): {
  hypotheses: ResearchMemoryItem[];
  experiments: ResearchMemoryItem[];
  results: ResearchMemoryItem[];
  openQuestions: ResearchMemoryItem[];
  nextSteps: ResearchMemoryItem[];
} {
  const hypotheses: ResearchMemoryItem[] = [];
  const experiments: ResearchMemoryItem[] = [];
  const results: ResearchMemoryItem[] = [];
  const openQuestions: ResearchMemoryItem[] = [];
  const nextSteps: ResearchMemoryItem[] = [];

  if (run.memo?.trim()) {
    const hypothesisItem = makeItem(
      run.id,
      "learning_run",
      `Run ${run.recordedAt.slice(0, 10)}`,
      run.memo,
      run.recordedAt,
      "hypothesis",
    );

    if (hypothesisItem) {
      hypotheses.push(hypothesisItem);
    }

    const nextItem = makeItem(
      `${run.id}:next`,
      "learning_run",
      "Run メモ",
      run.memo,
      run.recordedAt,
      "subjective",
    );

    if (nextItem) {
      nextSteps.push(nextItem);
    }
  }

  const snapshotText = [
    `粉温 ${run.snapshot.flourTempC}°C`,
    `水温 ${run.snapshot.waterTempC}°C`,
    `室温 ${run.snapshot.roomTempC}°C`,
    `mixer: ${run.mixerKey}`,
  ].join(" / ");

  const experimentItem = makeItem(
    run.id,
    "learning_run",
    `Run ${run.recordedAt.slice(0, 10)}`,
    snapshotText,
    run.recordedAt,
    "fact",
  );

  if (experimentItem) {
    experiments.push(experimentItem);
  }

  const delta = run.actualDoughTempC - run.predictedDoughTempC;
  const resultParts = [
    `予測 ${run.predictedDoughTempC}°C → 実測 ${run.actualDoughTempC}°C (Δ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}°C)`,
  ];

  if (run.craftsmanScore != null) {
    resultParts.push(`職人評価 ${run.craftsmanScore}/5`);
  }

  const resultItem = makeItem(
    run.id,
    "learning_run",
    `Run 結果 ${run.recordedAt.slice(0, 10)}`,
    resultParts.join(" / "),
    run.recordedAt,
    "fact",
  );

  if (resultItem) {
    results.push(resultItem);
  }

  if (shopRunCount < LEARNING_MIN_RUN_COUNT) {
    const openItem = makeItem(
      `${run.id}:learning`,
      "learning_run",
      "摩擦学習",
      `Run が ${shopRunCount} 件のみ。${LEARNING_MIN_RUN_COUNT} 件で傾向が見え始めます`,
      run.recordedAt,
      "fact",
    );

    if (openItem) {
      openQuestions.push(openItem);
    }
  }

  return { hypotheses, experiments, results, openQuestions, nextSteps };
}

function collectFromDna(dna: DoughDNA): {
  hypotheses: ResearchMemoryItem[];
  experiments: ResearchMemoryItem[];
  results: ResearchMemoryItem[];
  openQuestions: ResearchMemoryItem[];
} {
  const hypotheses: ResearchMemoryItem[] = [];
  const experiments: ResearchMemoryItem[] = [];
  const results: ResearchMemoryItem[] = [];
  const openQuestions: ResearchMemoryItem[] = [];

  if (dna.description?.trim()) {
    const item = makeItem(
      dna.id,
      "dough_dna",
      dna.name,
      dna.description,
      dna.updatedAt,
      "subjective",
    );

    if (item) {
      hypotheses.push(item);
    }
  }

  const experimentItem = makeItem(
    dna.id,
    "dough_dna",
    dna.name,
    `preset: ${dna.presetType}`,
    dna.updatedAt,
    "fact",
  );

  if (experimentItem) {
    experiments.push(experimentItem);
  }

  const configured = countConfiguredDnaScores(dna);

  if (configured > 0) {
    const scoreSummary = DNA_KEYS.filter((key) => dna.scores[key] != null)
      .slice(0, 5)
      .map((key) => `${key}=${dna.scores[key]}`)
      .join(", ");

    const resultItem = makeItem(
      dna.id,
      "dough_dna",
      `${dna.name} スコア`,
      scoreSummary,
      dna.updatedAt,
      "subjective",
    );

    if (resultItem) {
      results.push(resultItem);
    }
  }

  const unset = countUnsetDnaScores(dna);

  if (unset > 0) {
    const openItem = makeItem(
      dna.id,
      "dough_dna",
      dna.name,
      `未設定の食感軸が ${unset} 件あります`,
      dna.updatedAt,
      "fact",
    );

    if (openItem) {
      openQuestions.push(openItem);
    }
  }

  return { hypotheses, experiments, results, openQuestions };
}

function collectFromBlend(blend: FlourBlend): {
  hypotheses: ResearchMemoryItem[];
  experiments: ResearchMemoryItem[];
  openQuestions: ResearchMemoryItem[];
  nextSteps: ResearchMemoryItem[];
} {
  const hypotheses: ResearchMemoryItem[] = [];
  const experiments: ResearchMemoryItem[] = [];
  const openQuestions: ResearchMemoryItem[] = [];
  const nextSteps: ResearchMemoryItem[] = [];

  if (blend.notes?.trim()) {
    const hypothesisItem = makeItem(
      blend.id,
      "flour_blend",
      blend.name,
      blend.notes,
      blend.updatedAt,
      "hypothesis",
    );

    if (hypothesisItem) {
      hypotheses.push(hypothesisItem);
    }

    const nextItem = makeItem(
      `${blend.id}:next`,
      "flour_blend",
      blend.name,
      blend.notes,
      blend.updatedAt,
      "subjective",
    );

    if (nextItem) {
      nextSteps.push(nextItem);
    }
  }

  const experimentItem = makeItem(
    blend.id,
    "flour_blend",
    blend.name,
    formatBlendComponents(blend),
    blend.updatedAt,
    "fact",
  );

  if (experimentItem) {
    experiments.push(experimentItem);
  }

  const totalPercent = sumBlendPercent(blend);

  if (Math.abs(totalPercent - 100) > 0.01) {
    const openItem = makeItem(
      blend.id,
      "flour_blend",
      blend.name,
      `粉比率の合計が ${totalPercent}% です（100% でない）`,
      blend.updatedAt,
      "fact",
    );

    if (openItem) {
      openQuestions.push(openItem);
    }
  }

  return { hypotheses, experiments, openQuestions, nextSteps };
}

function collectFromJournal(journal: DoughJournal): {
  hypotheses: ResearchMemoryItem[];
  experiments: ResearchMemoryItem[];
  results: ResearchMemoryItem[];
  openQuestions: ResearchMemoryItem[];
  nextSteps: ResearchMemoryItem[];
} {
  const sections = parseJournalBody(journal.body);
  const hypotheses: ResearchMemoryItem[] = [];
  const experiments: ResearchMemoryItem[] = [];
  const results: ResearchMemoryItem[] = [];
  const openQuestions: ResearchMemoryItem[] = [];
  const nextSteps: ResearchMemoryItem[] = [];

  const pushSection = (
    sectionText: string,
    label: string,
    confidence: ResearchConfidence,
    bucket: ResearchMemoryItem[],
  ) => {
    const item = makeItem(
      journal.id,
      "journal",
      `${journal.title} — ${label}`,
      sectionText,
      journal.updatedAt,
      confidence,
    );

    if (item) {
      bucket.push(item);
    }
  };

  if (sections.hypothesis.trim()) {
    pushSection(sections.hypothesis, "仮説", "hypothesis", hypotheses);
  }

  if (sections.procedure.trim()) {
    pushSection(sections.procedure, "手順", "fact", experiments);
  }

  if (sections.observation.trim()) {
    pushSection(sections.observation, "観察", "fact", results);
  }

  if (sections.result.trim()) {
    pushSection(sections.result, "結果", "fact", results);
  }

  if (journal.entryType === "reflection" && journal.craftsmanMood === "unsure") {
    pushSection(
      journal.title,
      "未確信の振り返り",
      "subjective",
      openQuestions,
    );
  }

  if (sections.nextTry.trim()) {
    pushSection(sections.nextTry, "次に試すこと", "subjective", nextSteps);
  }

  return { hypotheses, experiments, results, openQuestions, nextSteps };
}

function collectFromComparison(comparison: ComparisonRun): {
  hypotheses: ResearchMemoryItem[];
  experiments: ResearchMemoryItem[];
  results: ResearchMemoryItem[];
  openQuestions: ResearchMemoryItem[];
  nextSteps: ResearchMemoryItem[];
} {
  const hypotheses: ResearchMemoryItem[] = [];
  const experiments: ResearchMemoryItem[] = [];
  const results: ResearchMemoryItem[] = [];
  const openQuestions: ResearchMemoryItem[] = [];
  const nextSteps: ResearchMemoryItem[] = [];

  if (comparison.hypothesis?.trim()) {
    const item = makeItem(
      comparison.id,
      "comparison",
      comparison.title,
      comparison.hypothesis,
      comparison.updatedAt,
      "hypothesis",
    );

    if (item) {
      hypotheses.push(item);
    }
  }

  const experimentItem = makeItem(
    comparison.id,
    "comparison",
    comparison.title,
    formatComparisonSides(comparison),
    comparison.updatedAt,
    "fact",
  );

  if (experimentItem) {
    experiments.push(experimentItem);
  }

  const dimensionSummary = formatDimensionSummary(comparison);

  if (dimensionSummary) {
    const resultItem = makeItem(
      comparison.id,
      "comparison",
      comparison.title,
      dimensionSummary,
      comparison.updatedAt,
      "fact",
    );

    if (resultItem) {
      results.push(resultItem);
    }
  }

  if (comparison.conclusion?.trim()) {
    const resultItem = makeItem(
      `${comparison.id}:conclusion`,
      "comparison",
      `${comparison.title} — 結論`,
      comparison.conclusion,
      comparison.updatedAt,
      "subjective",
    );

    if (resultItem) {
      results.push(resultItem);
    }
  }

  if (comparison.status !== "concluded") {
    const openItem = makeItem(
      comparison.id,
      "comparison",
      comparison.title,
      `比較ステータス: ${comparison.status}（未確定）`,
      comparison.updatedAt,
      "hypothesis",
    );

    if (openItem) {
      openQuestions.push(openItem);
    }
  }

  if (comparison.nextSteps?.trim()) {
    const nextItem = makeItem(
      comparison.id,
      "comparison",
      comparison.title,
      comparison.nextSteps,
      comparison.updatedAt,
      "subjective",
    );

    if (nextItem) {
      nextSteps.push(nextItem);
    }
  }

  return { hypotheses, experiments, results, openQuestions, nextSteps };
}

/** Lab + Learning データから Research Memory を合成する */
export function synthesizeResearchMemory(input: ResearchMemoryInput): ResearchMemory {
  const maxItems = input.maxItemsPerCategory ?? RESEARCH_MEMORY_MAX_ITEMS_PER_CATEGORY;
  const shopId = input.shopId;

  const labSessions = filterByShopId(input.labSessions, shopId);
  const learningRuns = filterByShopId(input.learningRuns, shopId);
  const doughDnas = filterByShopId(input.doughDnas, shopId);
  const flourBlends = filterByShopId(input.flourBlends, shopId);
  const journals = filterByShopId(input.journals, shopId);
  const comparisons = filterByShopId(input.comparisons, shopId);

  const shopRunCount = learningRuns.length;

  const allHypotheses: ResearchMemoryItem[] = [];
  const allExperiments: ResearchMemoryItem[] = [];
  const allResults: ResearchMemoryItem[] = [];
  const allOpenQuestions: ResearchMemoryItem[] = [];
  const allNextSteps: ResearchMemoryItem[] = [];

  for (const session of labSessions) {
    const collected = collectFromLabSession(session);
    allHypotheses.push(...collected.hypotheses);
    allExperiments.push(...collected.experiments);
    allOpenQuestions.push(...collected.openQuestions);
  }

  for (const run of learningRuns) {
    const collected = collectFromLearningRun(run, shopRunCount);
    allHypotheses.push(...collected.hypotheses);
    allExperiments.push(...collected.experiments);
    allResults.push(...collected.results);
    allOpenQuestions.push(...collected.openQuestions);
    allNextSteps.push(...collected.nextSteps);
  }

  for (const dna of doughDnas) {
    const collected = collectFromDna(dna);
    allHypotheses.push(...collected.hypotheses);
    allExperiments.push(...collected.experiments);
    allResults.push(...collected.results);
    allOpenQuestions.push(...collected.openQuestions);
  }

  for (const blend of flourBlends) {
    const collected = collectFromBlend(blend);
    allHypotheses.push(...collected.hypotheses);
    allExperiments.push(...collected.experiments);
    allOpenQuestions.push(...collected.openQuestions);
    allNextSteps.push(...collected.nextSteps);
  }

  for (const journal of journals) {
    const collected = collectFromJournal(journal);
    allHypotheses.push(...collected.hypotheses);
    allExperiments.push(...collected.experiments);
    allResults.push(...collected.results);
    allOpenQuestions.push(...collected.openQuestions);
    allNextSteps.push(...collected.nextSteps);
  }

  for (const comparison of comparisons) {
    const collected = collectFromComparison(comparison);
    allHypotheses.push(...collected.hypotheses);
    allExperiments.push(...collected.experiments);
    allResults.push(...collected.results);
    allOpenQuestions.push(...collected.openQuestions);
    allNextSteps.push(...collected.nextSteps);
  }

  return {
    shopId,
    synthesizedAt: input.synthesizedAt ?? "",
    hypotheses: sortAndLimit(allHypotheses, maxItems),
    experiments: sortAndLimit(allExperiments, maxItems),
    results: sortAndLimit(allResults, maxItems),
    openQuestions: sortAndLimit(allOpenQuestions, maxItems),
    nextSteps: sortAndLimit(allNextSteps, maxItems),
  };
}
