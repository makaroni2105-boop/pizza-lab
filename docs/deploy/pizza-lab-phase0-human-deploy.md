# Pizza Lab — Phase 0 初回 Worker 作成（人間承認・通常ターミナル）

> **用途:** 営業用 Worker **`pizza-lab`** を、**一般公開 URL なし**で Cloudflare に初回作成する。  
> **NALIPO の Cursor Safety Gate / `nalipo-os-safety-gate.ps1` は変更せず、使用しない。**  
> **Cloudflare への mutating 操作は Cursor Agent から実行しない。**

---

## 1. 対象と禁止

| 区分 | 内容 |
|------|------|
| **対象 Worker** | **`pizza-lab` のみ**（`wrangler.toml`） |
| **対象 D1** | **`pizza_lab_db`** のみ（`database_id = 06fd466a-3878-4e89-b3d7-2d680bfba17f`） |
| **初回 Wrangler** | `workers_dev = false`, `preview_urls = false`, **`[[routes]]` なし**, カスタムドメインなし |
| **禁止** | NALIPO 予約・テイクアウト Worker / D1、**`pizza-lab-staging`**（`wrangler.staging.toml`、`npm run deploy:staging`）、Cloudflare Access 変更、remote D1 migration、main 直接操作 |

---

## 2. 事前条件（チケット承認前）

1. **Git:** 作業ツリー clean、承認済みコミット ID をチケットに記載  
2. **ブランチ:** `feature/daily-prep-nalipo`（または承認された feature のみ）  
3. **NALIPO Safety Gate:** 解除・無効化・回避 **しない**（Agent Shell では deploy が拒否されるのは正常）

---

## 3. 実行前ゲート（すべて成功必須）

`C:\Projects\pizza-lab` で順に実行し、**ログをチケットに添付**（秘密情報・トークンは含めない）。

```powershell
Set-Location C:\Projects\pizza-lab
npm test
npm run lint
npm run build
npm run build:cloudflare
npm run validate:production-config
```

**`validate:production-config` が確認すること（抜粋）:**

- `name = "pizza-lab"`
- `workers_dev = false`, `preview_urls = false`
- D1: `pizza_lab_db` / 正しい UUID、`nalipo-db` 非参照
- `wrangler deploy --dry-run` 成功（Worker **`pizza-lab`**、binding **`pizza_lab_db`** のみ）

**任意の目視:** `wrangler deploy --dry-run` 出力に **`pizza-lab-staging`** および NALIPO D1 名が **出ない**こと。

---

## 4. 人間による明示承認

デプロイ実行者とは別の承認者（または同一でもよいが **書面チェックリスト必須**）が以下に署名（チケットコメント）:

- [ ] 対象は **`pizza-lab` のみ**（staging・NALIPO ではない）
- [ ] §3 のゲートが **すべて成功**
- [ ] `workers_dev=false` のまま（Access 完了前に `true` にしない）
- [ ] remote D1 migration / Access / staging deploy は **本チケットに含めない**
- [ ] 実行は **Cursor Agent ではなく通常ターミナルで 1 回のみ**

---

## 5. デプロイ実行（承認後・通常ターミナル）

### Build と deploy でフラグが違う（`@opennextjs/cloudflare` 1.20.1）

| コマンド | `--dangerouslyUseUnsupportedNextVersion` |
|----------|----------------------------------------|
| **`build`** | **必要**（Next 15 メジャーが OpenNext の「公式 2 年」判定でサポート外のため） |
| **`deploy`** | **不可**（CLI にこのオプションは無く、付けると `Unknown argument` で失敗） |

`deploy` は **既に生成された `.open-next/`**（`worker.js` / assets）を `wrangler deploy` に渡す。**Next.js の `next build` は再実行しない**（`retrieveCompiledConfig` + `populateCache` + wrangler のみ）。

**1 回だけ**、次の 2 段階（§3 でビルド済みなら **deploy 行のみ**可）:

```powershell
Set-Location C:\Projects\pizza-lab
npm run build:cloudflare
npx opennextjs-cloudflare deploy --config wrangler.toml
```

同等（npm script・推奨）:

```powershell
npm run build:cloudflare
npm run deploy:production:phase0
```

`--config wrangler.toml` で **本番 Worker `pizza-lab` に確実に紐付け**（`wrangler.staging.toml` 誤用防止）。CWD が `C:\Projects\pizza-lab` であれば省略可だが、初回は明示を推奨。

### Windows / Node の `Assertion failed`

OpenNext は Windows 非推奨（ビルド時に WARN）。ネイティブ依存（`@ast-grep/napi`、workerd バンドル等）で **`Assertion failed`** が出ることがある。

- **ビルドが完了し `.open-next/worker.js` がある** → deploy は **WSL 必須ではない**（通常 PowerShell で `deploy` のみ再試行可）
- **ビルド段階で落ちる / 再現する** → **WSL または Linux CI** で `build:cloudflare` を実行する方が安定
- deploy 自体は主に wrangler CLI（上記フラグ誤り以外の失敗はログをチケットに）

**禁止コマンド例:**

- `npm run deploy:staging`
- `-c wrangler.staging.toml`
- NALIPO リポジトリ配下の任何の `wrangler deploy`

---

## 6. デプロイ直後 — Dashboard で公開経路ゼロ

Workers & Pages → **`pizza-lab` のみ**（staging・NALIPO Worker は開かない）:

| # | 確認 | 期待 |
|---|------|------|
| 1 | Settings → Domains & Routes → **workers.dev** | **Disabled** |
| 2 | カスタムドメイン | **0** |
| 3 | Zone Routes | **0** |
| 4 | Deployments | **Preview / Version URL** が出ない（`preview_urls=false`） |
| 5 | シークレット窓で `https://pizza-lab.<account-subdomain>.workers.dev/` | **アプリ本文が表示されない**（404 等） |
| 6 | アカウント **Protect all Workers** | **無効** |
| 7 | **`pizza-lab-staging`** | 直近デプロイ時刻・設定が **変化していない** |

**想定外の公開経路**（workers.dev On、Preview 有効、意図しない Route など）を見つけた場合:

1. **直ちに停止**（追加デプロイ・Access 変更は行わない）  
2. **`pizza-lab` のみ** Workers → Domains & Routes → **workers.dev を Disable**  
3. チケットに状況を記録し、原因調査後に再開  

NALIPO Worker・staging には **触れない**。

---

## 7. Phase 0 完了後の次ステップ（本手順の範囲外）

1. Zero Trust で本番 Access Application（NALIPO・staging と **別 AUD**）  
2. Worker 変数 `CF_ACCESS_*`（本番 `pizza-lab` のみ）  
3. remote D1 migration 0002–0004（別承認・バックアップ後）  
4. Access 完了後のみ `workers_dev=true` + 再 deploy（`pizza-lab-production-go-live-prep.md` §4.1）

---

## 8. 関連ドキュメント

- [pizza-lab-production-go-live-prep.md](./pizza-lab-production-go-live-prep.md)
- [staging-nalipo-daily-go-live.md](./staging-nalipo-daily-go-live.md)
- [rollback.md](./rollback.md)（緊急停止の一般方針）