# Phase 3b 完了サマリー（sync Worker + Calculator + Ask 土台）

> **完了日:** 2026-07-07  
> **スコープ:** sync_queue Worker / Baker's % Calculator / Ask API + UI  
> **未スコープ:** UI D1 切替 / dual write / remote D1 / LLM / RAG / 本番運用

---

## 1. フェーズ内訳

| 項目 | 内容 | 主要パス |
|------|------|----------|
| sync Worker | pending → processing → done \| failed | `lib/sync/` |
| sync Worker API | D1 必須トリガー | `POST /api/sync-worker` |
| Calculator | Baker's % + preferment | `lib/calculator/` `/calculator` |
| Ask API | Knowledge キーワード検索 | `POST /api/ask` |
| Ask UI | 研究パートナー入口 | `/ask` |

---

## 2. sync_queue Worker

| 項目 | 内容 |
|------|------|
| エントリ | `processSyncQueue()` / `processSyncQueueItem()` |
| トリガー | `POST /api/sync-worker?limit=N`（デフォルト 10、最大 50） |
| 状態遷移 | `pending` → `processing` → `done` \| `failed` |
| D1 | **必須**（Node dev では `503 DB_UNAVAILABLE`） |
| dual write | なし |
| UI 変更 | なし |

**対応 entity / operation**

| entity_type | operation | 処理 |
|-------------|-----------|------|
| `shop_profile` | `upsert` | `upsertShopProfile()` |
| `shop_profile` | `delete` | `softDeleteShopProfile()` |
| `learning_run` | `upsert` | `insertLearningRun()` |
| `learning_run` | `delete` | `deleteLearningRunById()` |
| `shop` / `knowledge_entry` | * | `failed` — `UNSUPPORTED_ENTITY` |

詳細: `lib/sync/` — [phase-3b-summary.md](./phase-3b-summary.md) §2

---

## 3. Baker's % Calculator

| 項目 | 内容 |
|------|------|
| パス | `/calculator` |
| モジュール | `lib/calculator/` |
| DIE 連動 | **なし**（単純 Baker's % 算術のみ） |
| DB | 不使用 |

**計算**

- 総生地量 or 粉量 → 粉 / 水 / 塩 / 酵母 / 油 (g)
- ビガ / ポーリッシュ按分（preferment 粉比率、全体加水率）

**モジュール**

| ファイル | 責務 |
|----------|------|
| `calculator-types.ts` | 型・入力パース |
| `bakers-percent.ts` | Baker's % 配合 |
| `preferment.ts` | ビガ / ポーリッシュ按分 |
| `index.ts` | 公開 API |

---

## 4. Ask API 土台

| 項目 | 内容 |
|------|------|
| API | `POST /api/ask` — `{ question: string }` |
| UI | `/ask` |
| モジュール | `lib/ask/` |
| 検索 | `lib/knowledge/searchKnowledgeEntries`（Knowledge 未変更） |
| AI / LLM | **未使用**（`aiUsed: false` 固定） |
| RAG | なし |
| DB | 不使用 |

**レスポンス**

```json
{
  "success": true,
  "mode": "knowledge_search",
  "aiUsed": false,
  "question": "...",
  "keywords": ["..."],
  "guide": "…一緒に検証していきましょう。",
  "candidates": [{ "id", "titleJa", "tier", "category", "excerpt", "relativePath", "score" }]
}
```

**トーン:** 断定せず「その店の条件と照らし合わせて一緒に検証」

---

## 5. API 一覧（Phase 3 累計）

| メソッド | パス | 用途 |
|---------|------|------|
| GET | `/api/weather` | 外気温・湿度 |
| GET/POST/DELETE | `/api/profile` | Profile |
| GET/POST/DELETE | `/api/learning-runs` | Learning Run |
| GET/POST/PATCH | `/api/sync-queue` | Outbox enqueue |
| POST | `/api/sync-worker` | sync Worker 実行 |
| POST | `/api/ask` | Knowledge 検索（Ask 土台） |

---

## 6. 品質状態（2026-07-07 時点）

| コマンド | 結果 |
|---------|------|
| `npm test` | **210 tests passed**（37 files） |
| `npm run build` | 成功（API 7 本 + UI 5 画面） |
| `npm run lint` | No ESLint warnings or errors |

**Phase 3b 追加分:** sync 11 + calculator 14 + ask 13 tests 程度

---

## 7. Phase 3b 未実装（Phase 4 以降）

| 項目 | 予定 |
|------|------|
| UI → D1 切替 | フラグ制・段階移行 |
| dual write | 意図的に未実装 |
| remote D1 / 本番 migration | デプロイ時 |
| Ask LLM / RAG | Phase 5 |
| Lab Mode / DNA | Phase 4 |
| UI から sync_queue enqueue | 任意（dual write なし） |

---

## 8. 設計正本との整合

| 正本 | 整合 |
|------|------|
| `PIZZALAB_MASTER.md` §4.10–4.12 / §11 | ✅ |
| Phase 3a D1 土台 | ✅ 未変更 |
| DIE / Learning / Weather / Knowledge 純粋ロジック | ✅ 未変更 |
| NALIPO 分離 | ✅ |
| localStorage UI | ✅ 継続 |

---

## 9. 次のステップ

1. **v0.1 日常利用** — Quick + Profile + History + Calculator + Ask
2. **Phase 4** — Lab Mode + Dough DNA + 粉ブレンド
3. **UI D1 切替** — dual write なしで段階移行
4. **Phase 5** — Ask LLM 本格化

詳細は [ROADMAP.md](../ROADMAP.md) Phase 4 を参照。

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 — Phase 3b 完了記録 |
