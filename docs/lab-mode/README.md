# Lab Mode（Phase 4 設計 + 最小実装）

> **Status:** 設計固定 ✅ + localStorage 最小 UI ✅（2026-07-07）  
> **スコープ:** LabSession / DoughDNA / FlourBlend / DoughJournal / ComparisonRun  
> **未スコープ:** D1 / API / AI / DIE 深連携

---

## 1. 目的

Quick Mode（営業・30秒）から **Lab Mode（研究・制限なし）** へ拡張する。

| 原則 | 内容 |
|------|------|
| 粉は個性 | 優劣・ランキングなし |
| AI は研究パートナー | 先生・断定者ではない。Ask LLM は Phase 5 |
| その店の100点 | Dough DNA + Journal + Learning が同一 shopId スコープ |
| 製法の尊重 | STG / VPN / APN を Knowledge で参照。唯一解にしない |
| 既存を壊さない | DIE / Learning / Calculator / Ask / Quick UI は変更しない |

---

## 2. Quick Mode との違い

| 観点 | Quick Mode | Lab Mode |
|------|------------|----------|
| 目的 | 今日のレシピを最速 | 実験・最適化・記録 |
| 時間 | 30秒以内 | 制限なし |
| DIE 入力 | 最小（プリセット + 枚数） | Phase 4 最小 UI は DIE 未呼び出し |
| Dough DNA | 暗黙参照（UI 非表示） | `/lab/dna` で明示編集 |
| 粉ブレンド | 非表示 | `/lab/blend` |
| 研究記録 | Run 簡易メモ | `/lab/journal` + `/lab/comparison` |
| 永続化 | localStorage | Lab 専用 5 キー（localStorage） |

**共通:** 同一 DIE Core（`lib/die/`）。Learning Run は friction 学習に寄与（Lab からは未自動連携）。

---

## 3. エンティティ一覧

| エンティティ | 説明 | 詳細 | 実装 |
|-------------|------|------|------|
| **LabSession** | 1 回の研究セッション | [lab-session.md](./lab-session.md) | ✅ `/lab` |
| **DoughDNA** | その店の100点（17 食感） | [dough-dna.md](./dough-dna.md) | ✅ `/lab/dna` |
| **FlourBlend** | 粉比率・個性 | [flour-blend.md](./flour-blend.md) | ✅ `/lab/blend` |
| **DoughJournal** | 観察・仮説・次の一枚 | [journal.md](./journal.md) | ✅ `/lab/journal` |
| **ComparisonRun** | Side A/B 比較 | [comparison.md](./comparison.md) | ✅ `/lab/comparison` |

型: `types/lab.ts` — storage: `lib/lab/*-storage.ts`

---

## 4. localStorage キー（実装済み）

| キー | 内容 |
|------|------|
| `pizzalab-lab-sessions-v1` | LabSession[] |
| `pizzalab-dna-v1` | DoughDNA[] |
| `pizzalab-flour-blends-v1` | FlourBlend[] |
| `pizzalab-journal-v1` | DoughJournal[] |
| `pizzalab-comparisons-v1` | ComparisonRun[] |

D1 テーブル（将来案）: `pizza_lab_lab_sessions`, `pizza_lab_dough_dna`, … — **未 migration**

---

## 5. 画面（実装状態）

| パス | 画面 | 状態 |
|------|------|------|
| `/lab` | LabSession — 研究ノート下書き | ✅ Phase 4a |
| `/lab/dna` | Dough DNA — 17 スコア編集 | ✅ Phase 4b |
| `/lab/blend` | Flour Blend — 比率 100% | ✅ Phase 4c |
| `/lab/journal` | Journal — 5 セクション記録 | ✅ Phase 4d |
| `/lab/comparison` | Comparison — Side A/B | ✅ Phase 4e |
| `/lab/session/[id]` | Session 詳細 | ⬜ 将来 |

Quick / Profile / History / Calculator / Ask / Knowledge から Lab へリンク。

---

## 6. Learning Engine との関係

| データ | Learning 摩擦補正 | DNA 更新 | Journal |
|--------|-------------------|----------|---------|
| LearningRun | ✅ 既存 | 参照のみ | リンク可（将来） |
| DoughDNA.scores | 不使用 | ✅ 職人編集 | 参照 |
| DoughJournal | 不使用 | 不使用 | ✅ |
| ComparisonRun | 不使用 | 不使用 | journalEntryIds 予約 |

**Phase 4 実装:** Learning 純粋関数は変更していない。

---

## 7. Phase 4 未実装

| 項目 | 予定 |
|------|------|
| DIE 計算呼び出し（Lab UI から） | Phase 4+ |
| DNA → targetParams → DIE 逆算 | `lib/dna/` 新規（DIE Core 不変） |
| flour-master 連携・W 値プレビュー | Phase 4+ |
| D1 永続化 / Lab API | UI D1 切替時 |
| Ask LLM が Lab 文脈参照 | Phase 5 |
| sideC（3 面比較） | 将来 |

---

## 8. 関連ドキュメント

| ファイル | 内容 |
|----------|------|
| [lab-session.md](./lab-session.md) | LabSession |
| [dough-dna.md](./dough-dna.md) | DoughDNA |
| [flour-blend.md](./flour-blend.md) | FlourBlend |
| [journal.md](./journal.md) | DoughJournal |
| [comparison.md](./comparison.md) | ComparisonRun |
| [../phase-4-summary.md](../phase-4-summary.md) | Phase 4 完了サマリー |
| [../../PIZZALAB_MASTER.md](../../PIZZALAB_MASTER.md) | 全体仕様 |
| [../../ROADMAP.md](../../ROADMAP.md) | Phase 5 以降 |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 — Phase 4 設計固定 |
| 2026-07-07 | Phase 4a〜4e 最小 UI 実装を反映 |
