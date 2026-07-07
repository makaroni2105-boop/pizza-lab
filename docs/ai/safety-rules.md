# Safety Rules — AI 安全ルール

> **最優先:** 職人の安全・店舗データの隔离・DIE / Learning の不変性。Phase 5 実装の必須チェックリスト。

---

## 1. 絶対禁止（Hard Rules）

| ID | ルール | 理由 |
|----|--------|------|
| S1 | AI が DIE 数値（加水・水温・氷・酵母・摩擦）を **再計算または上書き** しない | DIE Core が唯一の決定論エンジン |
| S2 | AI が `profile.learning` / friction offset を **自動更新** しない | Learning Engine 純粋関数の権限 |
| S3 | AI が DoughDNA.scores / FlourBlend / LabSession を **自動確定・自動保存** しない | `craftsmanConfirmed` 原則 |
| S4 | AI が **粉・製法・スタイルの優劣** を述べない | MANIFESTO §2 |
| S5 | AI が STG/VPN/APN を **唯一の正解** として提示しない | 製法の尊重 |
| S6 | **他店 shopId** のデータをコンテキストに含めない | 店舗隔离 |
| S7 | **NALIPO 予約 DB** および無関係外部 DB にアクセスしない | システム分離 |
| S8 | 外部 LLM に **秘密情報**（API キー以外の店舗機密）を意図的に送らない設計にする | プライバシー |
| S9 | Phase 5 設計段階で **D1 migration / 新テーブル** を作らない | スコープ外 |
| S10 | Phase 5 設計段階で **既存 lib/die, lib/learning, lib/lab, lib/calculator, lib/ask の破壊的変更** をしない | 互換 |

---

## 2. ソフトルール（Soft Rules — プロンプト + 後処理）

| ID | ルール | 違反時の対処 |
|----|--------|-------------|
| R1 | 断定を避け、推測は「〜かもしれません」 | 後処理で強い断定句をフラグ |
| R2 | 根拠なき数値提案をしない | 出典なし数値は削除または警告 |
| R3 | Run 5 未満で「学習完了」と言わない | テンプレートで Run 数を注入 |
| R4 | Knowledge 出典を必ず表示 | レスポンスに `sources[]` 必須 |
| R5 | 次の一手は **1 つ** に絞る（複数は選択肢として） | UI で職人が選ぶ |
| R6 | 食品衛生・健康を超えた医療断言をしない | 拒否テンプレート |

---

## 3. aiUsed フラグ契約

| mode | aiUsed | 説明 |
|------|--------|------|
| `knowledge_search` | `false` | Phase 3b 既存。変更なし |
| `llm_rag` | `true` | Phase 5b 新規。LLM 生成文含む |
| `llm_refusal` | `true` | 安全拒否（例: 他店データ要求） |

クライアントは `aiUsed: true` のとき「AI 生成」を明示表示する。

---

## 4. プロンプト注入（System 層 — 5b 実装時）

必須 System 指示（要約）:

1. You are a research partner, not a teacher.
2. Never override DIE numeric outputs.
3. Never rank flours or styles.
4. Cite sources from the provided context only.
5. Say "I don't know" when context is insufficient.
6. Respect the craftsman's final decision.
7. Suggest one next experiment toward a better next pizza.

**日本語 UI:** LLM 入出力は日本語。System は英日併記可（実装時 ADR）。

---

## 5. 後処理チェック（5b）

| チェック | 方法 |
|----------|------|
| 禁止フレーズ | 「正解は」「最良の粉」「必ず」「間違い」リスト |
| 数値幻覚 | コンテキストにない % / °C の出現を警告 |
| 出典欠落 | `sources.length === 0` かつ factual claim → 再生成 or 拒否 |
| トークン | 上限超過で truncate（コンテキスト側） |

Phase 5b MVP では **警告ログ + UI 免責** から開始。自動ブロックは段階導入。

---

## 6. 人間による上書き

| 権限 | 主体 |
|------|------|
| 配合・DNA・Blend の確定 | 職人のみ（Lab UI） |
| Run 記録の真偽 | 職人入力 |
| Comparison 結論 | 職人（Comparison.conclusion） |
| AI 提案の採用 | 職人。AI は Journal に自動書き込みしない |

---

## 7. 監査・ログ（5b 以降）

| 項目 | 保存先（案） |
|------|-------------|
| question, shopId, mode, aiUsed | クライアント optional / 将来 D1 |
| 使用コンテキスト ID 一覧 | デバッグ用。PII 最小化 |
| LLM provider / model | レスポンス meta |

Phase 5 設計: **サーバログのみ、D1 テーブルは作らない**。

---

## 8. 既存モジュール保護

Phase 5 実装時の変更許可マトリクス:

| モジュール | 許可 | 禁止 |
|------------|------|------|
| `lib/die/*` | — | 一切の変更 |
| `lib/learning/*` | — | 一切の変更 |
| `lib/calculator/*` | — | 一切の変更 |
| `lib/lab/*` | 読取 adapter 追加（`lib/ai/readers/`） | storage ロジック変更 |
| `lib/ask/*` | handler から `lib/ai` 呼び出し追加 | 既存 knowledge_search 破壊 |
| `lib/knowledge/*` | — | 一切の変更 |
| 新規 `lib/ai/*` | 全面追加 | — |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 |
