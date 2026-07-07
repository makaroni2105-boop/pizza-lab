/**
 * Mock LLM Adapter（Phase 5b）。
 * 外部 fetch / API キー不使用。決定論的テンプレート回答のみ。
 */

import type {
  LLMAdapter,
  LLMCompletionRequest,
  LLMCompletionResult,
  ResearchContext,
} from "@/types/ai";
import { MOCK_LLM_MODEL } from "./llm-adapter";

function formatKnowledgeSection(context: ResearchContext): string {
  if (context.knowledge.length === 0) {
    return "Knowledge 記事は見つかりませんでした。別の言い方でも一緒に探してみましょう。";
  }

  return context.knowledge
    .map((entry) => `- [Knowledge] ${entry.titleJa}: ${entry.excerpt}`)
    .join("\n");
}

function formatDieSection(context: ResearchContext): string {
  const die = context.dieOutput;

  if (!die) {
    return "DIE 計算結果はコンテキストにありません。数値については推測しません。";
  }

  const iceNote = die.useIce
    ? `氷 ${die.iceAmountG ?? 0}g`
    : `推奨水温 ${die.recommendedWaterTempC}°C`;

  return [
    "DIE Core の計算結果（参照のみ・再計算しません）:",
    `- 加水率 ${die.hydrationPct}%`,
    `- ${iceNote}`,
    `- 予測生地温 ${die.predictedDoughTempC}°C / 目標 DDT ${die.targetDdtC}°C`,
    `- 摩擦 ${die.frictionRiseC}°C（source: ${die.frictionSource ?? "unknown"}）`,
  ].join("\n");
}

function formatRunSection(context: ResearchContext): string {
  if (context.runHistory.length === 0) {
    return "Run 記録がまだないため、店舗の傾向は読み取れません。";
  }

  return context.runHistory
    .slice(0, 3)
    .map(
      (run) =>
        `- Run ${run.recordedAt.slice(0, 10)}: 予測 ${run.predictedDoughTempC}°C → 実測 ${run.actualDoughTempC}°C`,
    )
    .join("\n");
}

function formatMemorySection(context: ResearchContext): string {
  const memory = context.researchMemory;
  const lines: string[] = [];

  if (memory.hypotheses[0]) {
    lines.push(`仮説: ${memory.hypotheses[0].excerpt}`);
  }

  if (memory.results[0]) {
    lines.push(`結果: ${memory.results[0].excerpt}`);
  }

  if (memory.openQuestions[0]) {
    lines.push(`未検証: ${memory.openQuestions[0].excerpt}`);
  }

  if (lines.length === 0) {
    return "研究メモはまだ少ないです。Journal や Run を記録すると一緒に検証しやすくなります。";
  }

  return lines.join("\n");
}

function formatNextStep(context: ResearchContext): string {
  const next = context.researchMemory.nextSteps[0]?.excerpt;

  if (next?.trim()) {
    return next.trim();
  }

  if (!context.meta.isLearningComplete) {
    return "次の一枚では、同じ条件でもう 1 回 Run を記録して傾向を一緒に見てみましょう。";
  }

  return "次の一枚では、変える条件を 1 つだけ選んで比較してみましょう。";
}

/** 決定論的 mock 回答文を生成（外部 API 不使用） */
export function generateMockLlmAnswer(context: ResearchContext): string {
  const question = context.question;
  const shopName = context.profile?.shopName ?? "この店";

  const sections = [
    `「${question}」について、${shopName} の記録と Knowledge をもとに一緒に検証していきましょう。`,
    "",
    "【根拠】",
    formatKnowledgeSection(context),
    "",
    "【DIE（参照のみ）】",
    formatDieSection(context),
    "",
    "【Run 記録】",
    formatRunSection(context),
    "",
    "【研究メモ】",
    formatMemorySection(context),
    "",
    "STG / VPN / APN など製法は参照できますが、どれか一つだけに限定しません。粉も優劣ではなく個性として見ています。",
    "",
    "【次の一枚】",
    formatNextStep(context),
    "",
    "最終的な判断は職人さんにお任せします。",
  ];

  return sections.join("\n");
}

export class MockLLMAdapter implements LLMAdapter {
  readonly provider = "mock" as const;
  readonly model = MOCK_LLM_MODEL;

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResult> {
    const text = generateMockLlmAnswer(request.context);

    return {
      text,
      model: this.model,
      provider: this.provider,
      finishReason: "stop",
    };
  }
}

export function createMockLLMAdapter(): MockLLMAdapter {
  return new MockLLMAdapter();
}

/** デフォルト mock adapter — Phase 5b では常にこれを使用 */
export const defaultMockLLMAdapter = createMockLLMAdapter();
