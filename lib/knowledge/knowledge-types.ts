/**
 * Knowledge Base 型定義。
 * 正本: docs/schemas/knowledge-entry.schema.json（簡略版）
 */

export type KnowledgeTier = 1 | 2 | 3 | 4 | 5;

export type KnowledgeSummaryType =
  | "summary"
  | "practice"
  | "parameter"
  | "glossary"
  | "comparison";

export interface KnowledgeEntry {
  id: string;
  tier: KnowledgeTier;
  category: string;
  titleJa: string;
  summaryType: KnowledgeSummaryType;
  tags: string[];
  keywords: string[];
  aiUsable: boolean;
  /** Frontmatter 以降の Markdown 本文 */
  body: string;
  /** リポジトリ内相対パス */
  relativePath: string;
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry;
  score: number;
  excerpt: string;
}

export interface KnowledgeSearchOptions {
  limit?: number;
  excerptMaxLength?: number;
}
