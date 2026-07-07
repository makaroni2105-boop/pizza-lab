"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  createLabSessionDraft,
  deleteLabSession,
  listLabSessions,
  saveLabSession,
  type LabSession,
} from "@/lib/lab";
import {
  DEMO_SHOP_ID,
  getSelectedShopId,
} from "@/lib/profile/profile-storage";

import styles from "./lab.module.css";

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusLabel(status: LabSession["status"]): string {
  switch (status) {
    case "draft":
      return "下書き";
    case "running":
      return "進行中";
    case "completed":
      return "完了";
    case "archived":
      return "アーカイブ";
  }
}

export function LabView() {
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [shopId, setShopId] = useState(DEMO_SHOP_ID);
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");

  const refreshSessions = useCallback(() => {
    setSessions(listLabSessions());
  }, []);

  useEffect(() => {
    setShopId(getSelectedShopId() ?? DEMO_SHOP_ID);
    refreshSessions();
  }, [refreshSessions]);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const draft = createLabSessionDraft({
      shopId,
      title,
      hypothesis,
    });

    saveLabSession(draft);
    setTitle("");
    setHypothesis("");
    refreshSessions();
  }

  function handleDelete(id: string) {
    if (!window.confirm("この研究ノートを削除しますか？")) {
      return;
    }

    deleteLabSession(id);
    refreshSessions();
  }

  return (
    <div className={styles.lab}>
      <header className={styles.header}>
        <h1>Lab Mode</h1>
        <p>
          その店の100点に近づくための研究ノート。Quick Mode とは別の、じっくり検証する場所です。
        </p>
      </header>

      <nav className={styles.nav}>
        <Link href="/lab/dna">Dough DNA</Link>
        <Link href="/lab/blend">Flour Blend</Link>
        <Link href="/lab/journal">Journal</Link>
        <Link href="/lab/comparison">Comparison</Link>
        <Link href="/quick">Quick Mode</Link>
        <Link href="/calculator">Calculator</Link>
        <Link href="/ask">Ask</Link>
        <Link href="/knowledge">Knowledge</Link>
      </nav>

      <span className={styles.badge}>研究ノート · 比較 · その店の100点</span>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>新しい研究ノート</h2>
        <p className={styles.sectionNote}>
          まずは仮説とタイトルだけで下書きを残せます。DIE 計算・比較はこのあと追加します。
          <Link href="/lab/dna"> その店の100点（Dough DNA）</Link>
          、
          <Link href="/lab/blend"> 粉の個性（Flour Blend）</Link>
          、
          <Link href="/lab/journal"> 研究ノート（Journal）</Link>
          、
          <Link href="/lab/comparison"> 比較（Comparison）</Link>
          も別途編集できます。
        </p>

        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.field}>
            <label htmlFor="lab-title">タイトル</label>
            <input
              id="lab-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例: VPN 65% 加水 · 24h 冷蔵"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="lab-hypothesis">仮説（任意）</label>
            <textarea
              id="lab-hypothesis"
              value={hypothesis}
              onChange={(event) => setHypothesis(event.target.value)}
              placeholder="例: コルニチョーネを高く保ちつつ中心を軽くできるか"
            />
            <small>正解を決めつけず、一緒に検証するメモとして残します。</small>
          </div>

          <button className={styles.submit} type="submit">
            研究ノートを下書き保存
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>研究ノート一覧</h2>
        <p className={styles.meta}>
          {sessions.length} 件 · 店舗 ID: {shopId}
        </p>

        {sessions.length === 0 ? (
          <p className={styles.empty}>
            まだ研究ノートがありません。上のフォームから下書きを作成してください。
          </p>
        ) : (
          <div className={styles.list}>
            {sessions.map((session) => (
              <article key={session.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{session.title ?? "無題の研究ノート"}</h3>
                  <span className={styles.statusBadge}>{statusLabel(session.status)}</span>
                </div>

                {session.hypothesis ? (
                  <p className={styles.cardHypothesis}>{session.hypothesis}</p>
                ) : null}

                <p className={styles.cardMeta}>
                  更新 {formatDateTime(session.updatedAt)}
                  {session.comparisonIds.length === 0 ? " · 比較: 未作成" : ""}
                </p>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(session.id)}
                  >
                    削除
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className={styles.footerNote}>
        データはこのブラウザの localStorage にのみ保存されます。D1 / 本番 DB にはまだ送りません。
      </p>
    </div>
  );
}
