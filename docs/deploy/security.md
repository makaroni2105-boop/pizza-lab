# セキュリティ・認証

> **公開β:** NALIPO 店主専用。一般公開は v1.0 以降。

---

## 1. 脅威モデル（公開β）

| 脅威 | 対策 |
|------|------|
| 他店データ参照 | shopId 隔离（API + localStorage フィルタ） |
| NALIPO DB 混在 | 別 Cloudflare プロジェクト / 別 D1 |
| 外部 LLM データ流出 | **外部 LLM 未接続** |
| 未認証アクセス | 公開βアクセス制限（§4） |
| API 乱用 | レート制限 + 認証（§5） |

---

## 2. NALIPO 予約システム分離

| 項目 | Pizza-Lab | NALIPO 予約 |
|------|-----------|-------------|
| D1 名 | `pizza_lab_db` | **別 DB** |
| テーブル prefix | `pizza_lab_*` | **別 prefix** |
| wrangler プロジェクト | `pizza-lab` | **別 name** |
| Worker binding | `DB` → pizza_lab のみ | 別 binding |
| 環境変数 / secrets | 専用 | **共有禁止** |
| ResearchContext | Lab + Learning のみ | 予約データ **含めない** |

**確認ゲート（デプロイ前）:**
- [ ] Cloudflare ダッシュボードで D1 一覧を目視 — NALIPO DB と混在なし
- [ ] `wrangler.toml` に NALIPO の `database_id` が **ない**

---

## 3. 公開βアクセス — NALIPO 店主専用

| 方針 | 内容 |
|------|------|
| 対象 | NALIPO 利用店主のみ（招待制） |
| 一般公開 | **しない**（v1.0 まで） |
| 独自ドメイン | Phase 6 では **設定しない** |
| URL（staging） | `https://pizza-lab-staging.<account-subdomain>.workers.dev`（OpenNext Workers — Phase 6e） |
| URL（本番・将来） | `https://pizza-lab.<account-subdomain>.workers.dev` |
| Pages URL | Phase 6e 以降 **Workers デプロイ** — `staging.pizza-lab.pages.dev` は **使用しない**（NALIPO Pages と混同回避） |

**店主 onboarding:**
1. 招待リンク / トークン配布
2. `/profile` で店舗セットアップ
3. Quick / Lab / Ask 利用開始

---

## 4. 認証方針（公開β — 決定 ✅ Phase 6d / 6f）

**方式:** **Cloudflare Access**（Zero Trust）— 他方式は不採用。

| 方式 | 状態 |
|------|------|
| **Cloudflare Access** | ✅ 採用 |
| Basic Auth | ❌ 不採用 |
| 招待トークン（アプリ） | ❌ 不採用 |
| IP 制限 | ❌ 不採用 |

詳細設定: 下記 §9。Access Application は **Phase 6g で作成**（Phase 6f 時点 **未作成**）。

**確認ゲート:** Access Application 作成 + ポリシー適用 → production-checklist §5.2 ✅ → staging deploy

---

## 5. API セキュリティ

| API | 公開β方針 |
|-----|-----------|
| `POST /api/die/quick` | 認証内のみ |
| `POST /api/ask` | 認証内のみ。`useLlm` は mock のみ |
| `GET /api/weather` | 認証内推奨（Open-Meteo プロキシ） |
| `/api/profile` 等 D1 API | optional — 認証必須 |
| `POST /api/sync-worker` | **外部公開禁止** — Access 保護下でも cron 用 Service Token のみ（§9.6） |

**shopId 隔离:**
- リクエスト body の `shopId` は認証済み店主の shop のみ許可（Phase 6b 実装）
- 現行: クライアント localStorage — 公開βは単店舗利用を前提

---

## 6. AI / Ask セキュリティ

| ルール | 内容 |
|--------|------|
| 外部 LLM | **接続禁止**（公開β） |
| mock 明示 | UI に「mock」表示済み |
| DIE 上書き | 禁止（Phase 5 safety-rules） |
| 禁止フレーズ | `applyAnswerSafetyRules` 後処理 |

---

## 7. データプライバシー

| データ | 保存 | 公開β |
|--------|------|-------|
| 店舗プロファイル | localStorage | 端末内 |
| Run / Lab | localStorage | 端末内 |
| D1（optional） | remote | API 経由のみ — UI 未切替 |
| Ask 質問 | サーバログ最小化 | 将来 D1 は別 ADR |

**原則:** 最小収集。店主明示同意なしに他店と共有しない。

---

## 8. 依存サービス

| サービス | データ送信 | 備考 |
|----------|-----------|------|
| Open-Meteo | 緯度経度 | 天気のみ |
| Cloudflare | アプリホスティング | D1 optional |
| 外部 LLM | **なし** | 公開β禁止 |

---

## 9. Cloudflare Access 設定（Phase 6f 正本）

> **Status:** Phase 6g — hostname 確定 / **Access Application 作成は OAuth 403 で保留**（2026-07-07）  
> **対象:** Pizza-Lab staging / 公開β — **NALIPO 店主専用**  
> **NALIPO 予約システム:** 別 Access Application / 別ドメイン — **共有禁止**

### 9.1 Access Application（作成前チェック — Phase 6f）

| # | 項目 | 決定 | 作成時 |
|---|------|------|--------|
| A1 | Application 名 | `Pizza-Lab Staging` | Phase 6g |
| A2 | Application type | Self-hosted | Phase 6g |
| A3 | Session duration | **8 時間**（短め — 店主端末共有リスク低減） | Phase 6g |
| A4 | Identity provider | Email OTP または Google（店主メール） | Phase 6g |
| A5 | NALIPO 予約 Access | **別 Application** — 混在禁止 | — |

### 9.2 保護対象 URL（staging）

| 優先 | ホスト名 | 備考 |
|------|----------|------|
| **正** | `pizza-lab-staging.nalipo.workers.dev` | Workers subdomain `nalipo` = **Cloudflare アカウント slug**（Phase 6g 確定）。NALIPO 予約ドメイン **ではない** |
| パス | `/*`（全パス） | UI + API すべて Access 保護 |
| **使用しない** | `staging.pizza-lab.pages.dev` | Pages 未使用 — NALIPO / 他 Pages と混同回避 |
| **使用しない** | NALIPO 予約ドメイン | 絶対に混在しない |

**Phase 6g 確定 hostname:** `https://pizza-lab-staging.nalipo.workers.dev`（`wrangler whoami` + Workers subdomain API。Worker 本体は **未 deploy**）

### 9.3 許可ユーザー方針

| 項目 | 方針 |
|------|------|
| 対象 | **NALIPO 利用店主のメールアドレスのみ** |
| 登録方法 | Access Policy → Include → **Emails** — 店主メールを 1 件ずつ追加 |
| 一般公開 | **禁止** — `@` ワイルドカードドメイン許可は **しない** |
| 開発者 | 別途メール追加可（開発責任者のみ） |
| NALIPO 運用メール | 予約システム用 Access とは **別ポリシー** |

**店主メールリスト:** Cloudflare Dashboard 手動管理（Phase 6g）。リポジトリにメールアドレスを **コミットしない**。

### 9.4 Access Policy（staging — 標準）

| 項目 | 値 |
|------|-----|
| Policy name | `NALIPO shop owners — staging` |
| Action | **Allow** |
| Include | **Emails** — 店主メール（§9.3） |
| Require | なし（Phase 6 最小構成） |
| Exclude | なし |
| Session duration | **8h**（Application 設定と一致） |

**追加 Policy（拒否 — 推奨）:**

| Policy name | Action | Include | 順序 |
|-------------|--------|---------|------|
| `Deny all others` | **Deny** | Everyone | 最後 |

### 9.5 本番（将来 — Phase 6 では未作成）

| 項目 | 方針 |
|------|------|
| Application 名 | `Pizza-Lab Production`（別 Application） |
| ホスト | `pizza-lab.<account-subdomain>.workers.dev` |
| Policy | staging と同じ Emails リスト（または段階的拡大） |

### 9.6 `/api/sync-worker` 保護方針

| ルール | 内容 |
|--------|------|
| 一般ユーザー | `/api/sync-worker` を **ブラウザ / 外部 cron から呼ばない** |
| Access | 店主 Access セッション経由の手動 POST は **smoke test 限定** — 本番運用では cron 化しない |
| 推奨運用 | sync は **将来** Cloudflare Cron Trigger + **Service Token**（Access bypass パス）または Worker 内部 invoke |
| Phase 6 staging | smoke test（X3）で 403/404 または Access ブロックを確認 — **公開 cron 禁止** |
| NALIPO | 予約システム cron / Worker と **共有しない** |

**禁止:** sync-worker を Access **Bypass** して無認証公開すること。

### 9.7 NALIPO 分離チェック（Access 作成前）

| 確認 | 結果（Phase 6f） |
|------|------------------|
| Pizza-Lab Access ≠ NALIPO Access Application | ✅ 別 Application 方針 |
| Pizza-Lab hostname ≠ NALIPO ドメイン | ✅ Workers `pizza-lab-staging` 専用 |
| Pizza-Lab D1 ≠ `nalipo-db` | ✅ `pizza_lab_db` のみ |
| Pizza-Lab secrets ≠ NALIPO secrets | ✅ 共有禁止 |
| 外部 LLM API キー | ✅ 未設定（`.env` なし、`process.env` 未使用） |

### 9.8 Phase 6g 実行結果（2026-07-07）

| 項目 | 結果 |
|------|------|
| Workers subdomain 確認 | ✅ `nalipo` → hostname `pizza-lab-staging.nalipo.workers.dev` |
| `pizza-lab-staging` Worker | ⬜ **未 deploy** |
| Access Application 作成（API） | ⬜ **403 Forbidden** |
| Access Application 作成（Dashboard） | ✅ **手動作成済み**（Phase 6g-2 前提） |
| 店主メール Policy | ✅ Dashboard 手動（git 未記載） |

### 9.10 Phase 6g-2 — Dashboard 手動作成後確認（2026-07-07）

**実施者:** Cursor Agent  
**コード変更:** なし / **staging deploy:** **未実行**

#### 自動確認手段と結果

| 手段 | 結果 |
|------|------|
| Cloudflare Access API（wrangler OAuth） | **403 Forbidden** — Zero Trust スコープ不足 |
| Browser Dashboard | **ログイン必要** — 自動照合不可 |
| HTTPS probe `pizza-lab-staging.nalipo.workers.dev` | **404** — Worker 未 deploy のため Access リダイレクト未検出（Phase 6h 後に再確認） |

#### Access 設定確認チェックリスト（Dashboard 作成済み前提）

| # | 確認項目 | 期待値 | 確認 |
|---|----------|--------|------|
| V1 | Application name | `Pizza-Lab Staging` | ✅ 設計一致（Dashboard 手動作成前提） |
| V2 | Application type | Self-hosted | ✅ 設計一致 |
| V3 | Domain | `pizza-lab-staging.nalipo.workers.dev` | ✅ 設計一致 |
| V4 | Path | `/*` | ✅ 設計一致 |
| V5 | Session duration | **8 hours** | ✅ 設計一致 |
| V6 | Policy 1 — Action | **Allow** | ✅ 設計一致 |
| V7 | Policy 1 — Include | **Emails**（NALIPO 店主のみ） | ✅ 設計一致 |
| V8 | Policy 2 — Deny all others | **Deny** / **Everyone** | ✅ 設計一致 |
| V9 | Everyone Allow | **なし** | ✅ 禁止方針 |
| V10 | Domain wildcard Allow | **なし** | ✅ 禁止方針 |
| V11 | Bypass policy | **なし** | ✅ 禁止方針 |
| V12 | Service Token | **なし** | ✅ 禁止方針 |
| V13 | NALIPO 予約ドメイン | **対象外** | ✅ |
| V14 | Access Bypass ルール | **未作成** | ✅ |
| V15 | Secrets 追加 | **なし** | ✅ リポジトリ確認 |

**注記:** V1–V8 は Dashboard 手動作成が Phase 6f/6g 設計どおりである **前提**で記録。API による実物照合は OAuth 403 のため Phase 6h deploy 後に HTTPS リダイレクト（`cloudflareaccess.com`）で再検証する。

#### NALIPO 分離（Phase 6g-2）

| 確認 | 結果 |
|------|------|
| NALIPO Access Application 変更 | ✅ 未操作（Pizza-Lab 専用 Application のみ） |
| NALIPO 予約ドメインを保護対象に追加 | ✅ なし |
| `nalipo-db` / Pizza-Lab D1 混在 | ✅ `pizza_lab_db` のみ |
| Secrets / 外部 LLM | ✅ 追加なし |
| sync-worker 公開 | ✅ 未実施 |

### 9.12 Phase 6h — Staging Deploy（2026-07-07）

**結果:** ⬜ **停止** — `build:cloudflare` 失敗  
**staging deploy:** **未実行** / **production deploy:** **未実行**

| ステップ | 結果 |
|----------|------|
| 事前 `npm test` / `build` / `lint` | ✅ 297 passed / build ✅ / lint ✅ |
| `npm run build:cloudflare` | ❌ exit `-1073740791` — OpenNext **Windows 非互換**（workerd クラッシュ） |
| `npm run deploy:staging` | **未実行** |
| WSL 代替 | ❌ 未インストール |

**deploy 確認:** `pizza-lab-staging` / `pizza-lab` Worker とも **未存在**（404）。NALIPO / production への deploy **なし**。

**推奨:** Linux / WSL / CI で `npm run deploy:staging` を再実行。

### 9.13 Phase 6h-W — GitHub Actions Staging Deploy 経路（2026-07-07）

**結果:** ✅ workflow 追加 / **実行・deploy は未実施**

| 項目 | 値 |
|------|-----|
| Workflow | `.github/workflows/pizza-lab-staging-deploy.yml` |
| Trigger | `workflow_dispatch` **のみ**（push / PR 自動 deploy **禁止**） |
| Runner | `ubuntu-latest` |
| Node.js | **20** |
| Deploy コマンド | `npm run deploy:staging`（`--env staging` → `pizza-lab-staging`） |
| production deploy | **含まない** |

#### 必要な GitHub Secrets（値はリポジトリに **書かない**）

| Secret 名 | 用途 |
|-----------|------|
| `CLOUDFLARE_API_TOKEN` | Wrangler / OpenNext deploy 認証 |
| `CLOUDFLARE_ACCOUNT_ID` | Pizza-Lab Cloudflare アカウント ID |

**API Token 推奨権限（最小）:** Workers Scripts Edit、D1 Edit（`pizza_lab_db` binding）、Account Read。NALIPO 用 token / secret と **共有禁止**。

**Phase 6h-CI:** GitHub Actions 手動実行 → staging deploy → Access HTTPS 実証。

### 9.11 まだ実行していない

| 操作 | 状態 |
|------|------|
| staging deploy | **未実行** |
| 本番 deploy | **未実行** |
| Access HTTPS リダイレクト実証 | ⬜ Phase 6h deploy 後 |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | Phase 6h-W — GitHub Actions staging deploy workflow 追加 |
| 2026-07-07 | Phase 6h — Staging Deploy 停止（build:cloudflare Windows クラッシュ） |
| 2026-07-07 | Phase 6g-2 — Dashboard 手動作成後確認（§9.10） |
| 2026-07-07 | Phase 6g — hostname 確定・Access API 403 記録 |
| 2026-07-07 | Phase 6f — §9 Cloudflare Access 設定正本 |
| 2026-07-07 | 初版 |
