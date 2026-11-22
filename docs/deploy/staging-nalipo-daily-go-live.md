# NALIPO 営業用 — Pizza-Lab staging 公開手順

> **対象:** **毎日の仕込み `/daily` のみ** を営業利用。  
> **staging Worker:** `pizza-lab-staging`（`wrangler.staging.toml` — **D1 なし**）  
> **禁止:** 本番 Worker `pizza-lab`、NALIPO 予約、`nalipo-db` への操作。

---

## 1. 公開範囲（営業 vs 技術）

| 区分 | 内容 |
|------|------|
| **営業公式** | `/daily` のみ（配合・仕上げ水・粉使用履歴は **端末 localStorage**） |
| **同一 Worker 上に存在** | `/`, `/quick`, `/lab/*`, `/profile`, `/ask`, `/api/*` など全ルート（Next アプリ一式） |
| **アクセス制限** | **Cloudflare Access 必須** — 未許可メールは全パス不可 |
| **D1（staging）** | **バインドなし** — API はインメモリフォールバック。`/api/sync-worker` は **503** |
| **案内** | 店主には **`/daily` の URL のみ** 配布 |

---

## 2. Wrangler 構成（staging）

| ファイル | Worker 名 | D1 | workers.dev | Preview / Version URL |
|----------|-----------|-----|-------------|------------------------|
| `wrangler.staging.toml` | `pizza-lab-staging` | **なし** | `workers_dev = true` | `preview_urls = false` |
| `wrangler.toml` | `pizza-lab`（本番・未 deploy） | `pizza_lab_db` | — | — |

**継承の注意:** `wrangler.toml` の D1 は `[env.staging]` 経由で継承されうる。staging deploy は **`wrangler.staging.toml` のみ**（`--env staging` 単独は使わない）。

**Wrangler バージョン:** `preview_urls` は **wrangler 4.107+**（本リポジトリ `package.json` の `^4.107.0`）で `deploy --dry-run` がエラーにならないことを確認。preview の無効化は **deploy 時に API へ反映**される（dry-run は binding のみ表示）。

公式: [workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)（Access・`workers_dev`）、[Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)（`preview_urls`）。

---

## 3. 初回デプロイ — 安全順序

**Access（済）:** Self-hosted `pizza-lab-staging.nalipo.workers.dev`、全パス、店主メール 1 件。  
**Wrangler（deploy 前）:** `workers_dev = true` + **`preview_urls = false`** で Preview / Version URL を出さない。

**禁止:** アカウント全体の **Protect all Workers**。

### 手順

1. Dashboard: **Protect all Workers** が無効であることを確認  
2. `npm test` / `npm run lint` / `npm run build` / `npm run build:cloudflare` / **`npm run validate:staging-config`**  
3. **`npm run deploy:staging`**（`pizza-lab-staging` のみ）  
4. deploy 直後: Workers → **`pizza-lab-staging`** → **Access** → **All traffic** + 既存ポリシー「NALIPO shop owner - staging」（本番 workers.dev の二重防御）  
5. シークレット: `https://pizza-lab-staging.nalipo.workers.dev/daily` → Access ログインのみ  
6. 許可メールでログイン → `/daily` smoke（10kg・記録 dedup）  
7. Workers → Deployments: **Preview / Version URL が一覧に出ない**（または無効）ことを確認。出る場合は Dashboard 設定と `preview_urls` を再確認してから続行しない  

---

## 4. ローカル検証（deploy 前）

```bash
npm run build
npm run build:cloudflare
npm run validate:staging-config
```

検証内容:

- `wrangler.staging.toml`: `workers_dev = true`, **`preview_urls = false`**, D1 なし  
- `wrangler deploy --dry-run`: Worker **`pizza-lab-staging`**, **D1 binding なし**

---

## 5. 緊急時 — 外部からのアクセスを止める

**原則:** Access Application の **Disable** や Worker Access の **解除だけでは「公開停止」にならない**場合がある（設定ミス時に素通しの恐れ）。**ネットワーク経路を止める**操作を優先する。

| 優先 | 操作 | 対象 |
|------|------|------|
| 1 | Workers → `pizza-lab-staging` → Settings → **Domains & Routes** → **workers.dev を Disable** | 本番 workers.dev 経路 |
| 2 | 同 Worker を **再 deploy** 済みの `preview_urls = false` で維持 / Dashboard で Preview 無効 | Preview / Version |
| 3 | Zero Trust → Access → **Block ポリシー**（Deny Everyone を最優先で有効）または一時的に Allow を外す | 認証層（経路停止の**補助**） |
| 4 | Workers → `pizza-lab-staging` → Deployments → **Rollback** | 誤ったコードの差し戻し |
| 5 | **最終手段:** `pizza-lab-staging` Worker のみ **削除**（NALIPO 他 Worker には触れない） | 完全停止 |

**NALIPO 予約・本番 `pizza-lab`・`nalipo-db` は操作禁止。**

---

## 6. ロールバック（コード）

| 手段 | 操作 |
|------|------|
| アプリ | `pizza-lab-staging` → Deployments → **Rollback** |
| コード | 安定 commit で `npm run deploy:staging` のみ再実行 |
| D1 | staging は未バインド — 不要 |

---

## 7. 関連

- [security.md §9](./security.md#9-cloudflare-access-設定phase-6f-正本) — Access 正本  
- [rollback.md](./rollback.md) — 共通ロールバック  
- `.github/workflows/pizza-lab-staging-deploy.yml` — CI 経由 staging deploy