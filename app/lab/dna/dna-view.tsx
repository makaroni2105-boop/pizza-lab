"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  countSetDNAScores,
  createDoughDNA,
  createEmptyDNAScores,
  deleteDoughDNA,
  listDoughDNA,
  saveDoughDNA,
  type DoughDNA,
} from "@/lib/lab";
import {
  DNA_KEYS,
  type DNAKey,
  type DNAPresetType,
  type DNAScores,
} from "@/types/lab";
import {
  DEMO_SHOP_ID,
  getSelectedShopId,
} from "@/lib/profile/profile-storage";

import styles from "./dna.module.css";

const DNA_KEY_LABELS: Record<DNAKey, string> = {
  lightness: "軽さ",
  chewiness: "もち感",
  bite: "歯切れ",
  extensibility: "伸展性",
  elasticity: "弾力",
  aroma: "香り",
  crustColor: "焼色",
  bakeTolerance: "焼成耐性",
  cornicioneForm: "コルニチョーネ",
  airiness: "気泡",
  centerTexture: "中心食感",
  crustTexture: "クラスト",
  mouthfeel: "口溶け",
  digestibility: "消化の軽さ",
  crispness: "サク感",
  moistness: "しっとり",
  reheatTolerance: "焼き戻し",
};

const PRESET_LABELS: Record<DNAPresetType, string> = {
  business: "営業",
  competition: "大会",
  research: "研究",
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

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseScoreInput(raw: string): number | null {
  if (raw.trim() === "") {
    return null;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    return null;
  }

  return clampScore(value);
}

export function DnaView() {
  const [profiles, setProfiles] = useState<DoughDNA[]>([]);
  const [shopId, setShopId] = useState(DEMO_SHOP_ID);
  const [newName, setNewName] = useState("");
  const [newPresetType, setNewPresetType] = useState<DNAPresetType>("research");
  const [editing, setEditing] = useState<DoughDNA | null>(null);
  const [editName, setEditName] = useState("");
  const [editPresetType, setEditPresetType] = useState<DNAPresetType>("research");
  const [editDescription, setEditDescription] = useState("");
  const [editScores, setEditScores] = useState<DNAScores>(createEmptyDNAScores());

  const refreshProfiles = useCallback(() => {
    setProfiles(listDoughDNA());
  }, []);

  useEffect(() => {
    setShopId(getSelectedShopId() ?? DEMO_SHOP_ID);
    refreshProfiles();
  }, [refreshProfiles]);

  function startEditing(profile: DoughDNA) {
    setEditing(profile);
    setEditName(profile.name);
    setEditPresetType(profile.presetType);
    setEditDescription(profile.description ?? "");
    setEditScores({ ...createEmptyDNAScores(), ...profile.scores });
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const draft = createDoughDNA({
      shopId,
      name: newName,
      presetType: newPresetType,
    });

    const result = saveDoughDNA(draft);

    if (!result.ok) {
      window.alert(result.errors.join("\n"));
      return;
    }

    setNewName("");
    refreshProfiles();
    startEditing(result.profile);
  }

  function handleScoreChange(key: DNAKey, value: number | null) {
    setEditScores((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSaveEditor() {
    if (!editing) {
      return;
    }

    const nextProfile: DoughDNA = {
      ...editing,
      name: editName.trim() || "無題の DNA",
      presetType: editPresetType,
      description: editDescription.trim() || undefined,
      scores: editScores,
    };

    const result = saveDoughDNA(nextProfile);

    if (!result.ok) {
      window.alert(result.errors.join("\n"));
      return;
    }

    setEditing(result.profile);
    refreshProfiles();
  }

  function handleDelete(id: string) {
    if (!window.confirm("この DNA プロファイルを削除しますか？")) {
      return;
    }

    deleteDoughDNA(id);

    if (editing?.id === id) {
      setEditing(null);
    }

    refreshProfiles();
  }

  return (
    <div className={styles.dna}>
      <header className={styles.header}>
        <h1>Dough DNA</h1>
        <p>
          世界の正解ではなく、うちの100点。NY の硬さも VPN の軽さも、それぞれの個性として記録します。
        </p>
      </header>

      <nav className={styles.nav}>
        <Link href="/lab">Lab Mode</Link>
        <Link href="/lab/blend">Flour Blend</Link>
        <Link href="/lab/journal">Journal</Link>
        <Link href="/lab/comparison">Comparison</Link>
        <Link href="/quick">Quick Mode</Link>
        <Link href="/calculator">Calculator</Link>
        <Link href="/ask">Ask</Link>
        <Link href="/knowledge">Knowledge</Link>
      </nav>

      <span className={styles.badge}>その店の100点 · 個性 · 優劣なし</span>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>新しい DNA プロファイル</h2>
        <p className={styles.sectionNote}>
          粉や製法に正解はありません。まずは名前と用途だけ決め、17 項目は段階的に育てていきます。
        </p>

        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.field}>
            <label htmlFor="dna-name">名前</label>
            <input
              id="dna-name"
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="例: 平日営業の理想 · VPN 大会用"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="dna-preset">用途</label>
            <select
              id="dna-preset"
              value={newPresetType}
              onChange={(event) => setNewPresetType(event.target.value as DNAPresetType)}
            >
              <option value="business">営業 — 毎日の店舗基準</option>
              <option value="competition">大会 — 一時的な理想像</option>
              <option value="research">研究 — 検証中の仮説</option>
            </select>
          </div>

          <button className={styles.submit} type="submit">
            DNA プロファイルを作成
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>DNA 一覧</h2>
        <p className={styles.meta}>
          {profiles.length} 件 · 店舗 ID: {shopId}
        </p>

        {profiles.length === 0 ? (
          <p className={styles.empty}>
            まだ DNA がありません。上のフォームから、その店の100点の器を作ってください。
          </p>
        ) : (
          <div className={styles.list}>
            {profiles.map((profile) => (
              <article
                key={profile.id}
                className={`${styles.card} ${editing?.id === profile.id ? styles.cardActive : ""}`}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{profile.name}</h3>
                  <span className={styles.presetBadge}>{PRESET_LABELS[profile.presetType]}</span>
                </div>

                <p className={styles.cardMeta}>
                  設定済み {countSetDNAScores(profile.scores)} / 17 項目 · 更新{" "}
                  {formatDateTime(profile.updatedAt)}
                </p>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => startEditing(profile)}
                  >
                    スコアを編集
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(profile.id)}
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
          <h2 className={styles.sectionTitle}>スコア編集 — {editing.name}</h2>
          <p className={styles.sectionNote}>
            0–100 はその店の100点基準です。未設定のまま残しても構いません。粉の個性や製法の違いを、優劣ではなく方向性として記録します。
          </p>

          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="edit-name">名前</label>
              <input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-preset">用途</label>
              <select
                id="edit-preset"
                value={editPresetType}
                onChange={(event) => setEditPresetType(event.target.value as DNAPresetType)}
              >
                <option value="business">営業</option>
                <option value="competition">大会</option>
                <option value="research">研究</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-description">うちの100点（任意）</label>
              <textarea
                id="edit-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="例: コルニチョーネは高く、中心は軽く。硬さよりも口溶けを優先。"
              />
              <small>職人の言葉で、その店だけの理想像を残します。</small>
            </div>
          </div>

          <div className={styles.scoreGrid}>
            {DNA_KEYS.map((key) => {
              const score = editScores[key];
              const displayValue = score ?? null;

              return (
                <div key={key} className={styles.scoreRow}>
                  <div className={styles.scoreHeader}>
                    <span className={styles.scoreLabel}>{DNA_KEY_LABELS[key]}</span>
                    <span
                      className={`${styles.scoreValue} ${displayValue === null ? styles.scoreValueUnset : ""}`}
                    >
                      {displayValue === null ? "未設定" : `${displayValue} 点`}
                    </span>
                  </div>

                  <div className={styles.scoreControls}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={displayValue ?? 50}
                      onChange={(event) => handleScoreChange(key, Number(event.target.value))}
                      aria-label={`${DNA_KEY_LABELS[key]} スコア`}
                    />
                    <input
                      className={styles.scoreNumber}
                      type="number"
                      min={0}
                      max={100}
                      value={displayValue ?? ""}
                      placeholder="—"
                      onChange={(event) => handleScoreChange(key, parseScoreInput(event.target.value))}
                      aria-label={`${DNA_KEY_LABELS[key]} 数値`}
                    />
                  </div>

                  {displayValue !== null ? (
                    <button
                      type="button"
                      className={styles.clearScoreButton}
                      onClick={() => handleScoreChange(key, null)}
                    >
                      未設定に戻す
                    </button>
                  ) : null}
                </div>
              );
            })}
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
        データはこのブラウザの localStorage（{`pizzalab-dna-v1`}）にのみ保存されます。D1 / 本番 DB にはまだ送りません。
      </p>
    </div>
  );
}
