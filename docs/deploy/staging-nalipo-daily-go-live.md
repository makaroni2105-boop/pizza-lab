# NALIPO 営業用 — Pizza-Lab staging 公開手順

> **対象:** `feature/daily-prep-nalipo` 以降の **毎日の仕込み `/daily` のみ** を営業利用。  
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
| **案内** | 店主には **`/daily` の URL のみ** 配布。他ルートは研究用・将来用として Access 内でも触らない運用推奨 |

---

## 2. Wrangler 構成

| ファイル | Worker 名 | D1 |
|----------|-----------|-----|
| `wrangler.toml` | `pizza-lab`（本番・未 deploy） | `pizza_lab_db` / `DB` |
| `wrangler.staging.toml` | `pizza-lab-staging` | **なし** |

**継承の注意:** Wrangler は `[env.staging]` でも **トップレベルの `[[d1_databases]]` を継承**する。本番 D1 を staging が触らないため、staging は **別ファイル** `wrangler.staging.toml` のみで deploy する（`--env staging` 単独では不十分）。

---

## 3. 初回デプロイ — Access を先に（無認証公開ウィンドウを最小化）

**目標 URL（workers.dev）:** `https://pizza-lab-staging.nalipo.workers.dev`  
**Preview URL:** OpenNext / Wrangler はバージョンごとに `*.workers.dev` のプレビューが付く場合がある。**本番 hostname の Application に加え、初回 deploy 直後の Dashboard 上の URL を確認し、必要なら Access に同じポリシーで追加する。**

### 手順 A — 推奨（Application 先行）

1. Zero Trust → **Access** → Applications → **Add an application** → Self-hosted  
2. Application 名: `Pizza-Lab Staging`  
3. Domain: `pizza-lab-staging.nalipo.workers.dev`（Session: 8h）  
4. Policy `NALIPO shop owners — staging`: **Allow** → Include **Emails**（店主リスト — リポジトリに保存しない）  
5. 最終 Policy: **Deny** → Everyone  
6. Application を **有効**のまま（Worker 未作成時は届かないが設定は先行可）  
7. ゲート: `npm test` / `npm run build` / `npm run lint` / `npm run validate:staging-config`  
8. **`npm run deploy:staging`**（`pizza-lab-staging` のみ）  
9. 未ログインで URL → **Access ログイン**のみ表示されること  
10. 許可メールでログイン → `/daily` smoke（10kg 基準・記録 dedup）  
11. Dashboard → Workers → `pizza-lab-staging` → 表示された **プレビュー URL** があれば Access 対象外になっていないか確認  

### 手順 B — deploy が先になった場合の緊急対応

1. 直ちに Access Application を作成（上記 3〜5）  
2. 必要なら Dashboard で **Worker を一時無効化**（Routes を外す）までの時間を最小化  
3. **本番 `pizza-lab` Worker は deploy しない**

---

## 4. ローカル検証（deploy 前）

```bash
npm run build
npm run build:cloudflare
npm run validate:staging-config   # wrangler deploy --dry-run -c wrangler.staging.toml
```

`validate:staging-config` で **Worker 名 `pizza-lab-staging`**、出力に **D1 binding が無い**ことを確認。

---

## 5. ロールバック

| 手段 | 操作 |
|------|------|
| アプリ | Workers Dashboard → `pizza-lab-staging` → Deployments → **Rollback** |
| 即遮断 | Access Application を **Disable** |
| コード | 安定 commit で `npm run deploy:staging` のみ再実行 |
| D1 | staging は未バインド — **ロールバック不要** |

---

## 6. 関連

- [security.md §9](./security.md#9-cloudflare-access-設定phase-6f-正本) — Access 正本  
- [rollback.md](./rollback.md) — D1 / 本番向け（staging daily は §4 のみ）  
- `.github/workflows/pizza-lab-staging-deploy.yml` — `npm run deploy:staging` 経由（`wrangler.staging.toml`）