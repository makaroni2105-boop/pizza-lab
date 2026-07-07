"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  applySideDraftToComparisonSide,
  buildComparisonDimensions,
  comparisonSideDraftFromSide,
  createComparisonRun,
  createEmptyComparisonSideDraft,
  deleteComparisonRun,
  generateComparisonDimensionKey,
  getComparisonObservation,
  getComparisonPreview,
  getSideMemo,
  getUserComparisonDimensions,
  listComparisonRuns,
  saveComparisonRun,
  type ComparisonDimensionDraft,
  type ComparisonRun,
  type ComparisonSideDraft,
} from "@/lib/lab";
import type { ComparisonStatus } from "@/types/lab";
import {
  DEMO_SHOP_ID,
  getSelectedShopId,
} from "@/lib/profile/profile-storage";

import styles from "./comparison.module.css";

const STATUS_LABELS: Record<ComparisonStatus, string> = {
  draft: "下書き",
  ready: "比較準備",
  concluded: "記録済み",
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

function createEmptyDimensionDraft(): ComparisonDimensionDraft {
  return {
    key: generateComparisonDimensionKey(),
    label: "",
    valueA: "",
    valueB: "",
  };
}

export function ComparisonView() {
  const [runs, setRuns] = useState<ComparisonRun[]>([]);
  const [shopId, setShopId] = useState(DEMO_SHOP_ID);
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState<ComparisonRun | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState<ComparisonStatus>("draft");
  const [editHypothesis, setEditHypothesis] = useState("");
  const [editObservation, setEditObservation] = useState("");
  const [editConclusion, setEditConclusion] = useState("");
  const [editNextSteps, setEditNextSteps] = useState("");
  const [editSideA, setEditSideA] = useState<ComparisonSideDraft>(
    createEmptyComparisonSideDraft("Side A"),
  );
  const [editSideB, setEditSideB] = useState<ComparisonSideDraft>(
    createEmptyComparisonSideDraft("Side B"),
  );
  const [editDimensions, setEditDimensions] = useState<ComparisonDimensionDraft[]>([
    createEmptyDimensionDraft(),
  ]);

  const refreshRuns = useCallback(() => {
    setRuns(listComparisonRuns());
  }, []);

  useEffect(() => {
    setShopId(getSelectedShopId() ?? DEMO_SHOP_ID);
    refreshRuns();
  }, [refreshRuns]);

  function startEditing(run: ComparisonRun) {
    setEditing(run);
    setEditTitle(run.title);
    setEditStatus(run.status);
    setEditHypothesis(run.hypothesis ?? "");
    setEditObservation(getComparisonObservation(run.dimensions));
    setEditConclusion(run.conclusion ?? "");
    setEditNextSteps(run.nextSteps ?? "");

    const sideA = comparisonSideDraftFromSide(run.sideA);
    sideA.memo = getSideMemo(run.dimensions, "A");
    setEditSideA(sideA);

    const sideB = comparisonSideDraftFromSide(run.sideB);
    sideB.memo = getSideMemo(run.dimensions, "B");
    setEditSideB(sideB);

    const userDimensions = getUserComparisonDimensions(run.dimensions);
    setEditDimensions(userDimensions.length > 0 ? userDimensions : [createEmptyDimensionDraft()]);
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const draft = createComparisonRun({
      shopId,
      title: newTitle,
    });

    const result = saveComparisonRun(draft);

    if (!result.ok) {
      window.alert(result.errors.join("\n"));
      return;
    }

    setNewTitle("");
    refreshRuns();
    startEditing(result.run);
  }

  function updateDimension(key: string, patch: Partial<ComparisonDimensionDraft>) {
    setEditDimensions((current) =>
      current.map((dimension) => (dimension.key === key ? { ...dimension, ...patch } : dimension)),
    );
  }

  function handleAddDimension() {
    setEditDimensions((current) => [...current, createEmptyDimensionDraft()]);
  }

  function handleRemoveDimension(key: string) {
    setEditDimensions((current) => {
      const next = current.filter((dimension) => dimension.key !== key);
      return next.length > 0 ? next : [createEmptyDimensionDraft()];
    });
  }

  function handleSaveEditor() {
    if (!editing) {
      return;
    }

    const nextRun: ComparisonRun = {
      ...editing,
      title: editTitle.trim() || "無題の比較",
      status: editStatus,
      sideA: applySideDraftToComparisonSide(editSideA),
      sideB: applySideDraftToComparisonSide(editSideB),
      dimensions: buildComparisonDimensions({
        userDimensions: editDimensions,
        sideAMemo: editSideA.memo,
        sideBMemo: editSideB.memo,
        observation: editObservation,
      }),
      hypothesis: editHypothesis.trim() || null,
      conclusion: editConclusion.trim() || null,
      nextSteps: editNextSteps.trim() || null,
    };

    const result = saveComparisonRun(nextRun);

    if (!result.ok) {
      window.alert(result.errors.join("\n"));
      return;
    }

    setEditing(result.run);
    refreshRuns();
  }

  function handleDelete(id: string) {
    if (!window.confirm("この比較記録を削除しますか？")) {
      return;
    }

    deleteComparisonRun(id);

    if (editing?.id === id) {
      setEditing(null);
    }

    refreshRuns();
  }

  return (
    <div className={styles.comparison}>
      <header className={styles.header}>
        <h1>Comparison</h1>
        <p>
          勝ち負けではなく、違いを見る。昨日と今日、A 配合と B 配合、大会用と営業用——次の一枚へつなげる比較記録です。
        </p>
      </header>

      <nav className={styles.nav}>
        <Link href="/lab">Lab Mode</Link>
        <Link href="/lab/dna">Dough DNA</Link>
        <Link href="/lab/blend">Flour Blend</Link>
        <Link href="/lab/journal">Journal</Link>
        <Link href="/quick">Quick Mode</Link>
        <Link href="/calculator">Calculator</Link>
        <Link href="/ask">Ask</Link>
        <Link href="/knowledge">Knowledge</Link>
      </nav>

      <span className={styles.badge}>違いを見る · 比較 · 次の一枚</span>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>新しい比較</h2>
        <p className={styles.sectionNote}>
          まずは比較タイトルだけで下書きを作り、Side A / Side B と観点を足していきます。
        </p>

        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.field}>
            <label htmlFor="comparison-title">比較タイトル</label>
            <input
              id="comparison-title"
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="例: 昨日 vs 今日 · 65% vs 62%"
            />
          </div>

          <button className={styles.submit} type="submit">
            比較記録を作成
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>比較一覧</h2>
        <p className={styles.meta}>
          {runs.length} 件 · 店舗 ID: {shopId}
        </p>

        {runs.length === 0 ? (
          <p className={styles.empty}>
            まだ比較記録がありません。上のフォームから、違いを見る記録を始めてください。
          </p>
        ) : (
          <div className={styles.list}>
            {runs.map((run) => (
              <article
                key={run.id}
                className={`${styles.card} ${editing?.id === run.id ? styles.cardActive : ""}`}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{run.title}</h3>
                  <span className={styles.statusBadge}>{STATUS_LABELS[run.status]}</span>
                </div>

                <p className={styles.cardPreview}>{getComparisonPreview(run)}</p>

                <p className={styles.cardMeta}>
                  {run.sideA.label} vs {run.sideB.label} · 更新 {formatDateTime(run.updatedAt)}
                </p>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => startEditing(run)}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(run.id)}
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
            どちらが正解かではなく、うちの100点に近いのはどちらか——職人の言葉で残します。
          </p>

          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="edit-title">比較タイトル</label>
              <input
                id="edit-title"
                type="text"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-status">ステータス</label>
              <select
                id="edit-status"
                value={editStatus}
                onChange={(event) => setEditStatus(event.target.value as ComparisonStatus)}
              >
                <option value="draft">下書き</option>
                <option value="ready">比較準備</option>
                <option value="concluded">記録済み</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-hypothesis">仮説</label>
              <textarea
                id="edit-hypothesis"
                value={editHypothesis}
                onChange={(event) => setEditHypothesis(event.target.value)}
                placeholder="例: 加水 3% 差で中心の軽さが変わるか"
              />
            </div>
          </div>

          <div className={styles.sideGrid}>
            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}>Side A</h3>
              <div className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="side-a-name">名前</label>
                  <input
                    id="side-a-name"
                    type="text"
                    value={editSideA.label}
                    onChange={(event) =>
                      setEditSideA((current) => ({ ...current, label: event.target.value }))
                    }
                    placeholder="例: 昨日 · 大会用 · A 配合"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="side-a-memo">メモ</label>
                  <textarea
                    id="side-a-memo"
                    value={editSideA.memo}
                    onChange={(event) =>
                      setEditSideA((current) => ({ ...current, memo: event.target.value }))
                    }
                    placeholder="例: VPN 65% · 24h 冷蔵"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="side-a-ref">参照 ID（任意）</label>
                  <input
                    id="side-a-ref"
                    type="text"
                    value={editSideA.refId}
                    onChange={(event) =>
                      setEditSideA((current) => ({ ...current, refId: event.target.value }))
                    }
                    placeholder="lab-... または run-..."
                  />
                  <select
                    aria-label="Side A 参照タイプ"
                    value={editSideA.refType}
                    onChange={(event) =>
                      setEditSideA((current) => ({
                        ...current,
                        refType: event.target.value as ComparisonSideDraft["refType"],
                      }))
                    }
                  >
                    <option value="">自動判定</option>
                    <option value="session">Lab Session</option>
                    <option value="run">Learning Run</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}>Side B</h3>
              <div className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="side-b-name">名前</label>
                  <input
                    id="side-b-name"
                    type="text"
                    value={editSideB.label}
                    onChange={(event) =>
                      setEditSideB((current) => ({ ...current, label: event.target.value }))
                    }
                    placeholder="例: 今日 · 営業用 · B 配合"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="side-b-memo">メモ</label>
                  <textarea
                    id="side-b-memo"
                    value={editSideB.memo}
                    onChange={(event) =>
                      setEditSideB((current) => ({ ...current, memo: event.target.value }))
                    }
                    placeholder="例: 62% · 6h 室温"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="side-b-ref">参照 ID（任意）</label>
                  <input
                    id="side-b-ref"
                    type="text"
                    value={editSideB.refId}
                    onChange={(event) =>
                      setEditSideB((current) => ({ ...current, refId: event.target.value }))
                    }
                    placeholder="lab-... または run-..."
                  />
                  <select
                    aria-label="Side B 参照タイプ"
                    value={editSideB.refType}
                    onChange={(event) =>
                      setEditSideB((current) => ({
                        ...current,
                        refType: event.target.value as ComparisonSideDraft["refType"],
                      }))
                    }
                  >
                    <option value="">自動判定</option>
                    <option value="session">Lab Session</option>
                    <option value="run">Learning Run</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <h3 className={styles.sectionTitle}>比較したい観点</h3>
          <p className={styles.sectionNote}>
            Side A と Side B で何が違ったか、数値でも言葉でも構いません。
          </p>

          <div className={styles.dimensionList}>
            {editDimensions.map((dimension, index) => (
              <div key={dimension.key} className={styles.dimensionCard}>
                <div className={styles.dimensionHeader}>
                  <h4 className={styles.dimensionTitle}>観点 {index + 1}</h4>
                  {editDimensions.length > 1 ? (
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleRemoveDimension(dimension.key)}
                    >
                      削除
                    </button>
                  ) : null}
                </div>

                <div className={styles.form}>
                  <div className={styles.field}>
                    <label htmlFor={`dimension-label-${dimension.key}`}>観点</label>
                    <input
                      id={`dimension-label-${dimension.key}`}
                      type="text"
                      value={dimension.label}
                      onChange={(event) =>
                        updateDimension(dimension.key, { label: event.target.value })
                      }
                      placeholder="例: 加水率 / 中心の軽さ / コルニチョーネ"
                    />
                  </div>

                  <div className={styles.sideValues}>
                    <div className={styles.field}>
                      <label htmlFor={`dimension-a-${dimension.key}`}>Side A</label>
                      <input
                        id={`dimension-a-${dimension.key}`}
                        type="text"
                        value={dimension.valueA}
                        onChange={(event) =>
                          updateDimension(dimension.key, { valueA: event.target.value })
                        }
                        placeholder="65%"
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor={`dimension-b-${dimension.key}`}>Side B</label>
                      <input
                        id={`dimension-b-${dimension.key}`}
                        type="text"
                        value={dimension.valueB}
                        onChange={(event) =>
                          updateDimension(dimension.key, { valueB: event.target.value })
                        }
                        placeholder="62%"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className={styles.addButton} onClick={handleAddDimension}>
            + 観点を追加
          </button>

          <div className={styles.form} style={{ marginTop: "1rem" }}>
            <div className={styles.field}>
              <label htmlFor="edit-observation">観察</label>
              <textarea
                id="edit-observation"
                value={editObservation}
                onChange={(event) => setEditObservation(event.target.value)}
                placeholder="例: Side A の方が中心が軽く、Side B は香りが強い"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-conclusion">結論</label>
              <textarea
                id="edit-conclusion"
                value={editConclusion}
                onChange={(event) => setEditConclusion(event.target.value)}
                placeholder="例: うちの100点には Side A の方が近い。ただし香りは B が良い"
              />
              <small>断定は職人の言葉で。正解を一つに決めなくて構いません。</small>
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-next-steps">次に試すこと</label>
              <textarea
                id="edit-next-steps"
                value={editNextSteps}
                onChange={(event) => setEditNextSteps(event.target.value)}
                placeholder="例: Side A の加水で Side B の粉を 10% ブレンド"
              />
              <small>次の一枚への接続。</small>
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
        データはこのブラウザの localStorage（pizzalab-comparisons-v1）にのみ保存されます。D1 /
        本番 DB にはまだ送りません。
      </p>
    </div>
  );
}
