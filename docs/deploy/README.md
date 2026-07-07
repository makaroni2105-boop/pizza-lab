# Pizza-Lab デプロイ設計（Phase 6 正本）

> **Status:** 設計固定 — **本番デプロイ未実行**（2026-07-07）  
> **対象バージョン:** MASTER v1.4 / v1.5  
> **公開β:** まず **NALIPO 店主専用**（限定アクセス）

---

## 1. 目的

Pizza-Lab v1.4 を **安全に公開β** へ進めるため、Cloudflare / D1 / 環境変数 / 認証 / バックアップ / ロールバックの確認項目を固定する。

**Phase 6 設計ゲート:** 本ディレクトリ + MASTER §4.16 + ROADMAP Phase 6 設計 ✅

---

## 2. ドキュメント一覧

| ファイル | 内容 |
|----------|------|
| [production-checklist.md](./production-checklist.md) | 本番デプロイ前チェックリスト |
| [cloudflare-d1.md](./cloudflare-d1.md) | remote D1 作成・migration 手順（**未実行**） |
| [env-vars.md](./env-vars.md) | 環境変数一覧・外部 LLM 未接続方針 |
| [security.md](./security.md) | 認証・NALIPO 分離・公開βアクセス |
| [rollback.md](./rollback.md) | ロールバック・バックアップ手順 |

---

## 3. Phase 6 スコープ

| 項目 | Phase 6 設計 | 実行 |
|------|-------------|------|
| デプロイチェックリスト | ✅ | — |
| remote D1 手順書 | ✅ | ⬜ **まだ実行しない** |
| remote migration | 手順のみ | ⬜ **まだ実行しない** |
| UI → D1 切替 | 方針のみ | ⬜ Phase 6b 以降 |
| 外部 LLM 接続 | 禁止方針 | ⬜ Phase 6 以降 |
| 独自ドメイン | 方針のみ | ⬜ 公開β後 |
| 本番デプロイ | — | ⬜ **まだ実行しない** |

---

## 4. 不変原則

| 原則 | 内容 |
|------|------|
| NALIPO 分離 | `pizza_lab_db` / `pizza_lab_*` のみ。予約 DB と混在しない |
| DIE 不変 | 本番でも AI は DIE 計算に不使用 |
| localStorage 継続 | 公開β初期は UI 主永続化は localStorage のまま |
| mock LLM のみ | 外部 LLM API / API キーは接続しない |
| 危険操作ゲート | remote migration / 本番 deploy はチェックリスト + 二重確認 |

---

## 5. 関連ドキュメント

| ファイル | 内容 |
|----------|------|
| [docs/database/README.md](../database/README.md) | D1 スキーマ設計 |
| [docs/phase-3a-summary.md](../phase-3a-summary.md) | local D1 完了 |
| [docs/phase-5-summary.md](../phase-5-summary.md) | mock RAG 土台 |
| [PIZZALAB_MASTER.md](../../PIZZALAB_MASTER.md) | §4.16 |
| [ROADMAP.md](../../ROADMAP.md) | Phase 6 |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 — Phase 6 本番公開準備設計 |
