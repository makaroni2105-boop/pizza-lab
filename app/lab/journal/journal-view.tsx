"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  createDoughJournal,
  createEmptyJournalBodySections,
  deleteDoughJournal,
  formatJournalBody,
  getJournalBodyPreview,
  listDoughJournals,
  parseJournalBody,
  saveDoughJournal,
  type DoughJournal,
  type JournalBodySections,
} from "@/lib/lab";
import type { CraftsmanMood, JournalEntryType } from "@/types/lab";
import {
  DEMO_SHOP_ID,
  getSelectedShopId,
} from "@/lib/profile/profile-storage";

import styles from "./journal.module.css";

const ENTRY_TYPE_LABELS: Record<JournalEntryType, string> = {
  observation: "観察",
  hypothesis: "仮説",
  procedure: "手順",
  reflection: "振り返り",
  reference: "参考",
};

const MOOD_LABELS: Record<CraftsmanMood, string> = {
  curious: "探求中",
  satisfied: "手応えあり",
  unsure: "まだ不明",
  breakthrough: "ひらめき",
};

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

export function JournalView() {
  const [entries, setEntries] = useState<DoughJournal[]>([]);
  const [shopId, setShopId] = useState(DEMO_SHOP_ID);
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState<DoughJournal | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editEntryType, setEditEntryType] = useState<JournalEntryType>("observation");
  const [editMood, setEditMood] = useState<CraftsmanMood | "">("");
  const [editSections, setEditSections] = useState<JournalBodySections>(
    createEmptyJournalBodySections(),
  );

  const refreshEntries = useCallback(() => {
    setEntries(listDoughJournals());
  }, []);

  useEffect(() => {
    setShopId(getSelectedShopId() ?? DEMO_SHOP_ID);
    refreshEntries();
  }, [refreshEntries]);

  function startEditing(entry: DoughJournal) {
    setEditing(entry);
    setEditTitle(entry.title);
    setEditEntryType(entry.entryType);
    setEditMood(entry.craftsmanMood ?? "");
    setEditSections(parseJournalBody(entry.body));
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const draft = createDoughJournal({
      shopId,
      title: newTitle,
    });

    const result = saveDoughJournal(draft);

    if (!result.ok) {
      window.alert(result.errors.join("\n"));
      return;
    }

    setNewTitle("");
    refreshEntries();
    startEditing(result.entry);
  }

  function updateSection(key: keyof JournalBodySections, value: string) {
    setEditSections((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSaveEditor() {
    if (!editing) {
      return;
    }

    const nextEntry: DoughJournal = {
      ...editing,
      title: editTitle.trim() || "無題の研究ノート",
      entryType: editEntryType,
      craftsmanMood: editMood || undefined,
      body: formatJournalBody(editSections),
    };

    const result = saveDoughJournal(nextEntry);

    if (!result.ok) {
      window.alert(result.errors.join("\n"));
      return;
    }

    setEditing(result.entry);
    refreshEntries();
  }

  function handleDelete(id: string) {
    if (!window.confirm("この研究ノートを削除しますか？")) {
      return;
    }

    deleteDoughJournal(id);

    if (editing?.id === id) {
      setEditing(null);
    }

    refreshEntries();
  }

  return (
    <div className={styles.journal}>
      <header className={styles.header}>
        <h1>Dough Journal</h1>
        <p>
          評価ではなく、研究ノート。観察と仮説を残し、次の一枚へつなげるための記録です。
        </p>
      </header>

      <nav className={styles.nav}>
        <Link href="/lab">Lab Mode</Link>
        <Link href="/lab/dna">Dough DNA</Link>
        <Link href="/lab/blend">Flour Blend</Link>
        <Link href="/lab/comparison">Comparison</Link>
        <Link href="/quick">Quick Mode</Link>
        <Link href="/calculator">Calculator</Link>
        <Link href="/ask">Ask</Link>
        <Link href="/knowledge">Knowledge</Link>
      </nav>

      <span className={styles.badge}>研究ノート · 観察 · 仮説 · 次の一枚</span>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>新しい研究ノート</h2>
        <p className={styles.sectionNote}>
          まずはタイトルだけで下書きを作り、観察・仮説・手順・結果・次に試すことを足していきます。
        </p>

        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.field}>
            <label htmlFor="journal-title">タイトル</label>
            <input
              id="journal-title"
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="例: 冷蔵24h · コルニチョーネ観察"
            />
          </div>

          <button className={styles.submit} type="submit">
            研究ノートを作成
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>研究ノート一覧</h2>
        <p className={styles.meta}>
          {entries.length} 件 · 店舗 ID: {shopId}
        </p>

        {entries.length === 0 ? (
          <p className={styles.empty}>
            まだ研究ノートがありません。上のフォームから、観察の記録を始めてください。
          </p>
        ) : (
          <div className={styles.list}>
            {entries.map((entry) => (
              <article
                key={entry.id}
                className={`${styles.card} ${editing?.id === entry.id ? styles.cardActive : ""}`}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{entry.title}</h3>
                  <span className={styles.typeBadge}>{ENTRY_TYPE_LABELS[entry.entryType]}</span>
                </div>

                <p className={styles.cardPreview}>{getJournalBodyPreview(entry.body)}</p>

                <p className={styles.cardMeta}>
                  {entry.craftsmanMood ? `${MOOD_LABELS[entry.craftsmanMood]} · ` : ""}
                  更新 {formatDateTime(entry.updatedAt)}
                </p>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => startEditing(entry)}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(entry.id)}
                  >
                    削除
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>編集 — {editing.title}</h2>
          <p className={styles.sectionNote}>
            正解を急がず、事実と仮説を分けて残します。記録はその店の研究資産です。
          </p>

          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="edit-title">タイトル</label>
              <input
                id="edit-title"
                type="text"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-entry-type">記録タイプ</label>
              <select
                id="edit-entry-type"
                value={editEntryType}
                onChange={(event) => setEditEntryType(event.target.value as JournalEntryType)}
              >
                <option value="observation">観察 — 焼成後・食べた後のメモ</option>
                <option value="hypothesis">仮説 — 次回への問い</option>
                <option value="procedure">手順 — Lab 独自の操作メモ</option>
                <option value="reflection">振り返り — その店100点との距離</option>
                <option value="reference">参考 — 文献・動画・職人メモ</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-mood">いまの手応え（任意）</label>
              <select
                id="edit-mood"
                value={editMood}
                onChange={(event) => setEditMood(event.target.value as CraftsmanMood | "")}
              >
                <option value="">未設定</option>
                <option value="curious">探求中 — まだ試したいことがある</option>
                <option value="satisfied">手応えあり — 方向性が見えた</option>
                <option value="unsure">まだ不明 — 判断を保留</option>
                <option value="breakthrough">ひらめき — 次の一手が見えた</option>
              </select>
              <small>評価点ではなく、研究の手応えです。</small>
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-observation">観察</label>
              <textarea
                id="edit-observation"
                value={editSections.observation}
                onChange={(event) => updateSection("observation", event.target.value)}
                placeholder="例: コルニチョーネは高く、中心はやや重い"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-hypothesis">仮説</label>
              <textarea
                id="edit-hypothesis"
                value={editSections.hypothesis}
                onChange={(event) => updateSection("hypothesis", event.target.value)}
                placeholder="例: 加水を 1% 下げれば中心が軽くなるか"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-procedure">手順</label>
              <textarea
                id="edit-procedure"
                value={editSections.procedure}
                onChange={(event) => updateSection("procedure", event.target.value)}
                placeholder="例: 室温 22°C · 6h 発酵 · 250°C 石窯"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-result">結果</label>
              <textarea
                id="edit-result"
                value={editSections.result}
                onChange={(event) => updateSection("result", event.target.value)}
                placeholder="例: 中心はまだやや重いが、香りは良い"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-next-try">次に試すこと</label>
              <textarea
                id="edit-next-try"
                value={editSections.nextTry}
                onChange={(event) => updateSection("nextTry", event.target.value)}
                placeholder="例: 酵母 0.05% 減 · 冷蔵を 2h 延長"
              />
              <small>次の一枚への接続。ここが研究ノートの核心です。</small>
            </div>
          </div>

          <div className={styles.editorActions}>
            <button className={styles.submit} type="button" onClick={handleSaveEditor}>
              変更を保存
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => setEditing(null)}
            >
              編集を閉じる
            </button>
          </div>
        </section>
      ) : null}

      <p className={styles.footerNote}>
        データはこのブラウザの localStorage（pizzalab-journal-v1）にのみ保存されます。D1 /
        本番 DB にはまだ送りません。
      </p>
    </div>
  );
}
