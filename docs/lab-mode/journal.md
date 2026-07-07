# DoughJournal — 研究ジャーナル

> **位置づけ:** Lab Mode の定性記録。Learning Run（数値）を補完する。

---

## 1. 定義

実験の **観察・仮説・結論・失敗メモ** を残すテキスト中心の記録。写真は Phase 4 以降（フィールドのみ予約）。

「その店の100点に近づく」過程を、数値だけでなく言葉で残す。

---

## 2. 型（DoughJournal）

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `id` | string | ✅ | UUID |
| `shopId` | string | ✅ | |
| `labSessionId` | string | | 紐づく LabSession |
| `runId` | string | | 紐づく LearningRun |
| `title` | string | ✅ | 短い見出し |
| `body` | string | ✅ | Markdown 可。観察本文 |
| `entryType` | enum | ✅ | 下表 |
| `craftsmanMood` | enum | | `curious` \| `satisfied` \| `unsure` \| `breakthrough` |
| `tags` | string[] | | 発酵, コルニチョーネ, VPN… |
| `dnaSnapshotId` | string | | 記録時 DNA 参照 |
| `photoIds` | string[] | | 将来。Phase 4 は空配列 |
| `createdAt` | ISO8601 | ✅ | |
| `updatedAt` | ISO8601 | ✅ | |

### entryType

| 値 | 用途 |
|----|------|
| `observation` | 焼成後・食べた後の観察 |
| `hypothesis` | 次回への仮説 |
| `procedure` | 手順メモ（Lab 独自操作） |
| `reflection` | 振り返り（その店100点との距離） |
| `reference` | 外部文献・動画・職人メモ（URL 可） |

---

## 3. Learning Engine との関係

| 項目 | Journal | LearningRun |
|------|---------|-------------|
| 摩擦学習 | ❌ | ✅ |
| 生地温実測 | 言及可 | ✅ 数値 |
| craftsmanScore | 言語で補足 | ✅ 1–5 |
| DIE 入力 | 参照 | snapshot |

Journal は **Learning 純粋関数に入らない**。Run History / Lab Session からリンク表示。

---

## 4. Quick Mode との差

Quick は `memo` 1 行（Run 内）。Journal は **独立エントリ**、検索・タグ・Session 横断。

---

## 5. 永続化（将来）

| 層 | 識別子 |
|----|--------|
| localStorage | `pizzalab-journal-v1` |
| D1（案） | `pizza_lab_journal_entries` — body TEXT, shop_id FK |
| Knowledge Tier 5 | 将来 craftsman 記事化（shop_id 必須）— Phase 4 では未連携 |

---

## 6. UI 方針（`/lab/journal`）

- 一覧: 日付降順、タグフィルタ
- 作成: title + body + entryType + Session/Run リンク
- 固定フッター: 「正解ではなく、記録はその店の研究資産」
- Ask へ「この Journal を文脈に」— Phase 5

---

## 7. 将来 AI 参照

| フィールド | 利用 |
|-----------|------|
| `body`（抜粋） | Ask RAG コンテキスト（職人確認後） |
| `entryType`, `tags` | 検索フィルタ |
| `craftsmanMood` | トーン調整（断定回避） |

AI は Journal を **自動生成しない**（Phase 4–5）。テンプレート提示のみ可（Phase 5 検討）。

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 |
