"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  computeActualFrictionC,
  computeDdtErrorC,
  computeFrictionErrorC,
  sortRunsByRecordedAt,
} from "@/lib/learning/learning-run";
import {
  deleteLearningRun,
  listLearningRuns,
  persistProfileLearningFromRuns,
} from "@/lib/learning/learning-storage";
import {
  LEARNING_HIGH_CONFIDENCE_RUN_COUNT,
  LEARNING_MIN_RUN_COUNT,
  type LearningRun,
} from "@/lib/learning/learning-types";
import { getDemoShopProfile } from "@/lib/profile/demo-profiles";
import { getProfile } from "@/lib/profile/profile-storage";

import styles from "./history.module.css";

interface LearningStatus {
  label: string;
  className: string;
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatTemp(value: number): string {
  return `${value.toFixed(1)}°C`;
}

function formatSignedTemp(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}°C`;
}

function resolveShopName(shopId: string): string {
  const saved = getProfile(shopId);
  if (saved) {
    return saved.name;
  }

  const demo = getDemoShopProfile(shopId);
  if (demo) {
    return `${demo.name}（サンプル）`;
  }

  return shopId;
}

function getLearningStatus(runCount: number): LearningStatus {
  if (runCount >= LEARNING_HIGH_CONFIDENCE_RUN_COUNT) {
    return {
      label: "信頼度高 — 研究記録が十分に蓄積されています",
      className: styles.statusHigh,
    };
  }

  if (runCount >= LEARNING_MIN_RUN_COUNT) {
    return {
      label: "補正適用中 — 摩擦補正が反映される状態です",
      className: styles.statusActive,
    };
  }

  return {
    label: "学習中 — あと少しで補正が反映されます",
    className: styles.statusLearning,
  };
}

function RunCard({
  run,
  shopName,
  onDelete,
}: {
  run: LearningRun;
  shopName: string;
  onDelete: (run: LearningRun) => void;
}) {
  const actualFrictionC = computeActualFrictionC(
    run.actualDoughTempC,
    run.snapshot,
  );
  const frictionErrorC = computeFrictionErrorC(run);
  const ddtErrorC = computeDdtErrorC(run);
  const hasDdt = run.targetDdtC !== undefined && Number.isFinite(ddtErrorC);

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>研究記録</h3>
          <p className={styles.cardDate}>{formatDateTime(run.recordedAt)}</p>
          <p className={styles.shopLabel}>{shopName}</p>
        </div>
      </div>

      <dl className={styles.grid}>
        <dt>実測生地温</dt>
        <dd>{formatTemp(run.actualDoughTempC)}</dd>

        {run.targetDdtC !== undefined ? (
          <>
            <dt>目標 DDT</dt>
            <dd>{formatTemp(run.targetDdtC)}</dd>
          </>
        ) : null}

        {hasDdt ? (
          <>
            <dt>DDT 誤差</dt>
            <dd>{formatSignedTemp(ddtErrorC)}</dd>
          </>
        ) : null}

        <dt>予測摩擦</dt>
        <dd>{formatTemp(run.predictedFrictionC)}</dd>

        <dt>実測摩擦</dt>
        <dd>{formatTemp(actualFrictionC)}</dd>

        <dt>摩擦誤差</dt>
        <dd>{formatSignedTemp(frictionErrorC)}</dd>

        {run.craftsmanScore !== undefined ? (
          <>
            <dt>100点に近さ</dt>
            <dd>{run.craftsmanScore} / 5</dd>
          </>
        ) : null}
      </dl>

      {run.memo ? (
        <p className={styles.memo}>メモ: {run.memo}</p>
      ) : null}

      <button
        className={styles.deleteButton}
        type="button"
        onClick={() => onDelete(run)}
      >
        この記録を削除
      </button>
    </article>
  );
}

export function HistoryView() {
  const [runs, setRuns] = useState<LearningRun[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const allRuns = listLearningRuns();
    setRuns(sortRunsByRecordedAt(allRuns).reverse());
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);
  }, [refresh]);

  const runsByShop = useMemo(() => {
    const map = new Map<string, LearningRun[]>();

    for (const run of runs) {
      const existing = map.get(run.shopId) ?? [];
      existing.push(run);
      map.set(run.shopId, existing);
    }

    return map;
  }, [runs]);

  const totalRunCount = runs.length;
  const overallStatus = getLearningStatus(totalRunCount);

  function handleDelete(run: LearningRun) {
    const shopName = resolveShopName(run.shopId);

    if (
      !window.confirm(
        `${shopName} の ${formatDateTime(run.recordedAt)} の記録を削除しますか？`,
      )
    ) {
      return;
    }

    deleteLearningRun(run.id);
    persistProfileLearningFromRuns(run.shopId);
    refresh();
  }

  if (!ready) {
    return null;
  }

  return (
    <div className={styles.history}>
      <header className={styles.header}>
        <h1>Run History</h1>
        <p>
          保存された研究記録を確認できます。その店がどれだけ学習してきたかの参考になります。
        </p>
      </header>

      <nav className={styles.nav}>
        <Link href="/quick">Quick Mode</Link>
        <Link href="/profile">店舗プロファイル</Link>
      </nav>

      <section className={styles.summary} aria-label="学習状態">
        <h2>学習状態（この端末）</h2>
        <dl className={styles.summaryGrid}>
          <dt>研究記録数</dt>
          <dd>{totalRunCount} 件</dd>
          <dt>登録店舗数</dt>
          <dd>{runsByShop.size} 店舗</dd>
        </dl>
        {totalRunCount > 0 ? (
          <span className={`${styles.statusBadge} ${overallStatus.className}`}>
            {overallStatus.label}
          </span>
        ) : null}
      </section>

      {totalRunCount === 0 ? (
        <p className={styles.empty}>
          研究記録はまだありません。Quick Mode で今日の一枚を記録すると、ここに表示されます。
        </p>
      ) : (
        <>
          {[...runsByShop.entries()].map(([shopId, shopRuns]) => {
            const shopStatus = getLearningStatus(shopRuns.length);

            return (
              <section key={shopId} className={styles.shopGroup}>
                <h2 className={styles.shopGroupTitle}>
                  {resolveShopName(shopId)} — {shopRuns.length} 件
                </h2>
                <span
                  className={`${styles.statusBadge} ${shopStatus.className}`}
                  style={{ marginBottom: "0.75rem", display: "inline-block" }}
                >
                  {shopStatus.label}
                </span>
                <div className={styles.list}>
                  {shopRuns.map((run) => (
                    <RunCard
                      key={run.id}
                      run={run}
                      shopName={resolveShopName(shopId)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      <p className={styles.note}>
        データはこの端末のブラウザ（localStorage）にのみ保存されています。
      </p>
    </div>
  );
}
