"use client";

import { useState, type FormEvent } from "react";

import { buildLearningRunFromQuickRecord } from "@/lib/learning/learning-run";
import {
  applyStoredLearningToProfile,
  listLearningRunsByShopId,
  recordLearningRun,
} from "@/lib/learning/learning-storage";
import { isCraftsmanScore } from "@/lib/learning/learning-score";
import { DEMO_SHOP_ID, getProfile } from "@/lib/profile/profile-storage";
import type { DieOutput } from "@/types/die";
import type { ShopProfile } from "@/types/profile";

import styles from "./quick.module.css";

interface QuickRunRecordProps {
  shopId: string;
  profile: ShopProfile;
  output: DieOutput;
  shopRoomTempC?: number;
  onRecorded: (updatedProfile: ShopProfile | null) => void;
}

export function QuickRunRecord({
  shopId,
  profile,
  output,
  shopRoomTempC,
  onRecorded,
}: QuickRunRecordProps) {
  const [actualDoughTempC, setActualDoughTempC] = useState(
    String(output.temperature.predictedDoughTempC.toFixed(1)),
  );
  const [craftsmanScore, setCraftsmanScore] = useState("4");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const existingRunCount = listLearningRunsByShopId(shopId).length;
  const isDemoShop = shopId === DEMO_SHOP_ID && !getProfile(shopId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const actual = Number(actualDoughTempC);
    const score = Number(craftsmanScore);

    if (!Number.isFinite(actual)) {
      setError("実測生地温を正しく入力してください");
      setSaving(false);
      return;
    }

    if (!isCraftsmanScore(score)) {
      setError("今日の一枚の記録は 1〜5 で選んでください");
      setSaving(false);
      return;
    }

    try {
      const profileWithLearning = applyStoredLearningToProfile(profile);
      const run = buildLearningRunFromQuickRecord({
        shopId,
        profile: profileWithLearning,
        output,
        actualDoughTempC: actual,
        craftsmanScore: score,
        memo,
        shopRoomTempC,
      });

      const { profile: updatedProfile } = recordLearningRun(run);
      const runCount = listLearningRunsByShopId(shopId).length;

      if (isDemoShop) {
        setSuccess(
          `記録しました（${runCount} 件）。サンプル店舗の Run は保存され、次回計算に反映されます。`,
        );
        onRecorded(applyStoredLearningToProfile(profile));
      } else if (updatedProfile) {
        setSuccess(
          `記録しました（${runCount} 件）。この店の学習材料として蓄積されています。`,
        );
        onRecorded(updatedProfile);
      } else {
        setSuccess(`記録しました（${runCount} 件）。`);
        onRecorded(null);
      }

      setMemo("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "記録に失敗しました",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.recordSection}>
      <h2>今日の一枚を記録する</h2>
      <p className={styles.note}>
        焼いてみた結果を残すと、その店の100点を学習する材料になります（任意）。
      </p>

      <form className={styles.recordForm} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="actualDoughTempC">実測生地温 (°C)</label>
          <input
            id="actualDoughTempC"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={actualDoughTempC}
            onChange={(event) => setActualDoughTempC(event.target.value)}
            required
          />
          <small>
            予測 {output.temperature.predictedDoughTempC.toFixed(1)}°C を参考に入力できます
          </small>
        </div>

        <div className={styles.field}>
          <label htmlFor="craftsmanScore">今日の一枚、理想に近かった？</label>
          <select
            id="craftsmanScore"
            value={craftsmanScore}
            onChange={(event) => setCraftsmanScore(event.target.value)}
          >
            <option value="5">5 — とても近い</option>
            <option value="4">4 — おおむね近い</option>
            <option value="3">3 — ふつう</option>
            <option value="2">2 — やや遠い</option>
            <option value="1">1 — 遠い</option>
          </select>
          <small>1〜5（その店の100点への近さ）</small>
        </div>

        <div className={styles.field}>
          <label htmlFor="runMemo">メモ（任意）</label>
          <input
            id="runMemo"
            type="text"
            placeholder="例: コルニチョーネが理想的"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            maxLength={200}
          />
        </div>

        <button className={styles.recordSubmit} type="submit" disabled={saving}>
          {saving ? "保存中…" : "記録を残す"}
        </button>
      </form>

      {existingRunCount > 0 ? (
        <p className={styles.note}>これまでの記録: {existingRunCount} 件</p>
      ) : null}

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className={styles.recordSuccess} role="status">
          {success}
        </div>
      ) : null}
    </section>
  );
}
