/**
 * Ask レスポンス組み立て — AI 生成なし、ガイド文 + 候補記事のみ。
 */

import type {
  AskCandidate,
  AskKnowledgeSearchSuccessResponse,
  AskRouteResult,
} from "./ask-types";

function mapCandidate(
  result: AskRouteResult["results"][number],
): AskCandidate {
  return {
    id: result.entry.id,
    titleJa: result.entry.titleJa,
    tier: result.entry.tier,
    category: result.entry.category,
    excerpt: result.excerpt,
    relativePath: result.entry.relativePath,
    score: result.score,
  };
}

/** 断定せず「一緒に検証する」トーンのガイド文 */
export function buildAskGuide(route: AskRouteResult): string {
  const { question, keywords, results } = route;

  if (results.length === 0) {
    return (
      `「${question}」に直接一致する記事は見つかりませんでした。` +
      "正解を断定するのではなく、別のキーワードや /knowledge でも一緒に探してみましょう。"
    );
  }

  const keywordHint =
    keywords.length > 0 ? `（${keywords.join("・")}）` : "";

  return (
    `Knowledge Base から参考になりそうな記事を ${results.length} 件見つけました${keywordHint}。` +
    "これらは出発点です — その店の条件と照らし合わせながら、一緒に検証していきましょう。"
  );
}

export function buildAskSuccessResponse(
  route: AskRouteResult,
): AskKnowledgeSearchSuccessResponse {
  return {
    success: true,
    mode: "knowledge_search",
    aiUsed: false,
    question: route.question,
    keywords: route.keywords,
    guide: buildAskGuide(route),
    candidates: route.results.map(mapCandidate),
  };
}

export function tierLabel(tier: AskCandidate["tier"]): string {
  switch (tier) {
    case 1:
      return "Tier 1 公式";
    case 2:
      return "Tier 2 科学";
    case 3:
      return "Tier 3 Intelligence";
    case 4:
      return "Tier 4 用語";
    case 5:
      return "Tier 5 職人";
  }
}
