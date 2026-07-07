# LabSession — 研究セッション

> **正本:** 本ファイル（Phase 4 設計）  
> **実装:** 型定義 ✅ `types/lab.ts` + `lib/lab/` — UI / storage は Phase 4a

---

## 1. 定義

**1 回の Lab 研究** を束ねる容器。DIE 全入力・DNA/Blend スナップショット・Run ID・Journal ID を保持する。

Quick Mode の「1 回の仕込み」より広く、**仮説 → 配合 → 実測 → 記録** の単位。

---

## 2. フィールド（論理モデル）

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `id` | string | ✅ | UUID |
| `shopId` | string | ✅ | 店舗スコープ |
| `title` | string | | 例: 「VPN 65% 加水 24h 冷蔵」 |
| `status` | enum | ✅ | `draft` \| `running` \| `completed` \| `archived` |
| `presetType` | enum | | `business` \| `competition` \| `research` |
| `hypothesis` | string | | 職人の仮説（AI 未生成） |
| `dieInput` | DieInput snapshot | | DIE 全項目（`types/die` 準拠） |
| `dieOutput` | DieOutput snapshot | | 最後の DIE 結果 |
| `dnaSnapshot` | DNASnapshot | | セッション開始時 DNA（[dough-dna.md](./dough-dna.md)） |
| `blendSnapshot` | FlourBlendSnapshot | | 使用粉ブレンド（[flour-blend.md](./flour-blend.md)） |
| `runIds` | string[] | | 紐づく `LearningRun.id` |
| `journalEntryIds` | string[] | | 紐づく Journal ID |
| `comparisonIds` | string[] | | 本 Session を含む ComparisonRun |
| `summary` | string | | 職人によるセッション要約（将来 AI コンテキスト） |
| `tags` | string[] | | 自由タグ（発酵, VPN, テスト 等） |
| `createdAt` | ISO8601 | ✅ | |
| `updatedAt` | ISO8601 | ✅ | |
| `completedAt` | ISO8601 | | |

---

## 3. ライフサイクル

```
draft ──► running ──► completed ──► archived
   │                      │
   └──── DIE 計算 ────────┘
         Run 記録
         Journal 追加
```

| 状態 | 意味 |
|------|------|
| `draft` | 入力編集中。DIE 未実行可 |
| `running` | DIE 実行済み or Run 記録中 |
| `completed` | Run + 所見が揃った |
| `archived` | 履歴参照のみ |

---

## 4. Quick Mode との差

| 項目 | Quick | LabSession |
|------|-------|------------|
| 容器 | なし（都度 DIE） | 明示 Session |
| dieInput | プリセットから自動 | 全項目編集 |
| DNA / Blend | 非表示 | スナップショット保存 |
| hypothesis / summary | なし | ✅ |
| 履歴 | Run History のみ | Session + Journal + Compare |

---

## 5. DIE 連携（設計）

- **入力:** Lab UI → `POST /api/die/quick` または将来 `POST /api/die/lab`（Phase 4 実装時）
- **変更禁止:** `lib/die/*` ロジック。Lab は **同じ DieInput** をより多く埋めるだけ
- **blend → DIE:** FlourBlend の吸水補正を `dieInput.flour` / hydration に反映（アプリ層。DIE 内部変更なし）

---

## 6. 永続化（将来）

| 層 | 識別子 |
|----|--------|
| localStorage | `pizzalab-lab-sessions-v1` |
| D1（案） | `pizza_lab_lab_sessions` — JSON 列 + インデックス `shop_id`, `updated_at` |

**migration:** Phase 4 設計では DDL 未定義。Phase 4b D1 接続時に `docs/database/` へ追記。

---

## 7. 将来 AI 参照

| フィールド | AI 利用（Phase 5+） |
|-----------|---------------------|
| `hypothesis`, `summary` | 相談コンテキスト |
| `dieInput` / `dieOutput` | 数値説明（Ask + DIE 連携） |
| `dnaSnapshot` | 「100点」との差分説明 |
| `tags` | Knowledge 検索補助 |

AI は **Session を書き換えない**。職人確認後のみ summary 更新。

---

## 8. UI 方針（Phase 4）

- `/lab` — 新規 Session / 続きから
- セクション: 仮説 → DNA/Blend → DIE 入力 → 結果 → Run 記録 → Journal
- スマホ: 縦スクロール、セクション折りたたみ
- Quick への戻りリンク常設

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 |
