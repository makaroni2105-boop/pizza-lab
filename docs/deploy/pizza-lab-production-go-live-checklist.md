# Pizza Lab 営業公開 — 前提チェックリスト

> **公開前ゲート（TOML）:** `npm run validate:production-go-live`（**`workers_dev=true` コミット後のみ**）  
> **非公開フェーズ:** `npm run validate:production-config`（**`workers_dev=false` 必須** — 両方同時成功はしない）

**go-live 前のローカル検証（本番 `wrangler.toml` 未変更）:**

1. リポジトリ直下に `wrangler.go-live-dryrun.local.toml`（gitignore）を作成 — **代入行のみ** `workers_dev = true`（コメントの `workers_dev = false` はそのまま可）
2. `npm run build:cloudflare`
3. PowerShell: `$env:WRANGLER_GO_LIVE_CONFIG="wrangler.go-live-dryrun.local.toml"; npm run validate:production-go-live`
4. 検証後に一時ファイルを削除

ゲートは **TOML パーサ + トップレベル代入行のみ** で `workers_dev` を判定（コメント誤検知なし）。

---

## A. リポジトリ・ビルド（ローカル / CI）

| # | 項目 | 方法 | 状態 |
|---|------|------|------|
| A1 | ブランチ・承認済みコミット | `git status -sb` | ⬜ |
| A2 | `npm test` / `npm run lint` | ローカル | ⬜ |
| A3 | `npm run build:cloudflare` | `.open-next/worker.js` 生成 | ⬜ |
| A4 | **公開用ゲート** | `npm run validate:production-go-live`（**workers_dev=true 後**） | ⬜ |
| A5 | **非公開ゲートが失敗すること** | `workers_dev=true` 時に `validate:production-config` → **exit 1（正常）** | ⬜ |

---

## B. wrangler.toml（公開コミット）

| # | 項目 | 期待 |
|---|------|------|
| B1 | Worker 名 | `pizza-lab` |
| B2 | `workers_dev` | **`true`**（公開 hostname） |
| B3 | `preview_urls` | **`false`** |
| B4 | D1 | `pizza_lab_db` / `06fd466a-3878-4e89-b3d7-2d680bfba17f` / binding `DB` |
| B5 | `[[routes]]` | **なし**（カスタムドメインは wrangler で追加しない） |
| B6 | staging / NALIPO | `wrangler.staging.toml`・`nalipo-db` **参照なし** |

---

## C. リモート D1（読み取り CLI）

| # | 項目 | 期待 | 状態 |
|---|------|------|------|
| C1 | `d1_migrations` | **0001〜0004** 適用済み | ⬜ |
| C2 | 仕込み 2 表 | `pizza_lab_daily_prep_records`、`_revisions` | ⬜ |
| C3 | UNIQUE | `idx_pizza_lab_daily_prep_shop_prep_date` 等 | ⬜ |
| C4 | 確認コマンド | `npx wrangler d1 execute pizza_lab_db --remote --command "SELECT name FROM d1_migrations ORDER BY id;"` | ⬜ |

**禁止:** `nalipo-db`・テイクアウト DB への操作。

---

## D. Cloudflare Worker・Secrets（読み取り CLI + Dashboard）

| # | 項目 | 期待 | ローカル | Dashboard |
|---|------|------|----------|-----------|
| D1 | Worker 存在 | `pizza-lab` | `wrangler deployments list --name pizza-lab` | ⬜ |
| D2 | Access Secret **3 件（名前のみ）** | `CF_ACCESS_TEAM_DOMAIN`、`CF_ACCESS_AUD`、`CF_ACCESS_ALLOWED_EMAILS` | `wrangler secret list --name pizza-lab` | ⬜ |
| D3 | AUD 一致 | Worker `CF_ACCESS_AUD` = 本番 Application AUD | **値は出力しない** — 目視または API 200 テスト | ⬜ |
| D4 | D1 binding | deploy 後も `pizza_lab_db` | dry-run / Dashboard Bindings | ⬜ |

**OPENWEATHER_API_KEY:** 未設定でも仕込み保存可（外気 unavailable）。

---

## E. Access（Dashboard 人間確認必須）

| # | 項目 | 期待 |
|---|------|------|
| E1 | **All traffic** | Workers → **`pizza-lab` のみ** — All traffic 有効 |
| E2 | Self-hosted Application | 本番 hostname `pizza-lab.<subdomain>.workers.dev`、パス `/*`（**staging・NALIPO 予約と別 AUD**） |
| E3 | Policy | **店主メール 1 件** Allow → 推奨 Deny Everyone |
| E4 | staging / NALIPO | **変更なし**（デプロイ時刻・ポリシー名を目視） |
| E5 | Protect all Workers | **無効** |

CLI だけでは確証できない項目 — **検証済みとしない**。

---

## F. 公開手順の分離（設定変更と deploy）

**順序（承認付き・人間ターミナル）:**

1. **コミット A:** `wrangler.toml` → `workers_dev = true` のみ（または go-live 専用ブランチ）
2. `npm run build:cloudflare`
3. **`npm run validate:production-go-live`** — 成功するまで **deploy しない**
4. **Dashboard 再確認** §E
5. **コミット B（任意）:** アプリコード変更がある場合のみ build
6. **`npm run deploy:production:phase0`**（1 回）— Secrets は **自動削除されない**（Wrangler は未設定 Secret を消さない。名前変更・`secret delete` は別操作）
7. **直後 Dashboard:** workers.dev **Enabled**、Preview **無効**、Routes **0**
8. 未認証 URL → **Access のみ**；店主で実機テスト（`pizza-lab-phase0-human-deploy.md` §6 / iPhone 手順）

**禁止:** `npm run deploy:staging`、NALIPO Gate 回避、Access 無効化。

---

## G. deploy 後も維持されるもの

| リソース | 維持の理由 |
|----------|------------|
| Worker Secrets | `wrangler deploy` / OpenNext deploy は既存 Secret を通常 **削除しない** |
| Access All traffic | Dashboard 設定 — Worker 更新と **独立** |
| D1 binding | `wrangler.toml` の `[[d1_databases]]` を維持 |
| Access Policy | deploy では変更されない — **誤編集のみ手動リスク** |

**deploy 前後の確認（名前のみ）:**

```powershell
Set-Location C:\Projects\pizza-lab
npx wrangler secret list --name pizza-lab
npx wrangler deployments status --name pizza-lab
```

---

## H. 緊急時

- 想定外の公開: **`pizza-lab` のみ** Domains & Routes → workers.dev **Disable**
- migration / SQL 流し込み: **再実行しない** — Time Travel / サポート方針を確認
- 参照: [rollback.md](./rollback.md)、[pizza-lab-phase0-human-deploy.md](./pizza-lab-phase0-human-deploy.md)

---

## 関連

- [pizza-lab-production-go-live-prep.md](./pizza-lab-production-go-live-prep.md)
- [pizza-lab-phase0-human-deploy.md](./pizza-lab-phase0-human-deploy.md)