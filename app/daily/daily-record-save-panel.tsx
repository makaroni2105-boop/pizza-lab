"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

import { buildActualUsageFromForm } from "@/lib/daily-prep/actual-usage-parse";
import { OpenWeatherAttribution } from "@/lib/weather/openweather-attribution";
import { getPrepDateJstString } from "@/lib/daily-prep/jst-date";
import type { DailyPrepComputeResult, DailyPrepSessionAdjustment } from "@/types/daily-prep";
import type { DailyPrepDoughState11am } from "@/types/daily-prep-record";

import styles from "./daily.module.css";

const DOUGH_OPTIONS: { value: DailyPrepDoughState11am | ""; label: string }[] = [
  { value: "", label: "（未入力）" },
  { value: "good", label: "良好" },
  { value: "slow", label: "発酵遅い" },
  { value: "fast", label: "発酵早い" },
  { value: "wet", label: "湿り気強い" },
  { value: "dry", label: "乾き気味" },
  { value: "other", label: "その他" },
];

type SaveUiState = "idle" | "saving" | "saved" | "error";

export function DailyRecordSavePanel({
  selectedKg,
  adjustment,
  result,
}: {
  selectedKg: number;
  adjustment?: DailyPrepSessionAdjustment;
  result: DailyPrepComputeResult;
}) {
  const [prepDateJst, setPrepDateJst] = useState(() => getPrepDateJstString());
  const [roomTemp, setRoomTemp] = useState("");
  const [memo, setMemo] = useState("");
  const [doughState, setDoughState] = useState<DailyPrepDoughState11am | "">("");
  const [poolishYeastG, setPoolishYeastG] = useState("");
  const [mainYeastG, setMainYeastG] = useState("");
  const [prepWaterTempC, setPrepWaterTempC] = useState("");
  const [finalDoughTempC, setFinalDoughTempC] = useState("");
  const [saveUi, setSaveUi] = useState<SaveUiState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [lastRecordId, setLastRecordId] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const roomTempCValue = useMemo(() => {
    if (roomTemp.trim() === "") {
      return null;
    }
    const value = Number(roomTemp);
    return Number.isFinite(value) ? value : null;
  }, [roomTemp]);

  const handleSaveRecord = useCallback(async () => {
    if (saveUi === "saving") {
      return;
    }

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `save-${Date.now()}`;
    }

    setSaveUi("saving");
    setSaveMessage("");

    const usage = buildActualUsageFromForm(result, {
      poolishYeastG,
      mainYeastG,
      prepWaterTempC,
      finalDoughTempC,
    });

    try {
      const response = await fetch("/api/daily-prep-records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          totalFlourKg: selectedKg,
          sessionAdjustment: adjustment,
          prepDateJst,
          roomTempC: roomTempCValue,
          memo: memo.trim() || null,
          doughState11am: doughState === "" ? null : doughState,
          actualMaterials: usage.actualMaterials,
          processReadings: usage.processReadings,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        record?: { id: string };
        error?: { message?: string; code?: string };
        weatherStatus?: string;
      };

      if (!response.ok || !data.success || !data.record) {
        setSaveUi("error");
        const code = data.error?.code ?? "";
        setSaveMessage(
          data.error?.message ??
            (code === "DB_UNAVAILABLE"
              ? "データベースに接続できないため保存できません"
              : code === "PREP_DATE_EXISTS"
                ? "この仕込み日の記録は既にあります。記録一覧から更新してください。"
                : "仕込み記録を保存できませんでした"),
        );
        return;
      }

      setLastRecordId(data.record.id);
      setSaveUi("saved");
      const weatherNote =
        data.weatherStatus === "unavailable"
          ? "（外気温は未取得ですが記録は保存済み）"
          : "（計算スナップショット + 呉市の外気温）";
      setSaveMessage(`仕込み記録を保存しました${weatherNote}`);
      idempotencyKeyRef.current = null;
    } catch {
      setSaveUi("error");
      setSaveMessage("ネットワークエラーで保存できませんでした");
    }
  }, [
    adjustment,
    doughState,
    finalDoughTempC,
    mainYeastG,
    memo,
    poolishYeastG,
    prepDateJst,
    prepWaterTempC,
    result,
    roomTempCValue,
    saveUi,
    selectedKg,
  ]);

  return (
    <section
      className={styles.recordSection}
      aria-labelledby="daily-record-save-title"
    >
      <h2 id="daily-record-save-title" className={styles.sectionTitle}>
        今日の仕込みを記録
      </h2>
      <p className={styles.recordLead}>
        上の自動計算結果を初期値として保存します。粉量使用履歴とは別で、明示的に「保存」したときだけ
        データベースに書き込みます（開発時は環境変数でのみメモリ代替可）。
      </p>

      <dl className={styles.recordSnapshot}>
        <div>
          <dt>計算上の粉量</dt>
          <dd>
            {selectedKg} kg（総{" "}
            {result.totalFlourG.toLocaleString("ja-JP")} g）
          </dd>
        </div>
        <div>
          <dt>配合</dt>
          <dd>
            ポーリッシュ {result.applied.poolishPercentOfTotalFlour}% / 総加水{" "}
            {result.applied.totalHydrationPercent}%
          </dd>
        </div>
        <div>
          <dt>イースト（計算値）</dt>
          <dd>
            前日 {result.dayBefore.yeastG} g + 当日 {result.dayOf.yeastG} g
          </dd>
        </div>
      </dl>

      <div className={styles.recordFormGrid}>
        <label className={styles.recordField}>
          <span>仕込み日（日本時間）</span>
          <input
            type="date"
            value={prepDateJst}
            onChange={(event) => setPrepDateJst(event.target.value)}
          />
        </label>

        <label className={styles.recordField}>
          <span>店舗室内温度（℃・任意）</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="例 24.5"
            value={roomTemp}
            onChange={(event) => setRoomTemp(event.target.value)}
          />
        </label>

        <label className={styles.recordField}>
          <span>11時頃の生地状態（任意）</span>
          <select
            value={doughState}
            onChange={(event) =>
              setDoughState(event.target.value as DailyPrepDoughState11am | "")
            }
          >
            {DOUGH_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.recordFieldWide}>
          <span>メモ（任意）</span>
          <textarea
            rows={2}
            maxLength={2000}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="当日の気づき、湿り気、作業メモなど"
          />
        </label>
      </div>

      <details className={styles.actualUsageDetails}>
        <summary className={styles.actualUsageSummary}>
          実際の材料・水温を入力（変更した日だけ）
        </summary>
        <div className={styles.actualUsageBody}>
          <p className={styles.actualUsageHint}>
            空欄のままなら計算値をそのまま記録します。標準計算値は別フィールドに保持されます。
          </p>
          <label className={styles.recordField}>
            <span>前日プーリッシュのイースト（g）</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder={`計算値 ${result.dayBefore.yeastG} g`}
              value={poolishYeastG}
              onChange={(event) => setPoolishYeastG(event.target.value)}
            />
          </label>
          <label className={styles.recordField}>
            <span>当日本捏ねのイースト（g）</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder={`計算値 ${result.dayOf.yeastG} g`}
              value={mainYeastG}
              onChange={(event) => setMainYeastG(event.target.value)}
            />
          </label>
          <label className={styles.recordField}>
            <span>仕込み水温（℃・任意）</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={prepWaterTempC}
              onChange={(event) => setPrepWaterTempC(event.target.value)}
            />
          </label>
          <label className={styles.recordField}>
            <span>捏ね上げ温度（℃・任意）</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={finalDoughTempC}
              onChange={(event) => setFinalDoughTempC(event.target.value)}
            />
          </label>
        </div>
      </details>

      <button
        type="button"
        className={styles.saveRecordButton}
        disabled={saveUi === "saving"}
        onClick={() => {
          void handleSaveRecord();
        }}
      >
        この仕込みを記録に保存
      </button>

      {saveUi !== "idle" ? (
        <p
          className={
            saveUi === "saved"
              ? styles.recordStatusOk
              : saveUi === "error"
                ? styles.recordStatusError
                : styles.recordStatusPending
          }
          role="status"
          aria-live="polite"
        >
          {saveUi === "saving" ? "保存中…" : saveMessage}
          {lastRecordId ? (
            <span className={styles.recordIdHint}>
              {" "}
              ID: {lastRecordId.slice(0, 8)}…
            </span>
          ) : null}
        </p>
      ) : null}

      <OpenWeatherAttribution compact />
      <p className={styles.recordNavHint}>
        <Link href="/daily/records">記録の確認・推移グラフ</Link>
        （/daily 内）
      </p>
    </section>
  );
}