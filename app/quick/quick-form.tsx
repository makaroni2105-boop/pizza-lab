"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { applyStoredLearningToProfile } from "@/lib/learning/learning-storage";
import {
  DEFAULT_WEATHER_COORDINATES,
  type WeatherApiResponse,
} from "@/lib/weather/weather-types";
import { OpenWeatherAttribution } from "@/lib/weather/openweather-attribution";
import { getDemoShopProfile } from "@/lib/profile/demo-profiles";
import {
  DEMO_SHOP_ID,
  getDefaultPresetId,
  getQuickShopOptions,
  getSelectedShopId,
  resolveQuickShopSelection,
  setSelectedShopId,
  type QuickShopOption,
} from "@/lib/profile/profile-storage";
import type { DieOutput } from "@/types/die";
import type { ShopProfile } from "@/types/profile";

import styles from "./quick.module.css";
import { QuickRunRecord } from "./quick-run-record";

/** POST /api/die/quick レスポンス（UI 用） */
interface DieQuickApiSuccessResponse {
  success: true;
  output: DieOutput;
  incompleteBlocks: string[];
}

interface DieQuickApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type DieQuickApiResponse = DieQuickApiSuccessResponse | DieQuickApiErrorResponse;

function defaultUseTimeLocalValue(): string {
  const date = new Date();
  date.setHours(date.getHours() + 24);
  date.setMinutes(0, 0, 0);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(iso: string): string {
  if (!iso) {
    return "—";
  }

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

function formatGrams(value: number): string {
  return `${Math.round(value).toLocaleString("ja-JP")} g`;
}

function confidenceMessage(level: DieOutput["confidence"]["level"]): string {
  switch (level) {
    case "high":
      return "信頼度: 高 — いまの設定でおおむね妥当な推奨です";
    case "medium":
      return "信頼度: 中 — 一部推定値を使用中です";
    case "low":
      return "信頼度: 低 — 設定を見直すと精度が上がる可能性があります";
  }
}

function resolveProfileForShop(
  shopId: string,
  shopOptions: QuickShopOption[],
): ShopProfile | null {
  const option = shopOptions.find((item) => item.shopId === shopId);

  if (option?.profile) {
    return option.profile;
  }

  if (shopId === DEMO_SHOP_ID) {
    return getDemoShopProfile(DEMO_SHOP_ID);
  }

  return null;
}

export function QuickForm() {
  const [shopOptions, setShopOptions] = useState<QuickShopOption[]>([]);
  const [selectedShopId, setSelectedShopIdState] = useState(DEMO_SHOP_ID);
  const [presetId, setPresetId] = useState("preset-1");
  const [pizzaCount, setPizzaCount] = useState("40");
  const [ballWeightG, setBallWeightG] = useState("250");
  const [shopRoomTempC, setShopRoomTempC] = useState("");
  const [latitude, setLatitude] = useState(
    String(DEFAULT_WEATHER_COORDINATES.latitude),
  );
  const [longitude, setLongitude] = useState(
    String(DEFAULT_WEATHER_COORDINATES.longitude),
  );
  const [weatherSnapshot, setWeatherSnapshot] = useState<{
    ambientTempC: number;
    ambientHumidityPct: number;
  } | null>(null);
  const [weatherNote, setWeatherNote] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [useTimeLocal, setUseTimeLocal] = useState(defaultUseTimeLocalValue);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DieOutput | null>(null);
  const [incompleteBlocks, setIncompleteBlocks] = useState<string[]>([]);

  const activeProfile = useMemo(
    () => resolveProfileForShop(selectedShopId, shopOptions),
    [selectedShopId, shopOptions],
  );

  const profileForLearning = useMemo(() => {
    const base = activeProfile ?? getDemoShopProfile(DEMO_SHOP_ID);
    return base ? applyStoredLearningToProfile(base) : null;
  }, [activeProfile]);

  const refreshShopOptions = useCallback(() => {
    setShopOptions(getQuickShopOptions());
  }, []);

  const presetOptions = useMemo(() => {
    const profile = activeProfile ?? getDemoShopProfile(DEMO_SHOP_ID);
    return profile?.presets ?? [];
  }, [activeProfile]);

  useEffect(() => {
    const options = getQuickShopOptions();
    setShopOptions(options);

    const storedShopId = getSelectedShopId();
    const initialShopId =
      storedShopId && options.some((option) => option.shopId === storedShopId)
        ? storedShopId
        : DEMO_SHOP_ID;

    setSelectedShopIdState(initialShopId);

    const profile = resolveProfileForShop(initialShopId, options);
    setPresetId(getDefaultPresetId(profile));
    setBallWeightG(String(profile?.method.ballWeightG ?? 250));
  }, []);

  function handleShopChange(shopId: string) {
    setSelectedShopIdState(shopId);
    setSelectedShopId(shopId);

    const profile = resolveProfileForShop(shopId, shopOptions);
    setPresetId(getDefaultPresetId(profile));
    setBallWeightG(String(profile?.method.ballWeightG ?? 250));
  }

  async function handleFetchWeather() {
    setWeatherLoading(true);
    setWeatherNote(null);

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setWeatherNote("緯度・経度を正しく入力してください");
      setWeatherLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
      });
      const response = await fetch(`/api/weather?${params.toString()}`);
      const data = (await response.json()) as WeatherApiResponse;

      if (!data.success) {
        setWeatherNote(data.error.message);
        return;
      }

      setWeatherSnapshot({
        ambientTempC: data.weather.ambientTempC,
        ambientHumidityPct: data.weather.ambientHumidityPct,
      });
      setWeatherNote(
        data.cached
          ? `外気 ${data.weather.ambientTempC.toFixed(1)}°C / 湿度 ${Math.round(data.weather.ambientHumidityPct)}%（キャッシュ）`
          : `外気 ${data.weather.ambientTempC.toFixed(1)}°C / 湿度 ${Math.round(data.weather.ambientHumidityPct)}% を取得しました`,
      );
    } catch {
      setWeatherNote("天気情報を取得できませんでした。手入力または既定値をご利用ください");
    } finally {
      setWeatherLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setIncompleteBlocks([]);

    const count = Number(pizzaCount);
    const weight = Number(ballWeightG);
    const roomTemp =
      shopRoomTempC.trim() === "" ? undefined : Number(shopRoomTempC);

    if (!Number.isFinite(count) || count <= 0) {
      setError("作る枚数を正しく入力してください");
      setLoading(false);
      return;
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      setError("1枚重量を正しく入力してください");
      setLoading(false);
      return;
    }

    if (roomTemp !== undefined && !Number.isFinite(roomTemp)) {
      setError("店舗室温を正しく入力してください");
      setLoading(false);
      return;
    }

    const useTimeIso = useTimeLocal
      ? new Date(useTimeLocal).toISOString()
      : undefined;

    const { shopId, profile } = resolveQuickShopSelection(selectedShopId);
    const baseProfile = profile ?? getDemoShopProfile(shopId);

    const body: Record<string, unknown> = {
      mode: "quick",
      shopId,
      presetId,
      batch: {
        pizzaCount: count,
        ballWeightG: weight,
      },
      environment:
        roomTemp !== undefined ? { shopRoomTempC: roomTemp } : undefined,
      useTime: useTimeIso,
    };

    if (baseProfile) {
      body.profile = applyStoredLearningToProfile(baseProfile);
    }

    if (weatherSnapshot) {
      body.weather = weatherSnapshot;
    }

    try {
      const response = await fetch("/api/die/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as DieQuickApiResponse;

      if (!data.success) {
        setError(data.error.message);
        return;
      }

      setResult(data.output);
      setIncompleteBlocks(data.incompleteBlocks);
    } catch {
      setError("通信に失敗しました。もう一度お試しください");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.quick}>
      <header className={styles.header}>
        <h1>Quick Mode</h1>
        <p>今日の仕込み条件を、最小入力で確認できます（推奨値・参考値です）。</p>
      </header>

      <nav className={styles.nav}>
        <Link href="/profile">店舗プロファイル</Link>
        <Link href="/die/history">Run History</Link>
      </nav>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="shopId">店舗</label>
          <select
            id="shopId"
            value={selectedShopId}
            onChange={(event) => handleShopChange(event.target.value)}
          >
            {shopOptions.map((option) => (
              <option key={option.shopId} value={option.shopId}>
                {option.name}
              </option>
            ))}
          </select>
          <small>保存済み店舗を選ぶと、その設定を API に渡して計算します</small>
        </div>

        <div className={styles.field}>
          <label htmlFor="presetId">用途プロファイル</label>
          <select
            id="presetId"
            value={presetId}
            onChange={(event) => setPresetId(event.target.value)}
          >
            {presetOptions.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="pizzaCount">作る枚数</label>
            <input
              id="pizzaCount"
              type="number"
              inputMode="numeric"
              min={1}
              value={pizzaCount}
              onChange={(event) => setPizzaCount(event.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="ballWeightG">1枚重量 (g)</label>
            <input
              id="ballWeightG"
              type="number"
              inputMode="numeric"
              min={1}
              value={ballWeightG}
              onChange={(event) => setBallWeightG(event.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="shopRoomTempC">店舗室温 (°C)</label>
          <input
            id="shopRoomTempC"
            type="number"
            inputMode="decimal"
            step="0.5"
            placeholder="未入力なら推定"
            value={shopRoomTempC}
            onChange={(event) => setShopRoomTempC(event.target.value)}
          />
          <small>手入力がある場合、天気取得より優先されます</small>
        </div>

        <div className={styles.weatherSection}>
          <p className={styles.weatherTitle}>外気（任意）</p>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="latitude">緯度</label>
              <input
                id="latitude"
                type="number"
                inputMode="decimal"
                step="0.0001"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="longitude">経度</label>
              <input
                id="longitude"
                type="number"
                inputMode="decimal"
                step="0.0001"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
              />
            </div>
          </div>
          <button
            className={styles.weatherButton}
            type="button"
            onClick={handleFetchWeather}
            disabled={weatherLoading}
          >
            {weatherLoading ? "取得中…" : "外気を取得"}
          </button>
          {weatherNote ? (
            <p className={styles.note}>{weatherNote}</p>
          ) : (
            <p className={styles.note}>
              未取得の場合は DIE が既定値で補完します
            </p>
          )}
          <OpenWeatherAttribution compact />
        </div>

        <div className={styles.field}>
          <label htmlFor="useTime">使用予定時刻</label>
          <input
            id="useTime"
            type="datetime-local"
            value={useTimeLocal}
            onChange={(event) => setUseTimeLocal(event.target.value)}
          />
          <small>仕込み開始時刻の目安を逆算します</small>
        </div>

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? "計算中…" : "今日のレシピを出す"}
        </button>
      </form>

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}

      {result ? (
        <section className={styles.results} aria-live="polite">
          <h2>今日の推奨（参考）</h2>

          <article className={styles.card}>
            <h3>推奨水温</h3>
            <p className={styles.highlight}>
              {result.temperature.recommendedWaterTempC.toFixed(1)}°C
            </p>
            <p className={styles.note}>
              目標生地温 {result.temperature.targetDdtC}°C を前提とした参考値です
            </p>
          </article>

          <article className={styles.card}>
            <h3>氷</h3>
            <p className={styles.highlight}>
              {result.temperature.useIce
                ? `推奨 約 ${formatGrams(result.temperature.iceAmountG ?? 0)}`
                : "不要（この条件では）"}
            </p>
          </article>

          <article className={styles.card}>
            <h3>配合</h3>
            <dl className={styles.grid}>
              <dt>粉</dt>
              <dd>{formatGrams(result.recipe.flourG)}</dd>
              <dt>水</dt>
              <dd>{formatGrams(result.recipe.waterG)}</dd>
              <dt>塩</dt>
              <dd>{formatGrams(result.recipe.saltG)}</dd>
              <dt>酵母</dt>
              <dd>{formatGrams(result.recipe.yeastG)}</dd>
              {(result.recipe.oilG ?? 0) > 0 ? (
                <>
                  <dt>油</dt>
                  <dd>{formatGrams(result.recipe.oilG ?? 0)}</dd>
                </>
              ) : null}
              <dt>合計</dt>
              <dd>{formatGrams(result.recipe.totalDoughWeightG)}</dd>
            </dl>
          </article>

          <article className={styles.card}>
            <h3>酵母補正</h3>
            <p>
              {result.yeastAdjustment.adjustmentPct === 0
                ? "補正なし（標準条件に近い）"
                : `${result.yeastAdjustment.adjustmentPct > 0 ? "+" : ""}${result.yeastAdjustment.adjustmentPct.toFixed(1)}% → ${result.yeastAdjustment.adjustedYeastPct.toFixed(3)}%`}
            </p>
            <p className={styles.note}>{result.yeastAdjustment.reason}</p>
          </article>

          <article className={styles.card}>
            <h3>仕込み開始の目安</h3>
            <p className={styles.highlight}>
              {formatDateTime(result.fermentationSchedule.mixStartTime)}
            </p>
            <p className={styles.note}>
              使用予定 {formatDateTime(result.fermentationSchedule.useTime)} /
              発酵 {result.fermentationSchedule.adjustedHours}h（参考）
            </p>
            {result.fermentationSchedule.adjustmentReason ? (
              <p className={styles.note}>{result.fermentationSchedule.adjustmentReason}</p>
            ) : null}
          </article>

          <article className={styles.card}>
            <h3>信頼度</h3>
            <p
              className={`${styles.confidence} ${
                result.confidence.level === "low" ? styles.confidenceLow : ""
              }`}
            >
              {confidenceMessage(result.confidence.level)}
            </p>
            <p className={styles.note}>
              推定項目 {result.confidence.estimatedFieldCount} 件 / 学習 Run{" "}
              {result.confidence.learningRunCount} 回
            </p>
          </article>

          {incompleteBlocks.length > 0 ? (
            <p className={styles.note}>
              一部の項目は入力不足のため参考値です（{incompleteBlocks.join(", ")}）
            </p>
          ) : null}

          {profileForLearning ? (
            <QuickRunRecord
              shopId={selectedShopId}
              profile={profileForLearning}
              output={result}
              shopRoomTempC={
                shopRoomTempC.trim() === "" ? undefined : Number(shopRoomTempC)
              }
              onRecorded={() => {
                refreshShopOptions();
              }}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
