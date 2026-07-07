"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { getFlourMaster, getMixerMaster } from "@/lib/defaults/masters";
import {
  buildProfileFromForm,
  createDefaultShopProfile,
  deleteProfile,
  getProfile,
  getSelectedShopId,
  listProfiles,
  saveProfile,
  setSelectedShopId,
} from "@/lib/profile/profile-storage";
import type { ShopProfile, YeastType } from "@/types/profile";

import styles from "./profile.module.css";

type View = "list" | "edit";

const FLOUR_OPTIONS = getFlourMaster().flours.slice(0, 8);
const MIXER_TYPES = Object.entries(getMixerMaster().types).map(([key, entry]) => ({
  value: key,
  label: entry.label.ja,
}));
const MIXER_MODELS = getMixerMaster().models;

function formatUpdatedAt(iso?: string): string {
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

interface ProfileFormProps {
  profile: ShopProfile | null;
  onSaved: (profile: ShopProfile) => void;
  onCancel: () => void;
}

function ProfileForm({ profile, onSaved, onCancel }: ProfileFormProps) {
  const base = profile ?? createDefaultShopProfile("新しい店舗");

  const [name, setName] = useState(base.name);
  const [primaryFlourId, setPrimaryFlourId] = useState(base.flour.primaryFlourId);
  const [mixerType, setMixerType] = useState(base.mixer.type);
  const [mixerModelId, setMixerModelId] = useState(base.mixer.modelId ?? "");
  const [hydrationPercent, setHydrationPercent] = useState(
    String(base.method.hydrationPercent ?? 65),
  );
  const [saltPercent, setSaltPercent] = useState(String(base.method.saltPercent ?? 2.5));
  const [yeastType, setYeastType] = useState<YeastType>(base.method.yeastType ?? "dry");
  const [yeastPercent, setYeastPercent] = useState(String(base.method.yeastPercent ?? 0.2));
  const [defaultDdt, setDefaultDdt] = useState(String(base.ddt.defaultDdt ?? 24));
  const [ballWeightG, setBallWeightG] = useState(String(base.method.ballWeightG ?? 250));
  const [fermentationHours, setFermentationHours] = useState(
    String(base.method.fermentationHours ?? 24),
  );
  const [error, setError] = useState<string | null>(null);

  const filteredModels = useMemo(
    () => MIXER_MODELS.filter((model) => model.type === mixerType),
    [mixerType],
  );

  useEffect(() => {
    if (filteredModels.length === 0) {
      return;
    }

    const exists = filteredModels.some((model) => model.id === mixerModelId);
    if (!exists) {
      setMixerModelId(filteredModels[0].id);
    }
  }, [filteredModels, mixerModelId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const hydration = Number(hydrationPercent);
    const salt = Number(saltPercent);
    const yeast = Number(yeastPercent);
    const ddt = Number(defaultDdt);
    const ballWeight = Number(ballWeightG);
    const fermentHours = Number(fermentationHours);

    if (!name.trim()) {
      setError("店舗名を入力してください");
      return;
    }

    if (
      !Number.isFinite(hydration) ||
      !Number.isFinite(salt) ||
      !Number.isFinite(yeast) ||
      !Number.isFinite(ddt) ||
      !Number.isFinite(ballWeight) ||
      !Number.isFinite(fermentHours)
    ) {
      setError("数値項目を正しく入力してください");
      return;
    }

    if (!mixerModelId) {
      setError("ミキサーモデルを選択してください");
      return;
    }

    const nextProfile = buildProfileFromForm({
      id: profile?.id,
      name,
      primaryFlourId,
      mixerType,
      mixerModelId,
      hydrationPercent: hydration,
      saltPercent: salt,
      yeastType,
      yeastPercent: yeast,
      defaultDdt: ddt,
      ballWeightG: ballWeight,
      fermentationHours: fermentHours,
      existing: profile,
    });

    onSaved(saveProfile(nextProfile));
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.sectionTitle}>基本</p>

      <div className={styles.field}>
        <label htmlFor="shopName">店舗名</label>
        <input
          id="shopName"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <small>この店の「100点」を学習するための土台になります</small>
      </div>

      <div className={styles.field}>
        <label htmlFor="primaryFlourId">主力粉</label>
        <select
          id="primaryFlourId"
          value={primaryFlourId}
          onChange={(event) => setPrimaryFlourId(event.target.value)}
        >
          {FLOUR_OPTIONS.map((flour) => {
            const label =
              "name" in flour &&
              flour.name &&
              typeof flour.name === "object" &&
              "ja" in flour.name
                ? String(flour.name.ja)
                : flour.id;

            return (
              <option key={flour.id} value={flour.id}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      <p className={styles.sectionTitle}>ミキサー</p>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="mixerType">種別</label>
          <select
            id="mixerType"
            value={mixerType}
            onChange={(event) =>
              setMixerType(event.target.value as ShopProfile["mixer"]["type"])
            }
          >
            {MIXER_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="mixerModelId">モデル</label>
          <select
            id="mixerModelId"
            value={mixerModelId}
            onChange={(event) => setMixerModelId(event.target.value)}
          >
            {filteredModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.maker} {model.model}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className={styles.sectionTitle}>配合・発酵（参考の初期値）</p>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="hydrationPercent">加水率 (%)</label>
          <input
            id="hydrationPercent"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={hydrationPercent}
            onChange={(event) => setHydrationPercent(event.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="saltPercent">塩 (%)</label>
          <input
            id="saltPercent"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={saltPercent}
            onChange={(event) => setSaltPercent(event.target.value)}
            required
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="yeastType">酵母</label>
          <select
            id="yeastType"
            value={yeastType}
            onChange={(event) => setYeastType(event.target.value as YeastType)}
          >
            <option value="dry">ドライ</option>
            <option value="fresh">生酵母</option>
            <option value="sourdough">サワー</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="yeastPercent">酵母量 (%)</label>
          <input
            id="yeastPercent"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={yeastPercent}
            onChange={(event) => setYeastPercent(event.target.value)}
            required
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="defaultDdt">目標 DDT (°C)</label>
          <input
            id="defaultDdt"
            type="number"
            inputMode="decimal"
            step="0.5"
            value={defaultDdt}
            onChange={(event) => setDefaultDdt(event.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="ballWeightG">標準ボール (g)</label>
          <input
            id="ballWeightG"
            type="number"
            inputMode="numeric"
            value={ballWeightG}
            onChange={(event) => setBallWeightG(event.target.value)}
            required
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="fermentationHours">発酵時間 (h)</label>
        <input
          id="fermentationHours"
          type="number"
          inputMode="decimal"
          step="0.5"
          value={fermentationHours}
          onChange={(event) => setFermentationHours(event.target.value)}
          required
        />
      </div>

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}

      <button className={styles.button} type="submit">
        保存する
      </button>
      <button className={styles.linkButton} type="button" onClick={onCancel}>
        キャンセル
      </button>
    </form>
  );
}

export function ProfileManager() {
  const [view, setView] = useState<View>("list");
  const [profiles, setProfiles] = useState<ShopProfile[]>([]);
  const [selectedShopId, setSelectedShopIdState] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setProfiles(listProfiles());
    setSelectedShopIdState(getSelectedShopId());
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);
  }, [refresh]);

  const editingProfile = editingId ? getProfile(editingId) : null;

  function handleSelectForQuick(shopId: string) {
    setSelectedShopId(shopId);
    setSelectedShopIdState(shopId);
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`「${name}」を削除しますか？`)) {
      return;
    }

    deleteProfile(id);
    refresh();
  }

  function handleSaved(profile: ShopProfile) {
    setSelectedShopId(profile.id);
    setSelectedShopIdState(profile.id);
    setView("list");
    setEditingId(null);
    refresh();
  }

  if (!ready) {
    return null;
  }

  return (
    <div className={styles.profile}>
      <header className={styles.header}>
        <h1>店舗プロファイル</h1>
        <p>
          その店の条件を登録しておくと、Quick Mode の推奨がより店らしくなります（学習の土台になります）。
        </p>
      </header>

      <nav className={styles.nav}>
        <Link href="/quick">Quick Mode へ</Link>
        <Link href="/die/history">Run History</Link>
      </nav>

      {view === "list" ? (
        <>
          <button
            className={styles.button}
            type="button"
            onClick={() => {
              setEditingId(null);
              setView("edit");
            }}
          >
            新規作成
          </button>

          {profiles.length === 0 ? (
            <p className={styles.empty}>
              保存済みプロファイルはまだありません。サンプル店舗は Quick Mode でそのまま使えます。
            </p>
          ) : (
            <div className={styles.list}>
              {profiles.map((profile) => {
                const isSelected = selectedShopId === profile.id;

                return (
                  <article
                    key={profile.id}
                    className={`${styles.listItem} ${
                      isSelected ? styles.listItemSelected : ""
                    }`}
                  >
                    <div className={styles.listItemHeader}>
                      <h2 className={styles.listItemTitle}>{profile.name}</h2>
                      {isSelected ? <span className={styles.badge}>Quick 使用中</span> : null}
                    </div>
                    <p className={styles.listItemMeta}>
                      加水 {profile.method.hydrationPercent}% / DDT{" "}
                      {profile.ddt.defaultDdt}°C / 更新{" "}
                      {formatUpdatedAt(profile.updatedAt)}
                    </p>
                    <div className={styles.actions}>
                      <button
                        className={styles.linkButton}
                        type="button"
                        onClick={() => handleSelectForQuick(profile.id)}
                      >
                        Quick で使う
                      </button>
                      <button
                        className={styles.linkButton}
                        type="button"
                        onClick={() => {
                          setEditingId(profile.id);
                          setView("edit");
                        }}
                      >
                        編集
                      </button>
                      <button
                        className={styles.dangerButton}
                        type="button"
                        onClick={() => handleDelete(profile.id, profile.name)}
                      >
                        削除
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className={styles.note}>
            データはこの端末のブラウザ（localStorage）にのみ保存されます。
          </p>
        </>
      ) : (
        <ProfileForm
          profile={editingProfile}
          onSaved={handleSaved}
          onCancel={() => {
            setView("list");
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}
