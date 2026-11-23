"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { OpenWeatherAttribution } from "@/lib/weather/openweather-attribution";
import type { DailyPrepRecord } from "@/types/daily-prep-record";

import styles from "../daily.module.css";

function sumYeastG(record: DailyPrepRecord): number {
  return (
    record.actualMaterials.dayBefore.yeastG +
    record.actualMaterials.dayOf.yeastG
  );
}

function ChartBars({
  title,
  unit,
  points,
  maxValue,
}: {
  title: string;
  unit: string;
  points: { label: string; value: number | null }[];
  maxValue: number;
}) {
  const safeMax = maxValue > 0 ? maxValue : 1;

  return (
    <section className={styles.chartBlock} aria-label={title}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <ul className={styles.chartList}>
        {points.map((point) => {
          const heightPct =
            point.value === null
              ? 0
              : Math.max(4, Math.round((point.value / safeMax) * 100));

          return (
            <li key={point.label} className={styles.chartItem}>
              <div
                className={styles.chartBar}
                style={{ height: `${heightPct}%` }}
                title={
                  point.value === null
                    ? "データなし"
                    : `${point.value}${unit}`
                }
              />
              <span className={styles.chartValue}>
                {point.value === null ? "—" : `${point.value}${unit}`}
              </span>
              <span className={styles.chartLabel}>{point.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DailyRecordsView() {
  const [records, setRecords] = useState<DailyPrepRecord[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error">(
    "loading",
  );
  const [editMemo, setEditMemo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [patchMessage, setPatchMessage] = useState("");

  const loadRecords = useCallback(async () => {
    setLoadState("loading");

    try {
      const response = await fetch("/api/daily-prep-records?limit=90");
      const data = (await response.json()) as {
        success?: boolean;
        records?: DailyPrepRecord[];
      };

      if (!response.ok || !data.success || !data.records) {
        setLoadState("error");
        return;
      }

      setRecords(data.records);
      setLoadState("ok");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const chartPoints = useMemo(() => {
    const chronological = [...records].reverse();

    return {
      ambient: chronological.map((record) => ({
        label: record.prepDateJst.slice(5),
        value:
          record.weather.fetchStatus === "ok"
            ? record.weather.ambientTempC
            : null,
      })),
      room: chronological.map((record) => ({
        label: record.prepDateJst.slice(5),
        value: record.roomTempC,
      })),
      flour: chronological.map((record) => ({
        label: record.prepDateJst.slice(5),
        value: record.totalFlourKg,
      })),
      yeast: chronological.map((record) => ({
        label: record.prepDateJst.slice(5),
        value: sumYeastG(record),
      })),
    };
  }, [records]);

  const maxAmbient = Math.max(...chartPoints.ambient.map((p) => p.value ?? 0), 1);
  const maxRoom = Math.max(
    ...chartPoints.room.map((p) => p.value ?? 0),
    1,
  );
  const maxFlour = Math.max(...chartPoints.flour.map((p) => p.value ?? 0), 1);
  const maxYeast = Math.max(...chartPoints.yeast.map((p) => p.value ?? 0), 1);

  const selected = records.find((record) => record.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setEditMemo(selected.memo ?? "");
    }
  }, [selected]);

  const handlePatchMemo = useCallback(async () => {
    if (!selected) {
      return;
    }

    setPatchMessage("");

    try {
      const response = await fetch("/api/daily-prep-records", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          memo: editMemo.trim() || null,
          expectedRevision: selected.currentRevision,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: { message?: string };
      };

      if (!response.ok || !data.success) {
        setPatchMessage(data.error?.message ?? "更新に失敗しました");
        return;
      }

      setPatchMessage("メモを更新しました（履歴に版を残します）");
      await loadRecords();
    } catch {
      setPatchMessage("ネットワークエラー");
    }
  }, [editMemo, loadRecords, selected]);

  return (
    <div className={styles.daily}>
      <header className={styles.header}>
        <h1>仕込み記録 · グラフ</h1>
        <p className={styles.recordsSubhead}>
          <Link href="/daily">← 毎日の仕込み（計算）へ戻る</Link>
        </p>
      </header>

      {loadState === "loading" ? (
        <p className={styles.recordsInfo}>読み込み中…</p>
      ) : null}

      {loadState === "error" ? (
        <p className={styles.recordStatusError} role="alert">
          記録を取得できませんでした。
        </p>
      ) : null}

      {loadState === "ok" && records.length === 0 ? (
        <p className={styles.recordsInfo}>
          まだ記録がありません。計算画面で「この仕込みを記録に保存」してください。
        </p>
      ) : null}

      {records.length > 0 ? (
        <>
          <MotionCharts
            ambient={chartPoints.ambient}
            room={chartPoints.room}
            flour={chartPoints.flour}
            yeast={chartPoints.yeast}
            maxAmbient={maxAmbient}
            maxRoom={maxRoom}
            maxFlour={maxFlour}
            maxYeast={maxYeast}
          />
          <OpenWeatherAttribution />

          <section className={styles.recordListSection} aria-labelledby="record-list-title">
            <h2 id="record-list-title" className={styles.sectionTitle}>
              保存済み記録
            </h2>
            <ul className={styles.recordList}>
              {records.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    className={
                      selectedId === record.id
                        ? styles.recordListButtonActive
                        : styles.recordListButton
                    }
                    onClick={() => setSelectedId(record.id)}
                  >
                    <span className={styles.recordListDate}>{record.prepDateJst}</span>
                    <span>
                      {record.totalFlourKg} kg · 外気{" "}
                      {record.weather.fetchStatus === "ok" &&
                      record.weather.ambientTempC !== null
                        ? `${record.weather.ambientTempC.toFixed(1)}℃`
                        : "—"}
                      {record.roomTempC !== null
                        ? ` · 店内 ${record.roomTempC}℃`
                        : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selected ? (
            <section className={styles.recordDetail} aria-labelledby="record-detail-title">
              <h2 id="record-detail-title" className={styles.sectionTitle}>
                記録詳細（編集）
              </h2>
              <p className={styles.recordDetailMeta}>
                版 {selected.currentRevision} · 計算粉量 {selected.totalFlourKg} kg
                （計算上イースト{" "}
                {selected.computedMaterials.dayBefore.yeastG +
                  selected.computedMaterials.dayOf.yeastG}
                g）
              </p>
              <p className={styles.recordDetailMeta}>
                実際の材料は{" "}
                {JSON.stringify(selected.actualMaterials) ===
                JSON.stringify(selected.computedMaterials)
                  ? "計算値と同じ"
                  : "計算値から変更あり"}
              </p>
              <label className={styles.recordFieldWide}>
                <span>メモ</span>
                <textarea
                  rows={3}
                  value={editMemo}
                  onChange={(event) => setEditMemo(event.target.value)}
                />
              </label>
              <button
                type="button"
                className={styles.saveRecordButton}
                onClick={() => {
                  void handlePatchMemo();
                }}
              >
                メモを保存（履歴保持）
              </button>
              {patchMessage ? (
                <p className={styles.recordStatusOk} role="status">
                  {patchMessage}
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function MotionCharts(props: {
  ambient: { label: string; value: number | null }[];
  room: { label: string; value: number | null }[];
  flour: { label: string; value: number | null }[];
  yeast: { label: string; value: number | null }[];
  maxAmbient: number;
  maxRoom: number;
  maxFlour: number;
  maxYeast: number;
}) {
  return (
    <div className={styles.chartGrid}>
      <ChartBars
        title="外気温（呉市周辺）"
        unit="℃"
        points={props.ambient}
        maxValue={props.maxAmbient}
      />
      <ChartBars
        title="店舗室内温度"
        unit="℃"
        points={props.room}
        maxValue={props.maxRoom}
      />
      <ChartBars
        title="粉量"
        unit="kg"
        points={props.flour}
        maxValue={props.maxFlour}
      />
      <ChartBars
        title="イースト合計"
        unit="g"
        points={props.yeast}
        maxValue={props.maxYeast}
      />
    </div>
  );
}