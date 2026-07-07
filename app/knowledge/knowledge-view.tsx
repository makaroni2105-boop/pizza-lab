"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { searchKnowledgeEntries } from "@/lib/knowledge/knowledge-search";
import type { KnowledgeEntry } from "@/lib/knowledge/knowledge-types";

import styles from "./knowledge.module.css";

function tierLabel(tier: KnowledgeEntry["tier"]): string {
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

export function KnowledgeView({ entries }: { entries: KnowledgeEntry[] }) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const results = useMemo(
    () => searchKnowledgeEntries(entries, submittedQuery, { limit: 20 }),
    [entries, submittedQuery],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  }

  return (
    <div className={styles.knowledge}>
      <header className={styles.header}>
        <h1>Knowledge</h1>
        <p>
          公式・科学・実践の知識を参照できます。AI 回答ではなく、記事の抜粋を表示します。
        </p>
      </header>

      <nav className={styles.nav}>
        <Link href="/quick">Quick Mode</Link>
        <Link href="/die/history">Run History</Link>
      </nav>

      <form className={styles.searchForm} onSubmit={handleSubmit}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="例: 発酵, DDT, 粉, ミキサー"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="キーワード検索"
        />
        <button className={styles.searchButton} type="submit">
          検索
        </button>
      </form>

      <p className={styles.meta}>
        {submittedQuery
          ? `「${submittedQuery}」の結果 ${results.length} 件`
          : `全 ${entries.length} 件（キーワード未入力時は一覧）`}
      </p>

      {results.length === 0 ? (
        <p className={styles.empty}>
          該当する記事が見つかりませんでした。別のキーワードをお試しください。
        </p>
      ) : (
        <div className={styles.list}>
          {results.map(({ entry, excerpt }) => (
            <article key={entry.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{entry.titleJa}</h2>
                <span className={styles.tierBadge}>{tierLabel(entry.tier)}</span>
              </div>
              <p className={styles.category}>{entry.category}</p>
              <p className={styles.excerpt}>{excerpt}</p>
              {entry.tags.length > 0 ? (
                <div className={styles.tags}>
                  {entry.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <p className={styles.note}>
        STG / VPN / APN は尊重しますが、唯一の正解とはしません。粉は優劣ではなく個性として扱います。
      </p>
    </div>
  );
}
