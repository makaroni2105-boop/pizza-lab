# Phase 3a 完了サマリー（Cloudflare D1 + Repository + API 土台）

> **完了日:** 2026-07-07  
> **スコープ:** wrangler / migrations / local D1 / Repository 層 / optional D1 API  
> **未スコープ:** UI D1 切替 / dual write / sync Worker / remote D1 / 本番運用

---

## 1. フェーズ内訳

| 項目 | 内容 | 主要パス |
|------|------|----------|
| Wrangler 設定 | `pizza_lab_db`, binding `DB` | `wrangler.toml` |
| Migrations | 6 テーブル（`pizza_lab_*`） | `migrations/0001_initial.sql` |
| local D1 | migration 適用済み（local のみ） | `.wrangler/state/v3/d1/` |
| Repository | D1 CRUD 薄層 | `lib/db/` |
| Weather API | D1 optional cache | `GET /api/weather` |
| Profile API | shops + profiles | `GET/POST/DELETE /api/profile` |
| Learning Run API | runs CRUD | `GET/POST/DELETE /api/learning-runs` |
| Sync Queue API | Outbox 土台 | `GET/POST/PATCH /api/sync-queue` |

---

## 2. Wrangler / D1

| 項目 | 値 |
|------|-----|
| `database_name` | `pizza_lab_db` |
| `binding` | `DB` |
| `migrations_dir` | `migrations` |
| `database_id`（local） | `00000000-0000-4000-8000-000000000001` |
| NALIPO | **混在なし**（独立 DB 名・テーブル prefix） |

**local migration 適用:**

```bash
npx wrangler d1 migrations apply pizza_lab_db --local
# → 0001_initial.sql ✅
```

**未実行:** `wrangler d1 create`（remote）/ `migrations apply --remote` / 本番 D1

---

## 3. テーブル（migrations）

| テーブル | Repository |
|----------|------------|
| `pizza_lab_shops` | `shop-repository.ts` |
| `pizza_lab_profiles` | `profile-repository.ts` |
| `pizza_lab_learning_runs` | `learning-run-repository.ts` |
| `pizza_lab_knowledge_entries` | （API 未接続 — Phase 3b） |
| `pizza_lab_weather_cache` | `weather-cache-repository.ts` |
| `pizza_lab_sync_queue` | `sync-queue-repository.ts` |

設計正本（論理名）: [docs/database/README.md](./database/README.md)

---

## 4. lib/db/ Repository 層

| モジュール | 責務 |
|-----------|------|
| `d1-types.ts` | D1 型・`pizza_lab_*` 定数・Row 型 |
| `d1-client.ts` | `queryAll` / `queryFirst` / `execute` |
| `d1-mock.ts` | 単体テスト用 Memory D1 |
| `get-request-db.ts` | optional `env.DB` 取得 |
| `shop-repository.ts` | shops CRUD |
| `profile-repository.ts` | profiles + ShopProfile 合成 |
| `learning-run-repository.ts` | LearningRun CRUD |
| `weather-cache-repository.ts` | TTL キャッシュ |
| `sync-queue-repository.ts` | Outbox enqueue / list / status |
| `*-memory-store.ts` | API fallback（サーバーインメモリ） |

---

## 5. optional D1 + memory fallback 方針

```
API Route
  → getOptionalRequestDb()   // Node dev では undefined
  → handler(deps: { db?, memory? })

db あり:
  → Repository → pizza_lab_* テーブル
  → エラー時 memory fallback

db なし:
  → memory store のみ

dual write: なし
UI / localStorage: 変更なし（並行パス）
```

| API | D1 テーブル | memory fallback |
|-----|-------------|-----------------|
| `/api/weather` | `pizza_lab_weather_cache` | `WeatherCache` |
| `/api/profile` | shops + profiles | `ProfileMemoryStore` |
| `/api/learning-runs` | learning_runs | `LearningRunMemoryStore` |
| `/api/sync-queue` | sync_queue | `SyncQueueMemoryStore` |

---

## 6. API 一覧

| メソッド | パス | 用途 |
|---------|------|------|
| GET | `/api/weather` | 外気温・湿度（D1 cache optional） |
| GET | `/api/profile` | プロファイル一覧 |
| GET | `/api/profile?shopId=` | 1 件取得 |
| POST | `/api/profile` | ShopProfile 保存 |
| DELETE | `/api/profile?shopId=` | 削除 |
| GET | `/api/learning-runs?shopId=` | Run 一覧 |
| POST | `/api/learning-runs` | Run 保存 |
| DELETE | `/api/learning-runs?id=` | Run 削除 |
| GET | `/api/sync-queue?limit=` | pending 一覧 |
| POST | `/api/sync-queue` | enqueue |
| PATCH | `/api/sync-queue` | status 更新 |

**UI ルート（変更なし）:** `/quick` `/profile` `/die/history` — localStorage 継続

---

## 7. 品質状態（2026-07-07 時点）

| コマンド | 結果 |
|---------|------|
| `npm test` | **172 tests passed**（31 files） |
| `npm run build` | 成功（API 5 本含む） |
| `npm run lint` | No ESLint warnings or errors |

**Phase 3a 追加分:** Repository 11 tests + API handler 24 tests 程度

---

## 8. Phase 3a 未実装（Phase 3b 以降）

| 項目 | 予定 |
|------|------|
| UI → D1 切替 | Phase 3b 以降（フラグ制） |
| dual write | 意図的に未実装 |
| sync_queue Worker | dequeue → 実処理 |
| remote D1 / 本番 migration | デプロイ時 |
| Knowledge → D1 API | Phase 3b |
| Calculator / Ask | Phase 3b |
| profile.learning API 再計算 | Learning Run API から未連携 |

---

## 9. 設計正本との整合

| 正本 | 整合 | 備考 |
|------|------|------|
| `docs/database/README.md` | ✅ | migrations は `pizza_lab_*` prefix |
| `PIZZALAB_MASTER.md` §4.9–4.10 | ✅ | optional D1 方針 |
| Phase 2 localStorage | ✅ | UI 未変更・キー維持 |
| `lib/die/*` | ✅ | 未変更 |
| `lib/learning/*` 純粋関数 | ✅ | 未変更 |
| `lib/weather/*` 純粋関数 | ✅ | handler のみ D1 optional |
| `lib/knowledge/*` | ✅ | 未変更 |
| NALIPO 分離 | ✅ | 独立 DB / binding |

---

## 10. 次のステップ（Phase 3b / Worker）

1. **sync_queue Worker** — pending dequeue → profile / run 反映
2. **Phase 3b** — Calculator / Ask / Knowledge D1 API
3. **UI 切替フラグ** — dual write なしで段階移行
4. **remote D1** — 本番プロビジョニング + `--remote` migration

詳細は [ROADMAP.md](../ROADMAP.md) Phase 3b を参照。

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 — Phase 3a 完了記録 |
