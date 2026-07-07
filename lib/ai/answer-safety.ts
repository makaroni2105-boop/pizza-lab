/**
 * AI 回答の安全後処理（Phase 5b）。
 * 禁止フレーズ検出・出典付与・免責表示。
 * 正本: docs/ai/safety-rules.md
 */

import { LEARNING_MIN_RUN_COUNT } from "@/lib/learning/learning-types";
import type {
  AnswerSafetyInput,
  AnswerSafetyResult,
  AnswerSafetyWarning,
  AskSourceCitation,
  ResearchContext,
} from "@/types/ai";

/** 後処理で検出する禁止フレーズ（docs/ai/safety-rules.md §5） */
export const FORBIDDEN_ANSWER_PHRASES: readonly string[] = [
  "正解は",
  "最良の粉",
  "必ず",
  "間違い",
  "間違っている",
  "DIE の結果は間違",
  "DIEは間違",
  "唯一の正解",
  "最良の製法",
  "上位の粉",
  "下位の粉",
  "学習完了",
] as const;

const FORBIDDEN_LEARNING_COMPLETE_PATTERN = /学習(?:が)?完了/i;

const NUMERIC_CLAIM_PATTERN = /(\d+(?:\.\d+)?)\s*(?:%|％|°C|度)/g;

function collectAllowedNumericTokens(context: ResearchContext): Set<string> {
  const allowed = new Set<string>();

  const add = (value: number | undefined | null) => {
    if (value == null || Number.isNaN(value)) {
      return;
    }

    allowed.add(String(value));
    allowed.add(value.toFixed(1));
    if (Number.isInteger(value)) {
      allowed.add(`${value}.0`);
    }
  };

  if (context.dieOutput) {
    add(context.dieOutput.hydrationPct);
    add(context.dieOutput.recommendedWaterTempC);
    add(context.dieOutput.predictedDoughTempC);
    add(context.dieOutput.targetDdtC);
    add(context.dieOutput.frictionRiseC);
    add(context.dieOutput.flourG);
    add(context.dieOutput.waterG);
    add(context.dieOutput.iceAmountG);
  }

  for (const run of context.runHistory) {
    add(run.predictedDoughTempC);
    add(run.actualDoughTempC);
    add(run.tempDeltaC);
    add(run.craftsmanScore);
  }

  if (context.weather) {
    add(context.weather.ambientTempC);
    add(context.weather.ambientHumidityPct);
  }

  for (const blend of context.flourBlends) {
    add(blend.totalPercent);
  }

  return allowed;
}

/** ResearchContext から citation 一覧を抽出 */
export function extractSourcesFromContext(
  context: ResearchContext,
): AskSourceCitation[] {
  const sources: AskSourceCitation[] = [];

  for (const entry of context.knowledge) {
    sources.push({
      type: "knowledge",
      id: entry.entryId,
      label: entry.titleJa,
      href: "/knowledge",
    });
  }

  for (const run of context.runHistory) {
    sources.push({
      type: "run",
      id: run.runId,
      label: `Run ${run.recordedAt.slice(0, 10)}`,
      href: "/die/history",
    });
  }

  for (const journal of context.journal) {
    sources.push({
      type: "journal",
      id: journal.journalId,
      label: journal.title,
      href: "/lab/journal",
    });
  }

  for (const comparison of context.comparisons) {
    sources.push({
      type: "comparison",
      id: comparison.comparisonId,
      label: comparison.title,
      href: "/lab/comparison",
    });
  }

  for (const dna of context.doughDna) {
    sources.push({
      type: "dna",
      id: dna.dnaId,
      label: dna.name,
      href: "/lab/dna",
    });
  }

  for (const blend of context.flourBlends) {
    sources.push({
      type: "blend",
      id: blend.blendId,
      label: blend.name,
      href: "/lab/blend",
    });
  }

  if (context.dieOutput) {
    sources.push({
      type: "die",
      id: "die-output",
      label: "DIE 計算結果（参照のみ）",
    });
  }

  return sources;
}

function detectSafetyWarnings(
  answer: string,
  context: ResearchContext,
): AnswerSafetyWarning[] {
  const warnings: AnswerSafetyWarning[] = [];

  for (const phrase of FORBIDDEN_ANSWER_PHRASES) {
    if (answer.includes(phrase)) {
      warnings.push({
        code: "forbidden_phrase",
        message: `禁止フレーズを検出: 「${phrase}」`,
      });
    }
  }

  if (
    !context.meta.isLearningComplete &&
    FORBIDDEN_LEARNING_COMPLETE_PATTERN.test(answer)
  ) {
    warnings.push({
      code: "premature_learning_complete",
      message: "Run 不足なのに学習完了を示唆する表現を検出",
    });
  }

  const allowedNumbers = collectAllowedNumericTokens(context);
  const matches = answer.matchAll(NUMERIC_CLAIM_PATTERN);

  for (const match of matches) {
    const value = match[1];

    if (value && !allowedNumbers.has(value) && !allowedNumbers.has(Number(value).toFixed(1))) {
      warnings.push({
        code: "unverified_numeric_claim",
        message: `コンテキストにない数値の可能性: ${match[0]}`,
      });
      break;
    }
  }

  if (context.knowledge.length === 0 && context.runHistory.length === 0 && answer.length > 80) {
    warnings.push({
      code: "missing_citation_context",
      message: "Knowledge / Run 出典がなく長い回答が生成されました",
    });
  }

  return warnings;
}

function buildDisclaimers(context: ResearchContext): string[] {
  const disclaimers: string[] = [];

  if (!context.meta.isLearningComplete) {
    disclaimers.push(
      `Run が ${context.meta.totalRunCount} 件です。摩擦傾向は ${LEARNING_MIN_RUN_COUNT} 件以上で見え始めます。`,
    );
  }

  if (context.meta.missingSources.includes("die_output")) {
    disclaimers.push("DIE 計算結果がコンテキストに含まれていません。数値については推測していません。");
  }

  if (context.meta.missingSources.includes("dough_dna")) {
    disclaimers.push("うちの100点（Dough DNA）が未設定または未参照です。");
  }

  if (context.knowledge.length === 0) {
    disclaimers.push("Knowledge 記事が見つかりませんでした。");
  }

  return disclaimers;
}

function pickNextStep(context: ResearchContext): string | undefined {
  const fromMemory = context.researchMemory.nextSteps[0]?.excerpt;

  if (fromMemory?.trim()) {
    return fromMemory.trim();
  }

  const fromComparison = context.comparisons.find((item) => item.nextStepsExcerpt?.trim());

  if (fromComparison?.nextStepsExcerpt) {
    return fromComparison.nextStepsExcerpt.trim();
  }

  return undefined;
}

function appendSafetyNotice(answer: string, warnings: AnswerSafetyWarning[]): string {
  if (warnings.length === 0) {
    return answer;
  }

  const notice =
    "（注: この回答には安全チェックで検出された表現があります。職人の判断を優先してください。）";

  if (answer.includes(notice)) {
    return answer;
  }

  return `${answer}\n\n${notice}`;
}

/** 回答文に安全ルールを適用し、出典・免責・aiUsed を付与 */
export function applyAnswerSafetyRules(input: AnswerSafetyInput): AnswerSafetyResult {
  const { context } = input;
  const sources = input.sources ?? extractSourcesFromContext(context);
  const warnings = detectSafetyWarnings(input.answer, context);
  const disclaimers = buildDisclaimers(context);
  const nextStep = pickNextStep(context);

  if (warnings.some((warning) => warning.code === "forbidden_phrase")) {
    disclaimers.push("禁止フレーズが含まれていた可能性があります。断定ではなく一緒に検証してください。");
  }

  return {
    answer: appendSafetyNotice(input.answer, warnings),
    sources,
    nextStep,
    disclaimers,
    warnings,
    aiUsed: true,
    mode: "llm_rag",
  };
}
