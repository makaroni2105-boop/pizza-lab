"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import type {
  AskApiResponse,
  AskKnowledgeSearchSuccessResponse,
  AskLlmSuccessResponse,
  AskSourceCitation,
} from "@/lib/ask/ask-types";
import {
  buildAskClientContextPayload,
  resolveAskClientShopId,
  summarizeAskClientContext,
  type AskClientContextSummary,
} from "@/lib/ask/ask-client-context";
import { tierLabel } from "@/lib/ask/ask-response";

import styles from "./ask.module.css";

type AskViewResponse =
  | { kind: "knowledge_search"; data: AskKnowledgeSearchSuccessResponse }
  | { kind: "llm_rag"; data: AskLlmSuccessResponse };

function sourceTypeLabel(type: AskSourceCitation["type"]): string {
  switch (type) {
    case "knowledge":
      return "Knowledge";
    case "run":
      return "Run";
    case "journal":
      return "Journal";
    case "comparison":
      return "Comparison";
    case "dna":
      return "DNA";
    case "die":
      return "DIE";
    case "blend":
      return "Blend";
  }
}

export function AskView() {
  const [question, setQuestion] = useState("");
  const [useResearchPartner, setUseResearchPartner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AskViewResponse | null>(null);
  const [contextSummary, setContextSummary] = useState<AskClientContextSummary | null>(
    null,
  );

  const shopId = useMemo(() => resolveAskClientShopId(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);
    setContextSummary(null);

    try {
      const body: Record<string, unknown> = { question };

      if (useResearchPartner) {
        const contextPayload = buildAskClientContextPayload(shopId);
        setContextSummary(summarizeAskClientContext(contextPayload));
        body.useLlm = true;
        body.shopId = shopId;
        body.context = contextPayload;
      }

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as AskApiResponse;

      if (!json.success) {
        setError(json.error.message);
        return;
      }

      if (json.mode === "llm_rag") {
        setResponse({ kind: "llm_rag", data: json });
        return;
      }

      if (json.mode === "knowledge_search") {
        setResponse({ kind: "knowledge_search", data: json });
      }
    } catch {
      setError("通信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  const submitLabel = useResearchPartner
    ? loading
      ? "回答を組み立て中…"
      : "研究パートナーに相談（mock）"
    : loading
      ? "検索中…"
      : "記事を探す";

  return (
    <div className={styles.ask}>
      <header className={styles.header}>
        <h1>Ask</h1>
        <p>
          研究パートナーとして相談を受け付けます。通常は Knowledge
          記事検索。必要なときだけ mock 研究パートナー回答を opt-in できます。
        </p>
      </header>

      <nav className={styles.nav}>
        <Link href="/quick">Quick Mode</Link>
        <Link href="/knowledge">Knowledge</Link>
        <Link href="/calculator">Calculator</Link>
      </nav>

      <span
        className={
          useResearchPartner ? `${styles.badge} ${styles.badgeMock}` : styles.badge
        }
      >
        {useResearchPartner
          ? "研究パートナー（mock）· AI 使用"
          : "Knowledge 検索のみ · AI 未使用"}
      </span>

      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={useResearchPartner}
          onChange={(event) => {
            setUseResearchPartner(event.target.checked);
            setResponse(null);
            setError(null);
          }}
        />
        <span className={styles.toggleText}>
          研究パートナー回答を使う（mock）
        </span>
      </label>

      {useResearchPartner ? (
        <p className={styles.toggleNote}>
          外部 LLM は使いません。MockLLMAdapter
          による研究パートナー回答です。DIE 数値は参照のみで上書きしません。
        </p>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="ask-question">相談内容</label>
          <textarea
            id="ask-question"
            className={styles.textarea}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="例: 冷蔵発酵の時間、DDT が合わない、加水率と食感の関係"
            aria-label="相談内容"
          />
        </div>
        <button
          className={styles.submit}
          type="submit"
          disabled={loading || question.trim().length === 0}
        >
          {submitLabel}
        </button>
      </form>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {contextSummary && response?.kind === "llm_rag" ? (
        <p className={styles.contextMeta}>
          送信コンテキスト: {contextSummary.profileName ?? contextSummary.shopId}
          {" · "}
          Run {contextSummary.learningRuns} / Lab {contextSummary.labSessions} /
          DNA {contextSummary.doughDnas} / Blend {contextSummary.flourBlends} /
          Journal {contextSummary.journals} / Compare {contextSummary.comparisons}
        </p>
      ) : null}

      {response?.kind === "knowledge_search" ? (
        <KnowledgeSearchResults response={response.data} />
      ) : null}

      {response?.kind === "llm_rag" ? (
        <LlmRagResults response={response.data} />
      ) : null}

      <p className={styles.note}>
        {useResearchPartner
          ? "mock 回答は研究の出発点です。断定ではなく、その店の記録と照らし合わせて一緒に検証してください。"
          : "回答は Knowledge Base の抜粋です。断定ではなく、その店の条件と照らし合わせて一緒に検証してください。"}
      </p>
    </div>
  );
}

function KnowledgeSearchResults({
  response,
}: {
  response: AskKnowledgeSearchSuccessResponse;
}) {
  return (
    <>
      <p className={styles.guide}>{response.guide}</p>

      {response.keywords.length > 0 ? (
        <p className={styles.meta}>
          キーワード: {response.keywords.join(" · ")}
        </p>
      ) : null}

      {response.candidates.length === 0 ? (
        <p className={styles.empty}>
          該当記事がありません。/knowledge から直接探すこともできます。
        </p>
      ) : (
        <div className={styles.list}>
          {response.candidates.map((candidate) => (
            <article key={candidate.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{candidate.titleJa}</h2>
                <span className={styles.tierBadge}>
                  {tierLabel(candidate.tier)}
                </span>
              </div>
              <p className={styles.category}>{candidate.category}</p>
              <p className={styles.excerpt}>{candidate.excerpt}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function LlmRagResults({ response }: { response: AskLlmSuccessResponse }) {
  return (
    <section className={styles.llmSection} aria-label="研究パートナー回答">
      <div className={styles.llmHeader}>
        <span className={styles.badgeAi}>AI 生成 · mock</span>
        <span className={styles.modeBadge}>mode: {response.mode}</span>
      </div>

      <div className={styles.answerBlock}>
        <h2 className={styles.sectionTitle}>研究パートナー回答</h2>
        <p className={styles.answerText}>{response.answer}</p>
        <p className={styles.mockNote}>
          provider: {response.provider} / model: {response.model}
        </p>
      </div>

      {response.nextStep ? (
        <div className={styles.nextStepCard}>
          <h3 className={styles.sectionSubtitle}>次の一枚</h3>
          <p>{response.nextStep}</p>
        </div>
      ) : null}

      {response.sources.length > 0 ? (
        <div className={styles.sourcesBlock}>
          <h3 className={styles.sectionSubtitle}>出典</h3>
          <ul className={styles.sourcesList}>
            {response.sources.map((source) => (
              <li key={`${source.type}-${source.id}`}>
                <span className={styles.sourceType}>
                  {sourceTypeLabel(source.type)}
                </span>
                {source.href ? (
                  <Link href={source.href}>{source.label}</Link>
                ) : (
                  <span>{source.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {response.disclaimers.length > 0 ? (
        <div className={styles.disclaimersBlock}>
          <h3 className={styles.sectionSubtitle}>注意</h3>
          <ul className={styles.noticeList}>
            {response.disclaimers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {response.warnings.length > 0 ? (
        <div className={styles.warningsBlock}>
          <h3 className={styles.sectionSubtitle}>安全チェック</h3>
          <ul className={styles.noticeList}>
            {response.warnings.map((warning) => (
              <li key={`${warning.code}-${warning.message}`}>{warning.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
