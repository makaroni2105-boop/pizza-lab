# pizza_lab_db バックアップ・復元（Pizza Lab 仕込み記録）

## 前提

- 対象: **`pizza_lab_db` のみ**（`06fd466a-3878-4e89-b3d7-2d680bfba17f`）
- **NALIPO `nalipo-db` には一切触れない**

## バックアップ（承認後）

**対象 UUID 確認:** `wrangler.toml` の `database_id` = `06fd466a-3878-4e89-b3d7-2d680bfba17f` と export ログの UUID が一致すること。

```bash
cd C:\Projects\pizza-lab
mkdir -p backups 2>$null
npx wrangler d1 export pizza_lab_db --remote --output=backups/pizza_lab_db-pre-migration-YYYYMMDD.sql
```

**保管:** `backups/` は `.gitignore` 対象。チケットに **ファイル名・サイズ・SHA256** を記録（秘密情報は SQL 本文をチャットに貼らない）。

**直近例（2026-11-23）:** `pizza_lab_db-pre-prep-20261123-1225.sql` — remote 0001 適用済み・6 テーブル・`d1_migrations` 含む（ローカル作業ストアのみ）。

## 復元（メンテナンス窗口・明示承認のみ）

1. 直近 export の SHA256 を記録
2. 影響範囲をチケットに記載
3. 以下は **破壊的操作** — 本番承認必須

```bash
# 例: 空 DB へのリストア（運用ポリシーに従う）
# npx wrangler d1 execute pizza_lab_db --remote --file=backups/pizza_lab_db-pre-migration-YYYYMMDD.sql
```

## ローカル開発

- 状態: `.wrangler/state/v3/d1/`
- 再作成: `npx wrangler d1 migrations apply pizza_lab_db --local`