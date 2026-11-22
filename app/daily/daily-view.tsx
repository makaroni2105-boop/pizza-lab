"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  canStartConfirmRecord,
  createDailyPrepConfirmToken,
  isDailyPrepAdjustmentActive,
  mapFlourUsageConfirmToUiState,
  type DailyPrepConfirmUiState,
} from "@/lib/daily-prep/daily-prep-confirm-flow";
import {
  beginDisplayPinSession,
  computeNalipoDailyPrep,
  getDisplayPinSessionPins,
  loadFlourUsageState,
  recordFlourUsageOnConfirm,
} from "@/lib/daily-prep";
import {
  DAILY_PREP_ADJUSTMENT_LIMITS,
  DAILY_PREP_FLOUR_KG_MAX,
  DAILY_PREP_FLOUR_KG_MIN,
  DAILY_PREP_FINISH_WATER_RULE,
  NALIPO_DAILY_PREP_BASELINE,
  type DailyPrepSessionAdjustment,
} from "@/types/daily-prep";

import styles from "./daily.module.css";

function formatGrams(value: number): string {
  return value.toLocaleString("ja-JP");
}

function IngredientRow({
  name,
  grams,
  emphasize,
}: {
  name: string;
  grams: number;
  emphasize?: boolean;
}) {
  return (
    <li className={styles.ingredientRow}>
      <span className={styles.ingredientName}>{name}</span>
      <span
        className={styles.ingredientAmount}
        style={emphasize ? { fontSize: "1.5rem" } : undefined}
      >
        {formatGrams(grams)}
        <span className={styles.ingredientUnit}> g</span>
      </span>
    </li>
  );
}

const CONFIRM_STATUS_LABEL: Record<DailyPrepConfirmUiState, string> = {
  idle: "",
  saved:
    "使用頻度を1回記録しました（この端末のみ）。同じ粉量で別の仕込みをした場合は、もう一度押してください。",
  storage_unavailable:
    "保存できませんでした。上の分量はそのまま使えます（使用頻度は記録されていません）。",
  write_failed:
    "保存に失敗しました。上の分量はそのまま使えます（使用頻度は記録されていません）。",
  duplicate_operation:
    "同じ確定処理が重複しました。使用頻度は1回だけカウントされています。",
};

export function DailyView() {
  const pinSession = useMemo(
    () => beginDisplayPinSession(loadFlourUsageState()),
    [],
  );
  const pinKg = useMemo(() => getDisplayPinSessionPins(pinSession), [pinSession]);

  const [selectedKg, setSelectedKg] = useState(10);
  const [adjustment, setAdjustment] = useState<DailyPrepSessionAdjustment | undefined>(
    undefined,
  );
  const [confirmUi, setConfirmUi] = useState<DailyPrepConfirmUiState>("idle");
  const [confirmInFlight, setConfirmInFlight] = useState(false);
  const confirmLockRef = useRef(false);

  useEffect(() => {
    setConfirmUi("idle");
  }, [selectedKg, adjustment]);

  const result = useMemo(
    () =>
      computeNalipoDailyPrep({
        totalFlourKg: selectedKg,
        adjustment,
      }),
    [selectedKg, adjustment],
  );

  const adjustmentActive = isDailyPrepAdjustmentActive(adjustment);

  const otherKgOptions = useMemo(() => {
    const all: number[] = [];
    for (let kg = DAILY_PREP_FLOUR_KG_MIN; kg <= DAILY_PREP_FLOUR_KG_MAX; kg++) {
      if (!pinKg.includes(kg)) {
        all.push(kg);
      }
    }
    return all;
  }, [pinKg]);

  const setPoolishPercent = useCallback((value: number) => {
    setAdjustment((prev) => ({
      ...prev,
      poolishPercentOfTotalFlour: value,
    }));
  }, []);

  const setHydrationPercent = useCallback((value: number) => {
    setAdjustment((prev) => ({
      ...prev,
      totalHydrationPercent: value,
    }));
  }, []);

  const resetAdjustment = useCallback(() => {
    setAdjustment(undefined);
  }, []);

  const poolishValue =
    adjustment?.poolishPercentOfTotalFlour ??
    NALIPO_DAILY_PREP_BASELINE.poolishPercentOfTotalFlour;
  const hydrationValue =
    adjustment?.totalHydrationPercent ??
    NALIPO_DAILY_PREP_BASELINE.totalHydrationPercent;

  const handleConfirm = useCallback(() => {
    if (!canStartConfirmRecord(confirmInFlight || confirmLockRef.current)) {
      return;
    }

    confirmLockRef.current = true;
    setConfirmInFlight(true);

    try {
      const token = createDailyPrepConfirmToken();
      const recordResult = recordFlourUsageOnConfirm({
        totalFlourKg: selectedKg,
        confirmToken: token,
      });
      setConfirmUi(mapFlourUsageConfirmToUiState(recordResult));
    } finally {
      confirmLockRef.current = false;
      setConfirmInFlight(false);
    }
  }, [confirmInFlight, selectedKg]);

  const confirmDisabled = result === null || confirmInFlight;

  const statusClass =
    confirmUi === "saved"
      ? styles.confirmStatusSaved
      : confirmUi === "storage_unavailable" || confirmUi === "write_failed"
        ? styles.confirmStatusWarn
        : confirmUi === "duplicate_operation"
          ? styles.confirmStatusError
          : "";

  const appliedPoolish = result?.applied.poolishPercentOfTotalFlour ?? poolishValue;
  const appliedHydration = result?.applied.totalHydrationPercent ?? hydrationValue;

  return (
    <div className={styles.daily}>
      <header className={styles.header}>
        <h1>毎日の仕込み</h1>
      </header>

      <section className={styles.sectionFlour} aria-labelledby="flour-select-title">
        <h2 id="flour-select-title" className={styles.sectionTitle}>
          小麦粉の総量を選ぶ
        </h2>
        <p className={styles.selectedKg} aria-live="polite">
          {selectedKg}
          <span className={styles.selectedKgUnit}> kg</span>
          <span className={styles.selectedKgSuffix}> 選択中</span>
        </p>
        <div className={styles.pinGrid} role="group" aria-label="よく使う粉量">
          {pinKg.map((kg) => (
            <button
              key={kg}
              type="button"
              className={styles.pinButton}
              aria-pressed={selectedKg === kg}
              onClick={() => setSelectedKg(kg)}
            >
              {kg} kg
            </button>
          ))}
        </div>
        <details className={styles.otherToggle}>
          <summary className={styles.otherSummary}>その他の粉量（1〜20 kg）</summary>
          <div className={styles.otherGrid} role="group" aria-label="その他の粉量">
            {otherKgOptions.map((kg) => (
              <button
                key={kg}
                type="button"
                className={styles.otherButton}
                aria-pressed={selectedKg === kg}
                onClick={() => setSelectedKg(kg)}
              >
                {kg}
              </button>
            ))}
          </div>
        </details>
        <p className={styles.baselineShort}>
          基準：ポーリッシュ {NALIPO_DAILY_PREP_BASELINE.poolishPercentOfTotalFlour}% / 総加水{" "}
          {NALIPO_DAILY_PREP_BASELINE.totalHydrationPercent}%
          {adjustmentActive ? (
            <span className={styles.appliedNow}>
              {" "}
              → 今回 {appliedPoolish}% / {appliedHydration}%
            </span>
          ) : null}
        </p>
      </section>

      <details className={styles.adjustmentDetails}>
        <summary className={styles.adjustmentSummary}>
          配合を調整（セッションのみ）
          {adjustmentActive ? (
            <span className={styles.adjustedBadge} aria-label="配合変更中">
              変更中
            </span>
          ) : null}
        </summary>
        <div className={styles.adjustmentBody}>
          <div className={styles.sliderBlock}>
            <label className={styles.sliderLabel} htmlFor="poolish-range">
              <span>ポーリッシュ比率</span>
              <span>{poolishValue}%</span>
            </label>
            <input
              id="poolish-range"
              className={styles.slider}
              type="range"
              min={DAILY_PREP_ADJUSTMENT_LIMITS.poolishPercentMin}
              max={DAILY_PREP_ADJUSTMENT_LIMITS.poolishPercentMax}
              step={1}
              value={poolishValue}
              onChange={(e) => setPoolishPercent(Number(e.target.value))}
            />
          </div>
          <div className={styles.sliderBlock}>
            <label className={styles.sliderLabel} htmlFor="hydration-range">
              <span>総加水率</span>
              <span>{hydrationValue}%</span>
            </label>
            <input
              id="hydration-range"
              className={styles.slider}
              type="range"
              min={DAILY_PREP_ADJUSTMENT_LIMITS.totalHydrationPercentMin}
              max={DAILY_PREP_ADJUSTMENT_LIMITS.totalHydrationPercentMax}
              step={1}
              value={hydrationValue}
              onChange={(e) => setHydrationPercent(Number(e.target.value))}
            />
          </div>
          <button type="button" className={styles.resetButton} onClick={resetAdjustment}>
            基準配合（30% / 70%）に戻す
          </button>
        </div>
      </details>

      {result === null ? (
        <div className={styles.errorBox} role="alert">
          配合を計算できません。粉量は 1〜20 kg の整数で選んでください。
        </div>
      ) : (
        <>
          <section
            className={`${styles.section} ${styles.daySection}`}
            aria-labelledby="day-before-title"
          >
            <p className={styles.dayLabel}>前日・作業</p>
            <h2 id="day-before-title" className={styles.dayHeading}>
              ポーリッシュ種を仕込む
            </h2>
            <ul className={styles.ingredientList}>
              <IngredientRow name="小麦粉" grams={result.dayBefore.flourG} />
              <IngredientRow name="水" grams={result.dayBefore.waterG} />
              <IngredientRow name="イースト" grams={result.dayBefore.yeastG} />
            </ul>
          </section>

          <section
            className={`${styles.section} ${styles.daySection} ${styles.daySectionToday}`}
            aria-labelledby="day-of-title"
          >
            <p className={styles.dayLabel}>当日・作業</p>
            <h2 id="day-of-title" className={styles.dayHeading}>
              本練りを仕込む
            </h2>
            <ul className={styles.ingredientList}>
              <IngredientRow name="小麦粉" grams={result.dayOf.flourG} />
              <IngredientRow
                name="最初にミキサーへ入れる水（氷水）"
                grams={result.dayOf.firstWaterG}
                emphasize
              />
              <IngredientRow
                name="仕上げ用に別容器へ取る水"
                grams={result.dayOf.finishWaterG}
                emphasize
              />
              <IngredientRow name="イースト" grams={result.dayOf.yeastG} />
              <IngredientRow name="塩" grams={result.dayOf.saltG} />
            </ul>
            <p className={styles.waterWarn} role="note">
              仕上げ用の水（{formatGrams(result.dayOf.finishWaterG)} g）は最初にミキサーへ
              全量入れないでください。別容器に取り、指定のタイミングで加えます。
            </p>
            {result.finishWaterRule.provisional ? (
              <p className={styles.provisionalTag}>
                {DAILY_PREP_FINISH_WATER_RULE.labelJa}
              </p>
            ) : null}
          </section>
        </>
      )}

      <p className={styles.gramsHint}>材料の数値はグラム（g）表示です</p>

      <nav className={styles.navFooter} aria-label="サイト内ナビ">
        <Link href="/">ホーム</Link>
        <Link href="/quick">Quick</Link>
        <Link href="/calculator">Calculator</Link>
      </nav>

      <div className={styles.confirmBar}>
        <p className={styles.confirmHint}>
          「仕込む」は分量の確定ではなく、この端末の使用頻度に加算する操作です
        </p>
        <button
          type="button"
          className={styles.confirmButton}
          disabled={confirmDisabled}
          aria-disabled={confirmDisabled}
          onClick={handleConfirm}
        >
          この粉量で仕込む（使用頻度を記録）
        </button>
        {confirmUi !== "idle" ? (
          <p
            className={`${styles.confirmStatus} ${statusClass}`}
            role="status"
            aria-live="polite"
          >
            {CONFIRM_STATUS_LABEL[confirmUi]}
          </p>
        ) : null}
      </div>
    </div>
  );
}