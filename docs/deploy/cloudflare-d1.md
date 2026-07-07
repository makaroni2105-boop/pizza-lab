# Cloudflare D1 — remote 作成・migration

> **⚠️ 本ドキュメントのコマンドは Phase 6 設計時点では実行しない。**  
> 実行前に [production-checklist.md](./production-checklist.md) §0 ゲートをすべて ✅ にすること。

---

## 1. 前提

| 項目 | 値 |
|------|-----|
| Cloudflare アカウント | Pizza-Lab 専用（NALIPO と **別**） |
| D1 データベース名 | `pizza_lab_db` |
| Worker binding | `DB` |
| Migration ディレクトリ | `migrations/` |
| 初回 migration | `0001_initial.sql`（6 テーブル `pizza_lab_*`） |
| local 状態 | `--local` 適用済み ✅ |

**NALIPO 分離:** 予約システムの D1 / wrangler プロジェクト / binding 名を **共有しない**。

---

## 2. remote D1 作成（未実行）

**確認ゲート:**
- [ ] production-checklist §0 完了
- [ ] NALIPO `database_name` と重複していないことを Cloudflare ダッシュボードで目視確認
- [ ] 実行担当者・日時を記録

```bash
# ⚠️ まだ実行しない — 手順書のみ
npx wrangler d1 create pizza_lab_db
```

**期待出力:** `database_id`（UUID）が返る。

---

## 3. wrangler.toml 更新（作成後のみ）

**確認ゲート:**
- [ ] §2 で取得した `database_id` が pizza_lab_db 専用である
- [ ] プレースホルダ ID を本番 ID に置換

```toml
# wrangler.toml — 本番 ID は remote 作成後のみ設定
[[d1_databases]]
binding = "DB"
database_name = "pizza_lab_db"
database_id = "<REMOTE_DATABASE_ID>"  # ⚠️ 00000000-... プレースホルダから置換
migrations_dir = "migrations"
```

**⚠️ まだコミット・deploy しない。** レビュー後に merge。

---

## 4. remote migration 適用（未実行）

**確認ゲート:**
- [ ] §3 完了
- [ ] **migration 前に D1 export バックアップ**（[rollback.md](./rollback.md) §2）
- [ ] `0001_initial.sql` が local と同一であることを diff 確認

```bash
# ⚠️ まだ実行しない
npx wrangler d1 migrations apply pizza_lab_db --remote
```

**検証（実行後）:**

```bash
# ⚠️ まだ実行しない
npx wrangler d1 execute pizza_lab_db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

**期待テーブル:** `pizza_lab_shops`, `pizza_lab_shop_profiles`, `pizza_lab_learning_runs`, `pizza_lab_knowledge_entries`, `pizza_lab_weather_cache`, `pizza_lab_sync_queue`, `d1_migrations`

---

## 5. local vs remote 方針

| 環境 | 用途 | 状態 |
|------|------|------|
| local D1 | 開発・Vitest・API ローカルテスト | ✅ 運用中 |
| remote D1 | 公開β API 永続化（optional） | ⬜ 未作成 |

**公開β初期:** UI は **localStorage 継続**。remote D1 は API 層の optional 永続化のみ。UI 切替は Phase 6b 以降。

---

## 6. sync Worker と D1

| 項目 | 方針 |
|------|------|
| `POST /api/sync-worker` | D1 binding `DB` 必須 |
| 公開β | Worker deploy 前に local で sync テスト済みであること |
| dual write | **実装しない** — sync_queue 経由のみ |

---

## 7. 禁止事項

| 禁止 | 理由 |
|------|------|
| NALIPO DB への migration 適用 | システム分離 |
| 本番 D1 への手動 DELETE / DROP | ロールバック困難 |
| migration なしのスキーマ直接変更 | 再現性喪失 |
| `--remote` を checklist 未完了で実行 | データ事故 |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 |
