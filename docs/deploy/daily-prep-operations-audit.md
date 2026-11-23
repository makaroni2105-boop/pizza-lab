# 毎日の仕込み記録 — 営業公開前監査・運用設計

> Status: 2026-11-23（コード監査 + ローカル D1 のみ）  
> **リモート D1 / Deploy / Access ダッシュボード変更は未実施**

## 1. アーキテクチャ分離

| 要素 | 名前 / ID | 役割 |
|------|-----------|------|
| Staging Worker | `pizza-lab-staging` | `/daily` 検証。**D1 バインディングなし** |
| 営業 Worker（将来） | `pizza-lab` | NALIPO 営業用。`DB` → `pizza_lab_db` |
| Pizza Lab D1 | `pizza_lab_db` / `06fd466a-3878-4e89-b3d7-2d680bfba17f` | 仕込み記録含む Pizza Lab 専用 |
| NALIPO 予約 D1 | `nalipo-db` / `daa3eb2b-5638-4d24-b165-dce7a13a152a` | **接続禁止** |

## 2. Cloudflare Access（設計のみ — 未変更）

### 現状

- **Staging:** Self-hosted `pizza-lab-staging.<account>.workers.dev`、店主メール Allow（別 Application）
- **NALIPO 予約:** 別 Application — **共有禁止**

### 営業 Worker `pizza-lab` 公開時に追加する Application（設計）

| 項目 | 推奨値 |
|------|--------|
| Application 名 | `Pizza Lab Production`（NALIPO 予約と別名） |
| ドメイン | `pizza-lab.<account>.workers.dev`（将来カスタムドメインは v1.0 以降） |
| パス | `/*`（`/api/daily-prep-records*` 含む） |
| Policy | Allow — 店主メールのみ（staging と同様、**別 Policy ID**） |
| AUD | Worker 環境変数 `CF_ACCESS_AUD` と **1:1** |
| Team | `CF_ACCESS_TEAM_DOMAIN` |

**Worker 側（本番）必須 env:**

- `CF_ACCESS_TEAM_DOMAIN`
- `CF_ACCESS_AUD`（本番 Application 専用）
- 任意 `CF_ACCESS_ALLOWED_EMAILS`（カンマ区切り — API 層の二重チェック）

**禁止:**

- NALIPO 予約 Access Application の AUD を Pizza Lab に流用しない
- `PIZZA_LAB_DEV_SKIP_ACCESS_AUTH` を本番 Worker に設定しない

## 3. D1 マイグレーション順（local 確認済み）

1. `0001_initial.sql` — 6× `pizza_lab_*` 基盤
2. `0002_daily_prep_records.sql` — 記録 + revisions
3. `0003_daily_prep_process_readings.sql` — process JSON + idempotency
4. `0004_daily_prep_unique_prep_date.sql` — 店舗スコープ×仕込み日 UNIQUE

**リモート:** 別チケットで `export` → `apply --remote`（本タスクでは未実行）

## 4. バックアップ・復元（手順案）

```bash
# バックアップ（読み取り/export — 実行は承認後）
npx wrangler d1 export pizza_lab_db --remote --output=backups/pizza_lab_db_YYYYMMDD.sql

# 復元は承認済みメンテナンス窗口のみ
# npx wrangler d1 execute pizza_lab_db --remote --file=backups/...
```

ローカル検証バックアップ: `.wrangler/state/v3/d1/`（開発用のみ）

## 5. API 動作サマリー（自動テストで担保）

- 本番相当 + D1 なし → **503**（成功扱いしない）
- 未認証 → **401**
- 気象失敗 → 保存可、`fetchStatus=unavailable`
- `idempotencyKey` 再送 → 重複 INSERT なし
- **同日・別保存操作**（別 `idempotencyKey`）→ **409 `PREP_DATE_EXISTS`**（DB UNIQUE + API 事前チェック）
- `expectedRevision` 不一致 → **409**
- 更新前スナップショット → `pizza_lab_daily_prep_record_revisions`

## 5.1 公開前チェック（未完了項目）

| # | 項目 | 状態 |
|---|------|------|
| P1 | **Open-Meteo 商用利用条件** — Terms / Pricing の人手確認、必要なら有料プランまたは代替データ | ⬜ **未確認**（公開までブロッカー扱い可） |
| P2 | リモート D1 migration 0002–0004 | ⬜ |
| P3 | 本番 Cloudflare Access Application（NALIPO と分離） | ⬜ |

## 6. 安全な営業公開手順（概要）

1. 本番 Access Application 作成（NALIPO と分離）— ダッシュボード
2. `wrangler.toml` の `database_id` 目視確認（`06fd466a-…`）
3. リモート D1 migration 0002–0004（未適用分）
4. Worker `pizza-lab` に D1 + Access env を設定
5. `npm test` / staging smoke（計算のみ）→ 本番 smoke（保存 1 件 + 一覧 + PATCH）
6. staging は引き続き D1 なし（記録 API は 503 が期待動作）

## 7. 関連

- [open-meteo-usage.md](../weather/open-meteo-usage.md)
- [staging-nalipo-daily-go-live.md](./staging-nalipo-daily-go-live.md)
- [security.md](./security.md)