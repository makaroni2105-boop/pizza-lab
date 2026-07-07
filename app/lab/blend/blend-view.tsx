"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import {
  createFlourBlend,
  createDefaultBlendComponents,
  deleteFlourBlend,
  formatComponentLabel,
  generateFlourBlendComponentId,
  listFlourBlends,
  parseComponentLabel,
  saveFlourBlend,
  sumFlourBlendPercents,
  isFlourBlendPercentValid,
  type FlourBlend,
} from "@/lib/lab";
import type { FlourBlendComponent, FlourBlendMethodContext } from "@/types/lab";
import {
  DEMO_SHOP_ID,
  getSelectedShopId,
} from "@/lib/profile/profile-storage";

import styles from "./blend.module.css";

interface ComponentDraft {
  flourId: string;
  flourName: string;
  percent: string;
  role: string;
}

const METHOD_LABELS: Record<FlourBlendMethodContext, string> = {
  napoli: "Napoli",
  ny: "NY",
  roma: "Roma",
  stg: "STG",
  vpn: "VPN",
  apn: "APN",
  custom: "カスタム",
};

const MAX_COMPONENTS = 5;

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

function componentDraftFromStored(component: FlourBlendComponent): ComponentDraft {
  const { flourName, role } = parseComponentLabel(component.label);

  return {
    flourId: component.flourId,
    flourName,
    role,
    percent: String(component.percent),
  };
}

function createEmptyComponentDraft(): ComponentDraft {
  return {
    flourId: generateFlourBlendComponentId(),
    flourName: "",
    role: "",
    percent: "",
  };
}

function draftsToComponents(drafts: ComponentDraft[]): FlourBlendComponent[] {
  return drafts.map((draft) => ({
    flourId: draft.flourId,
    percent: Number(draft.percent),
    label: formatComponentLabel(draft.flourName, draft.role),
  }));
}

function parsePercentTotal(drafts: ComponentDraft[]): number {
  return sumFlourBlendPercents(
    drafts.map((draft) => ({
      flourId: draft.flourId,
      percent: Number(draft.percent) || 0,
    })),
  );
}

export function BlendView() {
  const [blends, setBlends] = useState<FlourBlend[]>([]);
  const [shopId, setShopId] = useState(DEMO_SHOP_ID);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<FlourBlend | null>(null);
  const [editName, setEditName] = useState("");
  const [editMethodContext, setEditMethodContext] = useState<FlourBlendMethodContext | "">("");
  const [editNotes, setEditNotes] = useState("");
  const [editComponents, setEditComponents] = useState<ComponentDraft[]>([]);

  const refreshBlends = useCallback(() => {
    setBlends(listFlourBlends());
  }, []);

  useEffect(() => {
    setShopId(getSelectedShopId() ?? DEMO_SHOP_ID);
    refreshBlends();
  }, [refreshBlends]);

  const editTotal = useMemo(() => parsePercentTotal(editComponents), [editComponents]);
  const editPercentValid = useMemo(
    () => isFlourBlendPercentValid(draftsToComponents(editComponents)),
    [editComponents],
  );

  function startEditing(blend: FlourBlend) {
    setEditing(blend);
    setEditName(blend.name);
    setEditMethodContext(blend.methodContext ?? "");
    setEditNotes(blend.notes ?? "");
    setEditComponents(blend.components.map(componentDraftFromStored));
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const draft = createFlourBlend({
      shopId,
      name: newName,
      components: createDefaultBlendComponents(),
    });

    const result = saveFlourBlend(draft);

    if (!result.ok) {
      window.alert(result.errors.join("\n"));
      return;
    }

    setNewName("");
    refreshBlends();
    startEditing(result.blend);
  }

  function handleAddComponent() {
    if (editComponents.length >= MAX_COMPONENTS) {
      return;
    }

    setEditComponents((current) => [...current, createEmptyComponentDraft()]);
  }

  function handleRemoveComponent(flourId: string) {
    setEditComponents((current) => current.filter((item) => item.flourId !== flourId));
  }

  function updateComponent(flourId: string, patch: Partial<ComponentDraft>) {
    setEditComponents((current) =>
      current.map((item) => (item.flourId === flourId ? { ...item, ...patch } : item)),
    );
  }

  function handleSaveEditor() {
    if (!editing) {
      return;
    }

    const components = draftsToComponents(editComponents);
    const nextBlend: FlourBlend = {
      ...editing,
      name: editName.trim() || "無題のブレンド",
      methodContext: editMethodContext || undefined,
      notes: editNotes.trim() || null,
      components,
    };

    const result = saveFlourBlend(nextBlend);

    if (!result.ok) {
      window.alert(result.errors.join("\n"));
      return;
    }

    setEditing(result.blend);
    refreshBlends();
  }

  function handleDelete(id: string) {
    if (!window.confirm("この粉ブレンドを削除しますか？")) {
      return;
    }

    deleteFlourBlend(id);

    if (editing?.id === id) {
      setEditing(null);
    }

    refreshBlends();
  }

  return (
    <div className={styles.blend}>
      <header className={styles.header}>
        <h1>Flour Blend</h1>
        <p>
          粉に優劣はありません。STG も VPN も国産も、それぞれの個性を比率で組み合わせ、狙いを研究記録として残します。
        </p>
      </header>

      <nav className={styles.nav}>
        <Link href="/lab">Lab Mode</Link>
        <Link href="/lab/dna">Dough DNA</Link>
        <Link href="/lab/journal">Journal</Link>
        <Link href="/lab/comparison">Comparison</Link>
        <Link href="/quick">Quick Mode</Link>
        <Link href="/calculator">Calculator</Link>
        <Link href="/ask">Ask</Link>
        <Link href="/knowledge">Knowledge</Link>
      </nav>

      <span className={styles.badge}>粉の個性 · 比率 · 狙い · 優劣なし</span>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>新しい粉ブレンド</h2>
        <p className={styles.sectionNote}>
          まずは名前だけで下書きを作り、粉名・比率・役割・メモを足していきます。2 種類以上、合計 100% になるように調整してください。
        </p>

        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.field}>
            <label htmlFor="blend-name">ブレンド名</label>
            <input
              id="blend-name"
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="例: Caputo 70% + 国産 30% · 香り足し"
            />
          </div>

          <button className={styles.submit} type="submit">
            粉ブレンドを作成
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>ブレンド一覧</h2>
        <p className={styles.meta}>
          {blends.length} 件 · 店舗 ID: {shopId}
        </p>

        {blends.length === 0 ? (
          <p className={styles.empty}>
            まだ粉ブレンドがありません。上のフォームから、個性の配合記録を始めてください。
          </p>
        ) : (
          <div className={styles.list}>
            {blends.map((blend) => {
              const total = sumFlourBlendPercents(blend.components);
              const valid = isFlourBlendPercentValid(blend.components);

              return (
                <article
                  key={blend.id}
                  className={`${styles.card} ${editing?.id === blend.id ? styles.cardActive : ""}`}
                >
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{blend.name}</h3>
                    {blend.methodContext ? (
                      <span className={styles.methodBadge}>
                        {METHOD_LABELS[blend.methodContext]}
                      </span>
                    ) : null}
                  </div>

                  <p className={styles.cardMeta}>
                    {blend.components.length} 粉 · 合計 {total.toFixed(1)}%
                    {valid ? " · 100% OK" : " · 比率要調整"} · 更新{" "}
                    {formatDateTime(blend.updatedAt)}
                  </p>

                  <ul className={styles.componentPreview}>
                    {blend.components.map((component) => {
                      const { flourName, role } = parseComponentLabel(component.label);

                      return (
                        <li key={component.flourId}>
                          {flourName || "粉"} {component.percent}%
                          {role ? ` · ${role}` : ""}
                        </li>
                      );
                    })}
                  </ul>

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.editButton}
                      onClick={() => startEditing(blend)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDelete(blend.id)}
                    >
                      削除
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editing ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>編集 — {editing.name}</h2>
          <p className={styles.sectionNote}>
            各粉の個性と役割を記録します。正解の配合は一つではありません。うちの店の狙いとして残してください。
          </p>

          <div
            className={`${styles.totalBar} ${editPercentValid ? styles.totalValid : styles.totalInvalid}`}
          >
            <span>比率合計</span>
            <strong>
              {editTotal.toFixed(1)}% {editPercentValid ? "（100% OK）" : "（100% に調整）"}
            </strong>
          </div>

          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="edit-blend-name">ブレンド名</label>
              <input
                id="edit-blend-name"
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-method">製法コンテキスト（任意）</label>
              <select
                id="edit-method"
                value={editMethodContext}
                onChange={(event) =>
                  setEditMethodContext(event.target.value as FlourBlendMethodContext | "")
                }
              >
                <option value="">未設定 — 個性優先で記録</option>
                <option value="napoli">Napoli — 南イタリア文脈</option>
                <option value="ny">NY — 硬め・薄い個性</option>
                <option value="roma">Roma — ローマ系</option>
                <option value="stg">STG — 参考吸水（唯一解にしない）</option>
                <option value="vpn">VPN — 大会・認定文脈</option>
                <option value="apn">APN — 認定文脈</option>
                <option value="custom">カスタム — うち流</option>
              </select>
              <small>製法は提案の文脈であり、粉の優劣を決めません。</small>
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-notes">メモ（任意）</label>
              <textarea
                id="edit-notes"
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                placeholder="例: 国産を足して香りと消化の軽さを狙う。W 値は後で確認。"
              />
            </div>
          </div>

          <div className={styles.componentList}>
            {editComponents.map((component, index) => (
              <div key={component.flourId} className={styles.componentCard}>
                <div className={styles.componentCardHeader}>
                  <h3 className={styles.componentCardTitle}>粉 {index + 1}</h3>
                  {editComponents.length > 2 ? (
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleRemoveComponent(component.flourId)}
                    >
                      削除
                    </button>
                  ) : null}
                </div>

                <div className={styles.form}>
                  <div className={styles.field}>
                    <label htmlFor={`flour-name-${component.flourId}`}>粉名</label>
                    <input
                      id={`flour-name-${component.flourId}`}
                      type="text"
                      value={component.flourName}
                      onChange={(event) =>
                        updateComponent(component.flourId, { flourName: event.target.value })
                      }
                      placeholder="例: Caputo Pizzeria / 国産小麦"
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor={`flour-role-${component.flourId}`}>役割</label>
                    <input
                      id={`flour-role-${component.flourId}`}
                      type="text"
                      value={component.role}
                      onChange={(event) =>
                        updateComponent(component.flourId, { role: event.target.value })
                      }
                      placeholder="例: ベース / 香り / 伸展性"
                    />
                    <small>個性の方向性。良い・悪いではなく、配合上の役割です。</small>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor={`flour-percent-${component.flourId}`}>比率 (%)</label>
                    <input
                      id={`flour-percent-${component.flourId}`}
                      type="number"
                      min={0.1}
                      max={100}
                      step={0.1}
                      value={component.percent}
                      onChange={(event) =>
                        updateComponent(component.flourId, { percent: event.target.value })
                      }
                      placeholder="70"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {editComponents.length < MAX_COMPONENTS ? (
            <button
              type="button"
              className={styles.addButton}
              onClick={handleAddComponent}
            >
              + 粉を追加（最大 {MAX_COMPONENTS} 種類）
            </button>
          ) : null}

          <div className={styles.editorActions}>
            <button
              className={styles.submit}
              type="button"
              onClick={handleSaveEditor}
              disabled={!editPercentValid}
            >
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
        データはこのブラウザの localStorage（pizzalab-flour-blends-v1）にのみ保存されます。D1 /
        本番 DB にはまだ送りません。
      </p>
    </div>
  );
}
