"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  computeBakersPercentOutcome,
  computePrefermentOutcome,
  parseCalculatorNumber,
  prefermentTypeLabel,
  type BakersPercentMode,
  type PrefermentType,
} from "@/lib/calculator";

import styles from "./calculator.module.css";

function formatGrams(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value.toLocaleString("ja-JP", {
    maximumFractionDigits: 1,
  })} g`;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value.toLocaleString("ja-JP", {
    maximumFractionDigits: 2,
  })}%`;
}

function hasAnyValue(values: string[]): boolean {
  return values.some((value) => value.trim() !== "");
}

export function CalculatorView() {
  const [mode, setMode] = useState<BakersPercentMode>("total_dough");
  const [totalDoughWeightG, setTotalDoughWeightG] = useState("");
  const [ballWeightG, setBallWeightG] = useState("250");
  const [ballCount, setBallCount] = useState("");
  const [flourWeightG, setFlourWeightG] = useState("");
  const [hydrationPercent, setHydrationPercent] = useState("65");
  const [saltPercent, setSaltPercent] = useState("2.5");
  const [yeastPercent, setYeastPercent] = useState("0.2");
  const [oilPercent, setOilPercent] = useState("0");

  const [prefermentType, setPrefermentType] = useState<PrefermentType>("poolish");
  const [prefermentFlourPercent, setPrefermentFlourPercent] = useState("20");
  const [prefermentHydrationPercent, setPrefermentHydrationPercent] = useState("");
  const [prefermentYeastPercent, setPrefermentYeastPercent] = useState("");
  const [manualPrefermentFlourG, setManualPrefermentFlourG] = useState("");

  const bakersOutcome = useMemo(
    () =>
      computeBakersPercentOutcome({
        mode,
        totalDoughWeightG: parseCalculatorNumber(totalDoughWeightG),
        ballWeightG: parseCalculatorNumber(ballWeightG),
        ballCount: parseCalculatorNumber(ballCount),
        flourWeightG: parseCalculatorNumber(flourWeightG),
        hydrationPercent: parseCalculatorNumber(hydrationPercent),
        saltPercent: parseCalculatorNumber(saltPercent),
        yeastPercent: parseCalculatorNumber(yeastPercent),
        oilPercent: parseCalculatorNumber(oilPercent),
      }),
    [
      mode,
      totalDoughWeightG,
      ballWeightG,
      ballCount,
      flourWeightG,
      hydrationPercent,
      saltPercent,
      yeastPercent,
      oilPercent,
    ],
  );

  const prefermentFlourSource = useMemo(() => {
    if (manualPrefermentFlourG.trim() !== "") {
      return parseCalculatorNumber(manualPrefermentFlourG);
    }

    return bakersOutcome.result?.flourG ?? null;
  }, [manualPrefermentFlourG, bakersOutcome.result?.flourG]);

  const prefermentOutcome = useMemo(
    () =>
      computePrefermentOutcome({
        totalFlourG: prefermentFlourSource,
        prefermentType,
        prefermentFlourPercent: parseCalculatorNumber(prefermentFlourPercent),
        totalHydrationPercent: parseCalculatorNumber(hydrationPercent),
        prefermentHydrationPercent:
          prefermentHydrationPercent.trim() === ""
            ? null
            : parseCalculatorNumber(prefermentHydrationPercent),
        prefermentYeastPercent:
          prefermentYeastPercent.trim() === ""
            ? null
            : parseCalculatorNumber(prefermentYeastPercent),
      }),
    [
      prefermentFlourSource,
      prefermentType,
      prefermentFlourPercent,
      hydrationPercent,
      prefermentHydrationPercent,
      prefermentYeastPercent,
    ],
  );

  const bakersInputs = [
    hydrationPercent,
    saltPercent,
    yeastPercent,
    oilPercent,
    totalDoughWeightG,
    ballWeightG,
    ballCount,
    flourWeightG,
  ];
  const showBakersError =
    hasAnyValue(bakersInputs) && Boolean(bakersOutcome.error);

  const prefermentInputs = [
    prefermentFlourPercent,
    manualPrefermentFlourG,
    prefermentHydrationPercent,
    prefermentYeastPercent,
  ];
  const showPrefermentError =
    (hasAnyValue(prefermentInputs) || bakersOutcome.result !== null) &&
    Boolean(prefermentOutcome.error);

  return (
    <div className={styles.calculator}>
      <header className={styles.header}>
        <h1>Baker&apos;s % Calculator</h1>
        <p>
          研究用の単純計算機です。Quick Mode や DIE の推奨値は使いません。
        </p>
      </header>

      <nav className={styles.nav}>
        <Link href="/quick">Quick Mode</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/knowledge">Knowledge</Link>
      </nav>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>配合計算</h2>
        <p className={styles.sectionNote}>
          Baker&apos;s % から粉・水・塩・酵母・油を算出します。
        </p>

        <div className={styles.modeToggle}>
          <button
            type="button"
            className={`${styles.modeButton} ${
              mode === "total_dough" ? styles.modeButtonActive : ""
            }`}
            onClick={() => setMode("total_dough")}
          >
            総生地量から
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${
              mode === "flour_weight" ? styles.modeButtonActive : ""
            }`}
            onClick={() => setMode("flour_weight")}
          >
            粉量から
          </button>
        </div>

        <div className={styles.form}>
          {mode === "total_dough" ? (
            <>
              <div className={styles.field}>
                <label htmlFor="total-dough">総生地量 (g)</label>
                <input
                  id="total-dough"
                  inputMode="decimal"
                  value={totalDoughWeightG}
                  onChange={(event) => setTotalDoughWeightG(event.target.value)}
                  placeholder="例: 10000"
                />
                <small>直接入力するか、下の 1 枚重量 × 枚数でも可</small>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="ball-weight">1 枚重量 (g)</label>
                  <input
                    id="ball-weight"
                    inputMode="decimal"
                    value={ballWeightG}
                    onChange={(event) => setBallWeightG(event.target.value)}
                    placeholder="250"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="ball-count">枚数</label>
                  <input
                    id="ball-count"
                    inputMode="numeric"
                    value={ballCount}
                    onChange={(event) => setBallCount(event.target.value)}
                    placeholder="40"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className={styles.field}>
              <label htmlFor="flour-weight">粉量 (g)</label>
              <input
                id="flour-weight"
                inputMode="decimal"
                value={flourWeightG}
                onChange={(event) => setFlourWeightG(event.target.value)}
                placeholder="例: 1000"
              />
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="hydration">加水率 (%)</label>
              <input
                id="hydration"
                inputMode="decimal"
                value={hydrationPercent}
                onChange={(event) => setHydrationPercent(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="salt">塩 (%)</label>
              <input
                id="salt"
                inputMode="decimal"
                value={saltPercent}
                onChange={(event) => setSaltPercent(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="yeast">酵母 (%)</label>
              <input
                id="yeast"
                inputMode="decimal"
                value={yeastPercent}
                onChange={(event) => setYeastPercent(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="oil">油 (%)</label>
              <input
                id="oil"
                inputMode="decimal"
                value={oilPercent}
                onChange={(event) => setOilPercent(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.results}>
          <h3 className={styles.resultsTitle}>結果</h3>
          {bakersOutcome.result ? (
            <div className={styles.resultGrid}>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>粉</span>
                <span className={styles.resultValue}>
                  {formatGrams(bakersOutcome.result.flourG)}
                </span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>水</span>
                <span className={styles.resultValue}>
                  {formatGrams(bakersOutcome.result.waterG)}
                </span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>塩</span>
                <span className={styles.resultValue}>
                  {formatGrams(bakersOutcome.result.saltG)}
                </span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>酵母</span>
                <span className={styles.resultValue}>
                  {formatGrams(bakersOutcome.result.yeastG)}
                </span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>油</span>
                <span className={styles.resultValue}>
                  {formatGrams(bakersOutcome.result.oilG)}
                </span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>総生地量</span>
                <span className={styles.resultValue}>
                  {formatGrams(bakersOutcome.result.totalDoughWeightG)}
                </span>
              </div>
            </div>
          ) : (
            <p className={styles.resultValueMuted}>—</p>
          )}

          {showBakersError ? (
            <p className={styles.error} role="alert">
              {bakersOutcome.error}
            </p>
          ) : (
            !bakersOutcome.result && (
              <p className={styles.hint}>
                加水率・塩・酵母と、総生地量または粉量を入力すると計算します。
              </p>
            )
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>ビガ / ポーリッシュ</h2>
        <p className={styles.sectionNote}>
          全体粉を preferment と main に按分します。上の配合結果の粉量を自動使用します。
        </p>

        <div className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="preferment-type">種類</label>
            <select
              id="preferment-type"
              value={prefermentType}
              onChange={(event) =>
                setPrefermentType(event.target.value as PrefermentType)
              }
            >
              <option value="poolish">ポーリッシュ (100% 加水)</option>
              <option value="biga">ビガ (50% 加水)</option>
            </select>
            <small>{prefermentTypeLabel(prefermentType)}</small>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="preferment-percent">preferment 粉比率 (%)</label>
              <input
                id="preferment-percent"
                inputMode="decimal"
                value={prefermentFlourPercent}
                onChange={(event) => setPrefermentFlourPercent(event.target.value)}
                placeholder="20"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="manual-preferment-flour">全体粉 (g)</label>
              <input
                id="manual-preferment-flour"
                inputMode="decimal"
                value={manualPrefermentFlourG}
                onChange={(event) => setManualPrefermentFlourG(event.target.value)}
                placeholder={
                  bakersOutcome.result
                    ? String(bakersOutcome.result.flourG)
                    : "配合結果または手入力"
                }
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="pref-hydration">preferment 加水率 (%)</label>
              <input
                id="pref-hydration"
                inputMode="decimal"
                value={prefermentHydrationPercent}
                onChange={(event) => setPrefermentHydrationPercent(event.target.value)}
                placeholder="省略時は種類のデフォルト"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="pref-yeast">preferment 酵母 (%)</label>
              <input
                id="pref-yeast"
                inputMode="decimal"
                value={prefermentYeastPercent}
                onChange={(event) => setPrefermentYeastPercent(event.target.value)}
                placeholder="省略時は種類のデフォルト"
              />
            </div>
          </div>
        </div>

        <div className={styles.results}>
          <h3 className={styles.resultsTitle}>按分結果</h3>
          {prefermentOutcome.result ? (
            <>
              <div className={styles.subsection}>
                <p className={styles.subsectionTitle}>Preferment</p>
                <div className={styles.resultGrid}>
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>粉</span>
                    <span className={styles.resultValue}>
                      {formatGrams(prefermentOutcome.result.prefermentFlourG)}
                    </span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>水</span>
                    <span className={styles.resultValue}>
                      {formatGrams(prefermentOutcome.result.prefermentWaterG)}
                    </span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>酵母</span>
                    <span className={styles.resultValue}>
                      {formatGrams(prefermentOutcome.result.prefermentYeastG)}
                    </span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>加水率</span>
                    <span className={styles.resultValue}>
                      {formatPercent(
                        prefermentOutcome.result.prefermentHydrationPercent,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.subsection}>
                <p className={styles.subsectionTitle}>Main 生地（残り）</p>
                <div className={styles.resultGrid}>
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>粉</span>
                    <span className={styles.resultValue}>
                      {formatGrams(prefermentOutcome.result.mainFlourG)}
                    </span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>水</span>
                    <span className={styles.resultValue}>
                      {formatGrams(prefermentOutcome.result.mainWaterG)}
                    </span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>全体の水</span>
                    <span className={styles.resultValue}>
                      {formatGrams(prefermentOutcome.result.totalWaterG)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className={styles.resultValueMuted}>—</p>
          )}

          {showPrefermentError ? (
            <p className={styles.error} role="alert">
              {prefermentOutcome.error}
            </p>
          ) : (
            !prefermentOutcome.result && (
              <p className={styles.hint}>
                全体粉と preferment 粉比率を入力すると按分します。
              </p>
            )
          )}
        </div>
      </section>

      <p className={styles.footerNote}>
        数値は Baker&apos;s % の単純算術です。DIE・Learning・店舗プロファイルとは連動しません。
      </p>
    </div>
  );
}
