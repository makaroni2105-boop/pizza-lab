/**
 * Ask プロンプト組み立て（Phase 5b）。
 * 研究パートナー人格 + ResearchContext を LLM 入力形式に変換。
 * 正本: docs/ai/personality.md, docs/ai/safety-rules.md
 */

import type { AskPrompt, ResearchContext } from "@/types/ai";

const RESEARCH_PARTNER_SYSTEM_LINES = [
  "You are a research partner for pizza craftspeople worldwide — not a teacher, judge, or ranking system.",
  "Help them bake a better next pizza than yesterday through observation, hypotheses, and one next experiment.",
  "Never override or recalculate DIE numeric outputs. DIE values in context are reference-only.",
  "Never rank flours, methods, or styles (STG/VPN/APN/NY) as superior or inferior.",
  "Respect STG, VPN, and APN as references — never present a single method as the only correct answer.",
  'Say "わからない" / "I don\'t know" when context is insufficient. Do not fill gaps with guesses.',
  "Respect the craftsman's final decision. Offer choices with evidence, not commands.",
  "Cite only from the provided ResearchContext. Include source labels in the answer.",
  "Suggest at most one concrete next step toward the next pizza.",
  "Respond in Japanese. Use a collaborative verification tone (一緒に検証しましょう).",
  "Do not use absolute phrases like 正解は, 必ず, 最良の粉, or claim DIE results are wrong.",
];

export const RESEARCH_PARTNER_SYSTEM_PROMPT = RESEARCH_PARTNER_SYSTEM_LINES.join("\n");

export interface PromptContextSummary {
  shopId: string;
  question: string;
  dieOutputReferenceOnly?: boolean;
  knowledgeCount: number;
  runCount: number;
  isLearningComplete: boolean;
  missingSources: string[];
  researchMemoryCounts: {
    hypotheses: number;
    experiments: number;
    results: number;
    openQuestions: number;
    nextSteps: number;
  };
  context: ResearchContext;
}

function buildContextSummaryObject(context: ResearchContext): PromptContextSummary {
  const memory = context.researchMemory;

  return {
    shopId: context.shopId,
    question: context.question,
    dieOutputReferenceOnly: context.dieOutput?.referenceOnly === true,
    knowledgeCount: context.knowledge.length,
    runCount: context.meta.totalRunCount,
    isLearningComplete: context.meta.isLearningComplete,
    missingSources: context.meta.missingSources,
    researchMemoryCounts: {
      hypotheses: memory.hypotheses.length,
      experiments: memory.experiments.length,
      results: memory.results.length,
      openQuestions: memory.openQuestions.length,
      nextSteps: memory.nextSteps.length,
    },
    context,
  };
}

/** ResearchContext から LLM 用プロンプトを組み立てる */
export function buildAskPrompt(context: ResearchContext): AskPrompt {
  const summary = buildContextSummaryObject(context);
  const contextSummary = JSON.stringify(summary, null, 2);

  const userLines = [
    `Question: ${context.question}`,
    "",
    "Use the ResearchContext JSON below. DIE Output values are reference-only — explain, never recalculate.",
    "",
    contextSummary,
  ];

  return {
    system: RESEARCH_PARTNER_SYSTEM_PROMPT,
    user: userLines.join("\n"),
    contextSummary,
  };
}
