# Pizza Lab 営業 Worker（`pizza-lab`）— 公開前準備チェック

> **2026-11-23:** 読み取り・バックアップ・設計のみ。remote migration / deploy / Access 変更は **未実施**。

## 1. 対象リソース（NALIPO と分離）

| リソース | 名前 / UUID | 触れる？ |
|----------|-------------|----------|
| D1 | `pizza_lab_db` / `06fd466a-3878-4e89-b3d7-2d680bfba17f` | Pizza Lab のみ |
| Worker 本番 | `pizza-lab`（`wrangler.toml`） | 将来デプロイ |
| Worker staging | `pizza-lab-staging`（`wrangler.staging.toml`） | **今回変更しない** |
| NALIPO 予約 D1 | `nalipo-db` / `daa3eb2b-5638-4d24-b165-dce7a13a152a` | **禁止** |
| NALIPO 予約 Worker | （別リポジトリ） | **禁止** |

## 2. D1 migration 状態（2026-11-23 時点）

| 環境 | 適用済み | 未適用 |
|------|----------|--------|
| **remote** | `0001_initial.sql`（6× `pizza_lab_*`） | `0002`–`0004`（仕込み記録・revisions・idempotency・同日 UNIQUE） |
| **local** | `0001`–`0004` すべて | — |

**remote migration 前:** `backups/pizza_lab_db-pre-prep-*.sql` を取得済みであること（export は読み取り）。

## 3. デプロイ経路の混同防止

| 操作 | コマンド / ファイル | D1 | Worker 名 |
|------|---------------------|-----|-----------|
| Staging のみ | `npm run deploy:staging` | **なし** | `pizza-lab-staging` |
| 本番 Phase 0（承認後） | `npm run build:cloudflare` の後 **`npm run deploy:production:phase0`**（`opennextjs-cloudflare deploy --config wrangler.toml`。`--dangerouslyUseUnsupportedNextVersion` は **build のみ**） | `pizza_lab_db` | `pizza-lab` |

**禁止:** `wrangler deploy` を `wrangler.toml` で流さずに staging 用トoml も誤用しない。`--env staging` は D1 継承のため **使用しない**（`staging-nalipo-daily-go-live.md` 参照）。

## 4. 本番 `pizza-lab` — 公開経路保護（Access 完了まで非公開）

| 項目 | staging（現状） | 本番 `wrangler.toml` |
|------|-----------------|----------------------|
| `workers_dev` | `true`（Access 済み hostname） | **`false`**（Access 完了まで — `npm run validate:production-config` が **`workers_dev=true` を拒否**） |
| `preview_urls` | **`false`** | **`false`** |
| Cloudflare Access | staging 用 Application | **別 Application**（NALIPO 予約と AUD 共有禁止） |
| `[[routes]]` / カスタムドメイン | — | **追加しない** |

**ローカル検証:** `npm run build:cloudflare` の後 `npm run validate:production-config`（**dry-run 必須**。`.open-next` 無しは失敗）。

**初回 Worker 作成後（承認済み deploy のみ）— Dashboard で公開経路ゼロ:**

1. Workers & Pages → **`pizza-lab`**（`pizza-lab-staging` / NALIPO Worker は開かない）
2. **Settings → Domains & Routes:** **workers.dev = Disabled**、カスタムドメイン **0**、Zone Routes **0**
3. **Deployments:** **Preview / Version URL** のリンクが **出ない**こと（`preview_urls=false`）
4. シークレットウィンドウで `https://pizza-lab.<account-subdomain>.workers.dev/` にアクセス → **アプリ本文が表示されない**（404 等）
5. アカウント **Protect all Workers** が **無効** であること

## 4.1 `workers_dev=true` へ戻す手順（Access 保護完了後のみ）

**前提:** Self-hosted Application（本番 hostname + `/*`）と Worker **Access → All traffic** が有効、`CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_AUD` が **`pizza-lab` のみ**に設定済み。

1. **承認前（任意）:** 本番 toml を変えず `WRANGLER_GO_LIVE_CONFIG=wrangler.go-live-dryrun.local.toml` で `npm run validate:production-go-live`（ゲート + dry-run。ファイルはリポジトリルート・gitignore）
2. `wrangler.toml` の **代入行のみ** `workers_dev = false` → **`workers_dev = true`**（別コミット・承認後。説明コメントは変更しない）
3. `npm run build:cloudflare` → **`npm run validate:production-go-live`** → 成功まで **deploy しない**
4. **`npm run deploy:production:phase0`**（人間ターミナル）— `opennextjs-cloudflare deploy --config wrangler.toml`（staging / dangerous build フラグなし）
5. 未ログインで hostname へアクセス → **Cloudflare Access ログイン**のみ（200 でアプリ全文が出た場合は workers.dev を即 Disable して調査）
6. go-live コミット後は `validate:production-config` が **意図的に失敗**（非公開専用）— [checklist](./pizza-lab-production-go-live-checklist.md)

deploy 後: Zero Trust / Deployments で **Preview / Version URL が出ない**ことを再確認。

## 5. Worker Secrets / Vars（本番 `pizza-lab` のみ）

| 名前 | 種別 | 用途 |
|------|------|------|
| `OPENWEATHER_API_KEY` | Secret | 外気取得（未設定時は保存は継続・外気 unavailable） |
| `CF_ACCESS_TEAM_DOMAIN` | Var または Secret | JWT `iss` 検証 |
| `CF_ACCESS_AUD` | Var | 本番 Access Application 専用 AUD |
| `CF_ACCESS_ALLOWED_EMAILS` | Var（任意） | 店主メール 1 件の API 二重チェック |

**設定しない:** `PIZZA_LAB_DEV_SKIP_ACCESS_AUTH`（本番）、NALIPO 予約 Worker への上記 Secrets のコピー。

## 6. Cloudflare Access 環境変数 — Workers で取得できることの検証（デプロイ前・デプロイ後）

コードは `loadAccessConfigFromEnv()`（`CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD` 必須）。未設定時は記録 API が `auth_not_configured` で拒否する。

| 段階 | 手順 | 値をログに出さない |
|------|------|---------------------|
| A. TOML / スクリプト | `npm run validate:production-config` | — |
| B. Dashboard（承認後） | Workers → `pizza-lab` → Settings → Variables：名前の存在確認 | Secret の **値** は開かない |
| C. CLI（承認後） | `npx wrangler secret list`（Worker 名 `pizza-lab`）— 名前のみ確認 | 出力をチケットに貼る際は名前だけ |
| D. デプロイ後 | Access 経由で `GET /api/daily-prep-records?limit=1` → **200**；ログアウト → **401** | JWT 本文を保存しない |
| E. 誤 AUD | staging Application の AUD を本番に設定 → **401** `invalid_aud` 相当 | — |

任意: `CF_ACCESS_ALLOWED_EMAILS` に店主メール 1 件（平文 Var — git に載せない）。

**禁止:** NALIPO 予約 Worker からの env コピー、`PIZZA_LAB_DEV_SKIP_ACCESS_AUTH=1` を本番に設定。

## 7. Cloudflare Access — デプロイ前検証手順（ダッシュボード + 実機）

1. Zero Trust → Access → Applications: **Pizza Lab Production**（仮称）が **NALIPO 予約と別 ID・別 AUD** であることを目視
2. Self-hosted ドメイン: `pizza-lab.<account>.workers.dev`（パス `/*`）
3. Policy: Allow — **店主メール 1 件のみ**（staging Policy のコピーでも **AUD は別**）
4. Worker 環境変数 `CF_ACCESS_AUD` が Application の AUD と **完全一致**
5. 未ログインで `GET/POST /api/daily-prep-records` → **401**
6. 店主でログイン → 仕込み保存 1 件 → 一覧 → PATCH（気温スナップショット不変）→ 同日 2 回目 POST → **409**
7. 第三者メール（Allow 外）→ アプリ全体 **ブロック**（Access 層）
8. `CF_ACCESS_ALLOWED_EMAILS` 設定時: JWT は通っても API が拒否するケースを curl で確認（オプション）

## 8. 承認が必要な次操作（順序案）

1. ~~本番 `wrangler.toml` に `preview_urls = false`~~ ✅
2. ~~`workers_dev = false`（Access まで非公開）~~ ✅
3. **初回 deploy**（`workers_dev=false`）→ §4 Dashboard 公開経路ゼロ確認
4. Access Application 作成 + Worker All traffic（NALIPO と分離）
5. `wrangler d1 migrations apply pizza_lab_db --remote`（0002–0004）— **バックアップ後・メンテ窗口**
6. Secrets 設定
7. §4.1 **`workers_dev=true` + 再 deploy**（Access 後のみ）
8. 実機テスト（§6–§7）
9. staging は **引き続き D1 なし**・`deploy:staging` のみ

## 9. 関連ドキュメント

- [pizza-lab-phase0-human-deploy.md](./pizza-lab-phase0-human-deploy.md) — Phase 0 初回作成（人間承認・NALIPO Gate 非使用）
- [pizza-lab-production-go-live-checklist.md](./pizza-lab-production-go-live-checklist.md) — 営業公開前提（Access・Secrets・D1・deploy 分離）
- [daily-prep-operations-audit.md](./daily-prep-operations-audit.md)
- [daily-prep-backup-restore.md](./daily-prep-backup-restore.md)
- [staging-nalipo-daily-go-live.md](./staging-nalipo-daily-go-live.md)
- [openweather-usage.md](../weather/openweather-usage.md)