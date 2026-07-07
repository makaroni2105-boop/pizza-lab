/**
 * ResearchContext 組み立て（Phase 5a）。
 * 純粋関数 — localStorage / D1 非アクセス。
 * 正本: docs/ai/rag-context.md
 */

import { getJournalBodyPreview } from "@/lib/lab/journal-storage";
import { LEARNING_MIN_RUN_COUNT } from "@/lib/learning/learning-types";
import type { LearningRun } from "@/lib/learning/learning-types";
import type { KnowledgeSearchResult } from "@/lib/knowledge/knowledge-types";
import type { WeatherSnapshot } from "@/lib/defaults/resolve-environment";
import {
  DNA_KEYS,
  type ComparisonRun,
  type DoughDNA,
  type DoughJournal,
  type FlourBlend,
} from "@/types/lab";
import type { DieOutput } from "@/types/die";
import type { LearningSummary, ShopProfile } from "@/types/profile";
import type {
  ComparisonContextSlice,
  DieOutputContextSlice,
  DoughDnaContextSlice,
  FlourBlendContextSlice,
  JournalContextSlice,
  KnowledgeContextSlice,
  LearningContextSlice,
  ProfileContextSlice,
  ResearchContext,
  ResearchContextInput,
  ResearchContextLimits,
  ResearchContextSource,
  RunHistoryContextSlice,
  WeatherContextSlice,
} from "@/types/ai";
import {
  RESEARCH_CONTEXT_ENTITY_LIMIT,
  RESEARCH_CONTEXT_KNOWLEDGE_EXCERPT_MAX,
  RESEARCH_CONTEXT_KNOWLEDGE_LIMIT,
  RESEARCH_CONTEXT_RUN_HISTORY_LIMIT,
} from "@/types/ai";
import { synthesizeResearchMemory } from "./research-memory";

function resolveLimits(limits?: Partial<ResearchContextLimits>): ResearchContextLimits {
  return {
    knowledge: limits?.knowledge ?? RESEARCH_CONTEXT_KNOWLEDGE_LIMIT,
    runHistory: limits?.runHistory ?? RESEARCH_CONTEXT_RUN_HISTORY_LIMIT,
    journal: limits?.journal ?? RESEARCH_CONTEXT_ENTITY_LIMIT,
    comparison: limits?.comparison ?? RESEARCH_CONTEXT_ENTITY_LIMIT,
    doughDna: limits?.doughDna ?? RESEARCH_CONTEXT_ENTITY_LIMIT,
    flourBlend: limits?.flourBlend ?? RESEARCH_CONTEXT_ENTITY_LIMIT,
  };
}

function filterByShopId<T extends { shopId: string }>(
  items: T[] | undefined,
  shopId: string,
): T[] {
  return (items ?? []).filter((item) => item.shopId === shopId);
}

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function sortRunsByRecordedAtDesc(runs: LearningRun[]): LearningRun[] {
  return [...runs].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

function truncateText(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function buildKnowledgeSlices(
  results: KnowledgeSearchResult[] | undefined,
  limit: number,
): KnowledgeContextSlice[] {
  return (results ?? []).slice(0, limit).map((result) => ({
    source: "knowledge",
    entryId: result.entry.id,
    tier: result.entry.tier,
    titleJa: result.entry.titleJa,
    relativePath: result.entry.relativePath,
    excerpt: truncateText(result.excerpt, RESEARCH_CONTEXT_KNOWLEDGE_EXCERPT_MAX),
    score: result.score,
  }));
}

function buildLearningSlices(
  profile: ShopProfile | null | undefined,
  explicitLearning: LearningSummary[] | undefined,
): LearningContextSlice[] {
  const summaries = explicitLearning ?? profile?.learning ?? [];

  return summaries.map((summary) => ({
    source: "learning",
    mixerKey: summary.mixerKey,
    runCount: summary.runCount,
    learnedFrictionOffset: summary.learnedFrictionOffset,
    isLearningComplete: summary.isLearningComplete,
    lastUpdatedAt: summary.lastUpdatedAt,
  }));
}

function buildWeatherSlice(
  weather: WeatherSnapshot | null | undefined,
): WeatherContextSlice | undefined {
  if (!weather) {
    return undefined;
  }

  if (weather.ambientTempC == null && weather.ambientHumidityPct == null) {
    return undefined;
  }

  return {
    source: "weather",
    ambientTempC: weather.ambientTempC,
    ambientHumidityPct: weather.ambientHumidityPct,
  };
}

function buildRunHistorySlices(
  runs: LearningRun[],
  limit: number,
): RunHistoryContextSlice[] {
  return sortRunsByRecordedAtDesc(runs).slice(0, limit).map((run) => ({
    source: "run_history",
    runId: run.id,
    recordedAt: run.recordedAt,
    mixerKey: run.mixerKey,
    predictedDoughTempC: run.predictedDoughTempC,
    actualDoughTempC: run.actualDoughTempC,
    tempDeltaC: run.actualDoughTempC - run.predictedDoughTempC,
    craftsmanScore: run.craftsmanScore,
    memoExcerpt: run.memo?.trim()
      ? truncateText(run.memo, 120)
      : undefined,
  }));
}

function buildDnaSlices(dnas: DoughDNA[], limit: number): DoughDnaContextSlice[] {
  return sortByUpdatedAtDesc(dnas).slice(0, limit).map((dna) => ({
    source: "dough_dna",
    dnaId: dna.id,
    name: dna.name,
    presetType: dna.presetType,
    descriptionExcerpt: dna.description?.trim()
      ? truncateText(dna.description, 160)
      : undefined,
    configuredScoreCount: DNA_KEYS.filter((key) => dna.scores[key] != null).length,
    unsetScoreCount: DNA_KEYS.filter((key) => dna.scores[key] == null).length,
    isDefault: dna.isDefault,
    updatedAt: dna.updatedAt,
  }));
}

function buildBlendSlices(
  blends: FlourBlend[],
  limit: number,
): FlourBlendContextSlice[] {
  return sortByUpdatedAtDesc(blends).slice(0, limit).map((blend) => ({
    source: "flour_blend",
    blendId: blend.id,
    name: blend.name,
    componentSummary: blend.components
      .map((component) => `${component.label ?? component.flourId} ${component.percent}%`)
      .join(" / "),
    totalPercent: blend.components.reduce((sum, component) => sum + component.percent, 0),
    methodContext: blend.methodContext,
    notesExcerpt: blend.notes?.trim()
      ? truncateText(blend.notes, 160)
      : undefined,
    updatedAt: blend.updatedAt,
  }));
}

function buildJournalSlices(
  journals: DoughJournal[],
  limit: number,
): JournalContextSlice[] {
  return sortByUpdatedAtDesc(journals).slice(0, limit).map((journal) => ({
    source: "journal",
    journalId: journal.id,
    title: journal.title,
    entryType: journal.entryType,
    excerpt: getJournalBodyPreview(journal.body, 160),
    craftsmanMood: journal.craftsmanMood,
    updatedAt: journal.updatedAt,
  }));
}

function buildComparisonSlices(
  comparisons: ComparisonRun[],
  limit: number,
): ComparisonContextSlice[] {
  return sortByUpdatedAtDesc(comparisons).slice(0, limit).map((comparison) => ({
    source: "comparison",
    comparisonId: comparison.id,
    title: comparison.title,
    status: comparison.status,
    sideALabel: comparison.sideA.label,
    sideBLabel: comparison.sideB.label,
    hypothesisExcerpt: comparison.hypothesis?.trim()
      ? truncateText(comparison.hypothesis, 160)
      : undefined,
    conclusionExcerpt: comparison.conclusion?.trim()
      ? truncateText(comparison.conclusion, 160)
      : undefined,
    nextStepsExcerpt: comparison.nextSteps?.trim()
      ? truncateText(comparison.nextSteps, 160)
      : undefined,
    dimensionSummary: comparison.dimensions.length
      ? comparison.dimensions
          .slice(0, 3)
          .map((dimension) => dimension.label)
          .join(" / ")
      : undefined,
    updatedAt: comparison.updatedAt,
  }));
}

function buildProfileSlice(
  profile: ShopProfile | null | undefined,
  shopId: string,
): ProfileContextSlice | undefined {
  if (!profile || profile.id !== shopId) {
    return undefined;
  }

  const defaultPreset = profile.presets.find(
    (preset) => preset.id === profile.defaultPresetId,
  );

  return {
    source: "profile",
    shopId: profile.id,
    shopName: profile.name,
    defaultPresetName: defaultPreset?.name,
    method: profile.method.method,
    mixerType: profile.mixer.type,
    primaryFlourId: profile.flour.primaryFlourId,
  };
}

/** DieOutput から参照用スライスを作る。数値は写しのみ — 再計算しない。 */
export function mapDieOutputToContextSlice(output: DieOutput): DieOutputContextSlice {
  return {
    source: "die_output",
    referenceOnly: true,
    calculatedAt: output.calculatedAt,
    hydrationPct: output.recipe.hydrationPct,
    recommendedWaterTempC: output.temperature.recommendedWaterTempC,
    predictedDoughTempC: output.temperature.predictedDoughTempC,
    targetDdtC: output.temperature.targetDdtC,
    useIce: output.temperature.useIce,
    iceAmountG: output.temperature.iceAmountG,
    frictionRiseC: output.temperature.frictionRiseC,
    frictionSource: output.temperature.frictionSource,
    flourG: output.recipe.flourG,
    waterG: output.recipe.waterG,
    confidenceLevel: output.confidence.level,
    learningRunCount: output.confidence.learningRunCount,
  };
}

function detectMissingSources(
  input: ResearchContextInput,
  shopRuns: LearningRun[],
  limits: ResearchContextLimits,
  knowledge: KnowledgeContextSlice[],
  learning: LearningContextSlice[],
  weather: WeatherContextSlice | undefined,
  runHistory: RunHistoryContextSlice[],
  doughDna: DoughDnaContextSlice[],
  flourBlends: FlourBlendContextSlice[],
  journal: JournalContextSlice[],
  comparisons: ComparisonContextSlice[],
  profile: ProfileContextSlice | undefined,
  dieOutput: DieOutputContextSlice | undefined,
): ResearchContextSource[] {
  const missing: ResearchContextSource[] = [];

  if (knowledge.length === 0 && input.question.trim()) {
    missing.push("knowledge");
  }

  if (learning.length === 0) {
    missing.push("learning");
  }

  if (!weather) {
    missing.push("weather");
  }

  if (runHistory.length === 0) {
    missing.push("run_history");
  }

  if (doughDna.length === 0) {
    missing.push("dough_dna");
  }

  if (flourBlends.length === 0) {
    missing.push("flour_blend");
  }

  if (journal.length === 0) {
    missing.push("journal");
  }

  if (comparisons.length === 0) {
    missing.push("comparison");
  }

  if (!profile) {
    missing.push("profile");
  }

  if (!dieOutput) {
    missing.push("die_output");
  }

  if (shopRuns.length < LEARNING_MIN_RUN_COUNT) {
    missing.push("learning");
  }

  void limits;
  void input;

  return [...new Set(missing)];
}

function detectTruncatedSources(
  counts: Record<ResearchContextSource, { total: number; limit: number }>,
): ResearchContextSource[] {
  const truncated: ResearchContextSource[] = [];

  for (const [source, { total, limit }] of Object.entries(counts)) {
    if (total > limit) {
      truncated.push(source as ResearchContextSource);
    }
  }

  return truncated;
}

/** 質問と店舗データから ResearchContext を組み立てる */
export function buildResearchContext(input: ResearchContextInput): ResearchContext {
  const limits = resolveLimits(input.limits);
  const synthesizedAt = input.synthesizedAt ?? "";
  const shopId = input.shopId;

  const learningRuns = filterByShopId(input.learningRuns, shopId);
  const doughDnas = filterByShopId(input.doughDnas, shopId);
  const flourBlends = filterByShopId(input.flourBlends, shopId);
  const journals = filterByShopId(input.journals, shopId);
  const comparisons = filterByShopId(input.comparisons, shopId);
  const labSessions = filterByShopId(input.labSessions, shopId);

  const knowledge = buildKnowledgeSlices(input.knowledgeEntries, limits.knowledge);
  const learning = buildLearningSlices(input.profile, input.learning);
  const weather = buildWeatherSlice(input.weather);
  const runHistory = buildRunHistorySlices(learningRuns, limits.runHistory);
  const doughDna = buildDnaSlices(doughDnas, limits.doughDna);
  const flourBlendSlices = buildBlendSlices(flourBlends, limits.flourBlend);
  const journal = buildJournalSlices(journals, limits.journal);
  const comparisonSlices = buildComparisonSlices(comparisons, limits.comparison);
  const profile = buildProfileSlice(input.profile, shopId);
  const dieOutput = input.dieOutput
    ? mapDieOutputToContextSlice(input.dieOutput)
    : undefined;

  const researchMemory = synthesizeResearchMemory({
    shopId,
    synthesizedAt,
    labSessions,
    learningRuns,
    doughDnas,
    flourBlends,
    journals,
    comparisons,
  });

  const truncatedSources = detectTruncatedSources({
    knowledge: {
      total: (input.knowledgeEntries ?? []).length,
      limit: limits.knowledge,
    },
    run_history: { total: learningRuns.length, limit: limits.runHistory },
    dough_dna: { total: doughDnas.length, limit: limits.doughDna },
    flour_blend: { total: flourBlends.length, limit: limits.flourBlend },
    journal: { total: journals.length, limit: limits.journal },
    comparison: { total: comparisons.length, limit: limits.comparison },
    learning: { total: learning.length, limit: learning.length },
    weather: { total: weather ? 1 : 0, limit: 1 },
    profile: { total: profile ? 1 : 0, limit: 1 },
    die_output: { total: dieOutput ? 1 : 0, limit: 1 },
    research_memory: { total: 1, limit: 1 },
  });

  const missingSources = detectMissingSources(
    input,
    learningRuns,
    limits,
    knowledge,
    learning,
    weather,
    runHistory,
    doughDna,
    flourBlendSlices,
    journal,
    comparisonSlices,
    profile,
    dieOutput,
  );

  return {
    shopId,
    question: input.question.trim(),
    knowledge,
    learning,
    weather,
    runHistory,
    doughDna,
    flourBlends: flourBlendSlices,
    journal,
    comparisons: comparisonSlices,
    profile,
    dieOutput,
    researchMemory,
    meta: {
      synthesizedAt,
      missingSources,
      truncatedSources,
      limits,
      totalRunCount: learningRuns.length,
      isLearningComplete: learningRuns.length >= LEARNING_MIN_RUN_COUNT,
    },
  };
}
