# Pizza-Lab

**世界中のピッツァ職人を支援する AI プラットフォーム**

目標生地温から仕込み条件を逆算し、その店の100点を学習する — スマホファーストのピッツァ生地インテリジェンス。

---

## 概要

Pizza-Lab は、ピッツァ職人の毎日の仕込みを支援する Web アプリケーションです。

- **Quick Mode（営業モード）** — 厨房で30秒以内に今日のレシピを出す
- **Learning Engine** — 実測記録から店舗ごとの摩擦係数を学習
- **Run History** — 研究記録の一覧と学習状態の確認
- **Weather API** — 外気温・湿度の取得（Open-Meteo）
- **Knowledge Base** — 公式・科学・インテリジェンス記事のキーワード検索
- **Lab Mode（ラボモード）** — 研究ノート・DNA・粉ブレンド・Journal・比較（v0.2） ✅ Phase 4
- **Dough Intelligence Engine** — 目標生地温から水温・氷量・摩擦・発酵を逆算
- **Dough DNA** — その店の100点を 17 食感軸で記録（`/lab/dna`） ✅

> 正解を押し付けない。その店の100点を一緒に育てる。

---

## ドキュメント

| ファイル | 内容 |
|----------|------|
| [MANIFESTO.md](./MANIFESTO.md) | 理念・憲章 |
| [PIZZALAB_MASTER.md](./PIZZALAB_MASTER.md) | 全体仕様の正本（v1.4） |
| [ROADMAP.md](./ROADMAP.md) | 開発フェーズ・将来計画 |
| [docs/ai/README.md](./docs/ai/README.md) | AI / mock RAG 設計 + 実装状態 |
| [docs/phase-5-summary.md](./docs/phase-5-summary.md) | Phase 5 完了サマリー（Ask mock RAG） |
| [docs/lab-mode/README.md](./docs/lab-mode/README.md) | Lab Mode 設計 + 実装状態 |
| [docs/phase-4-summary.md](./docs/phase-4-summary.md) | Phase 4 完了サマリー（Lab Mode 最小 UI） |
| [docs/database/README.md](./docs/database/README.md) | Phase 3 DB 設計（D1 / PostgreSQL 互換） |
| [docs/phase-3a-summary.md](./docs/phase-3a-summary.md) | Phase 3a 完了サマリー（D1 + Repository + API 土台） |
| [docs/phase-3b-summary.md](./docs/phase-3b-summary.md) | Phase 3b 完了サマリー（sync Worker + Calculator + Ask） |
| [docs/phase-1-die-core-summary.md](./docs/phase-1-die-core-summary.md) | Phase 1a DIE Core 完了サマリー |
| [docs/phase-1b-summary.md](./docs/phase-1b-summary.md) | Phase 1b Quick UI + Profile CRUD 完了サマリー |
| [docs/phase-2-summary.md](./docs/phase-2-summary.md) | Phase 2 完了サマリー（Learning / Weather / Knowledge） |

設計判断に迷ったときは **MANIFESTO.md** → **PIZZALAB_MASTER.md** の順に参照してください。

---

## 現在のステータス

**Phase 5: Ask AI — mock RAG / 研究パートナー土台** — ✅ 完了（2026-07-07）

| 項目 | 状態 |
|------|------|
| DIE Core（`lib/die/`） | ✅ |
| Quick Mode UI（`/quick`） | ✅ localStorage |
| Profile CRUD（`/profile`） | ✅ localStorage |
| Learning Engine（`lib/learning/`） | ✅ |
| Run 記録 / History | ✅ |
| Weather / Knowledge | ✅ |
| D1 土台 + Repository + API | ✅ Phase 3a |
| sync Worker（`POST /api/sync-worker`） | ✅ |
| Calculator（`/calculator`） | ✅ |
| Ask（`/ask` + `POST /api/ask`） | ✅ Knowledge 検索 + mock RAG opt-in |
| Lab Mode（`/lab` ほか 4 画面） | ✅ localStorage |
| `types/lab.ts` + `lib/lab/` | ✅ |
| `types/ai.ts` + `lib/ai/` | ✅ mock RAG 土台 |
| 単体テスト | ✅ **297 passed** |
| UI → D1 切替 / dual write | ⬜ Phase 6 以降 |
| remote D1 / 本番運用 | ⬜ デプロイ時 |
| 外部 LLM / Embedding RAG | ⬜ Phase 6 以降 |
| Lab ↔ DIE 深連携 | ⬜ Phase 4+ |

**方針:** Lab / Ask UI は localStorage 継続。Ask mock RAG は **toggle ON 時のみ**（外部 LLM 不使用）。

### 開発コマンド

```bash
npm install      # 依存関係インストール
npm test         # Vitest（297 tests）
npm run build    # Next.js ビルド + 型チェック
npm run lint     # ESLint
npm run dev      # 開発サーバー（http://localhost:3000）

# local D1（Phase 3a）
npx wrangler d1 migrations apply pizza_lab_db --local

# sync Worker（D1 binding 必須 — Cloudflare / local wrangler dev）
curl -X POST http://localhost:3000/api/sync-worker
```

**最終確認（2026-07-07）:** `npm test` / `npm run build` / `npm run lint` すべて成功。

---

## 使い方

### 1. 店舗プロファイル（/profile）

1. `/profile` で店舗名・粉・ミキサー・配合の初期値を登録
2. 「Quick で使う」でデフォルト店舗を選択

**localStorage キー:** `pizzalab-profiles-v1`

### 2. Quick Mode（/quick）

1. 店舗・用途・枚数などを入力し「今日のレシピを出す」
2. 推奨値（参考）を確認
3. **今日の一枚を記録する**（任意）:
   - 実測生地温 (°C)
   - 100点に近さ（1〜5）
   - メモ

記録は `pizzalab-learning-runs-v1` に保存され、`profile.learning` に反映されます。Run **5 件以上**で摩擦補正が次回計算に適用されます。

### 3. Run History（/die/history）

1. 保存済みの研究記録を店舗別に一覧表示
2. 予測 vs 実測（摩擦・DDT 誤差）を確認
3. 学習状態を確認（学習中 / 補正適用中 / 信頼度高）
4. 不要な記録は削除可能（profile.learning も再計算）

### 4. 天気 API（GET /api/weather）

外気温・湿度を Open-Meteo から取得します。Quick UI の「外気を取得」からも利用できます。

```bash
# 東京（デフォルト座標）
curl "http://localhost:3000/api/weather"

# 任意の座標
curl "http://localhost:3000/api/weather?latitude=35.6762&longitude=139.6503"
```

**レスポンス例（成功時）:**

```json
{
  "ok": true,
  "weather": {
    "outdoorTempC": 28.5,
    "outdoorHumidityPct": 65,
    "latitude": 35.6762,
    "longitude": 139.6503,
    "fetchedAt": "2026-07-06T12:00:00.000Z"
  }
}
```

- 30 分インメモリキャッシュ
- 失敗時も HTTP 500 ではなく `{ "ok": false, ... }` を返す（手入力フォールバック）
- Quick から DIE 計算する際は `body.weather` に付与。**手入力の室温は上書きしない**

### 5. Knowledge Base（/knowledge）

`content/knowledge/` の Markdown 記事（12 本）をキーワード検索できます。AI / RAG は不使用。

1. `/knowledge` を開く
2. キーワード（例: `摩擦`, `VPN`, `発酵`）を入力
3. タイトル・抜粋・タグがマッチした記事が表示される

**記事カテゴリ:** `official/`（VPN, STG, APN） / `science/`（グルテン, 発酵, 温度, 摩擦 等 9 本）

### 6. API（POST /api/die/quick）

```bash
curl -X POST http://localhost:3000/api/die/quick \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "quick",
    "shopId": "shop-1",
    "presetId": "preset-1",
    "batch": { "pizzaCount": 40, "ballWeightG": 250 },
    "environment": { "shopRoomTempC": 26 }
  }'
```

保存済み店舗・学習反映済み profile は `profile` フィールドに含めて送信します。外気データは `weather` フィールドに含められます。

### 7. Lab Mode（/lab ほか）

研究・実験用。データはブラウザ localStorage のみ（D1 / API 未使用）。

| パス | 用途 |
|------|------|
| `/lab` | 研究ノート（LabSession）— タイトル・仮説 |
| `/lab/dna` | その店の100点 — 17 食感スコア（0–100） |
| `/lab/blend` | 粉ブレンド — 2–5 種・合計 100% |
| `/lab/journal` | 観察・仮説・手順・結果・次に試すこと |
| `/lab/comparison` | Side A/B 比較 — 違いを見る記録 |

**localStorage キー:**

| キー | 内容 |
|------|------|
| `pizzalab-lab-sessions-v1` | LabSession[] |
| `pizzalab-dna-v1` | DoughDNA[] |
| `pizzalab-flour-blends-v1` | FlourBlend[] |
| `pizzalab-journal-v1` | DoughJournal[] |
| `pizzalab-comparisons-v1` | ComparisonRun[] |

各 Lab 画面から Quick / Calculator / Ask / Knowledge へリンクできます。DIE 計算は Phase 4 最小 UI では未呼び出し。

詳細: [docs/phase-4-summary.md](./docs/phase-4-summary.md)

### 8. Ask（/ask + POST /api/ask）

**デフォルト:** Knowledge キーワード検索（`aiUsed: false`）— Phase 3b 互換

1. `/ask` を開く
2. 相談内容を入力 →「記事を探す」
3. ガイド文 + Knowledge 候補記事が表示される

**mock 研究パートナー（opt-in）:** Phase 5 ✅

1. `/ask` で **「研究パートナー回答を使う（mock）」** を ON
2. 相談内容を入力 →「研究パートナーに相談（mock）」
3. 選択店舗の Lab / Run / Profile データを localStorage から context に含めて送信
4. mock 回答（`aiUsed: true`）+ 出典 + 次の一枚 + 注意が表示される

**外部 LLM / API キーは使用しません。** MockLLMAdapter のみ。

**API 例（mock RAG）:**

```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"冷蔵発酵について","useLlm":true,"shopId":"shop-1"}'
```

詳細: [docs/phase-5-summary.md](./docs/phase-5-summary.md) / [docs/ai/README.md](./docs/ai/README.md)

---

## 2モード

### Quick Mode（営業モード）

```
入力: 店舗 + 用途 + 枚数（+ 室温任意）
出力: 配合、水温、氷、発酵、信頼度
記録: 実測生地温 + 100点に近さ（任意）
```

### Lab Mode（ラボモード）— v0.2 ✅ Phase 4

研究・実験用。5 画面 + localStorage。DIE 深連携・D1 は未実装。

```
/lab          → 研究ノート（LabSession）
/lab/dna      → その店の100点（17 食感）
/lab/blend    → 粉の個性・比率
/lab/journal  → 観察・仮説・次の一枚
/lab/comparison → Side A/B 比較
```

## コア機能

### Dough Intelligence Engine（DIE）

決定論エンジン。AI は計算に不使用。

```
目標DDT = (粉温 + 有効水温 + 室温 + 摩擦) / 4
```

### Learning Engine

```
Run 記録 → 摩擦誤差集計 → profile.learning
Run 5+  → learnedFrictionOffset 適用
Run 20+ → 信頼度「高」（History 表示）
```

**モジュール:** `lib/learning/`（純粋関数 + `learning-storage.ts`）

---

## 技術方針

| レイヤー | 技術 |
|----------|------|
| Frontend | Next.js 15 + TypeScript（スマホファースト） |
| 永続化 | localStorage（UI）+ optional D1 API（`lib/db/`、`pizza_lab_db`）→ 将来 PostgreSQL |
| 天気 | Open-Meteo + `lib/weather/` + D1 optional cache（`GET /api/weather`） ✅ |
| 計算 | 純粋関数（`lib/die/` + `lib/defaults/` + `lib/calculator/` + `lib/learning/`） |
| Knowledge | `content/knowledge/` + `lib/knowledge/`（キーワード検索） ✅ |
| Ask | `lib/ask/` + `lib/ai/` — Knowledge 検索 + mock RAG opt-in ✅ |
| Lab | `lib/lab/` — localStorage CRUD + validation ✅ |
| AI / LLM | mock RAG 土台 ✅（外部 LLM ⬜ Phase 6 以降） |

---

## プロジェクト構成

```
pizza-lab/
├── app/
│   ├── api/
│   │   ├── die/quick/          # POST /api/die/quick ✅
│   │   ├── weather/            # GET /api/weather ✅ D1 optional cache
│   │   ├── profile/            # GET/POST/DELETE /api/profile ✅
│   │   ├── learning-runs/      # GET/POST/DELETE /api/learning-runs ✅
│   │   ├── sync-queue/         # GET/POST/PATCH /api/sync-queue ✅
│   │   ├── sync-worker/        # POST /api/sync-worker ✅
│   │   └── ask/                # POST /api/ask ✅
│   ├── quick/                  # Quick Mode ✅
│   ├── profile/                # Profile CRUD ✅
│   ├── die/history/            # Run History ✅
│   ├── knowledge/              # Knowledge 検索 ✅
│   ├── calculator/             # Baker's % Calculator ✅
│   ├── ask/                    # Ask UI ✅
│   └── lab/                    # Lab Mode ✅
│       ├── page.tsx            # LabSession
│       ├── dna/                # Dough DNA
│       ├── blend/              # Flour Blend
│       ├── journal/            # Dough Journal
│       └── comparison/         # ComparisonRun
├── migrations/
│   └── 0001_initial.sql        # D1 migration（local 適用済み）✅
├── wrangler.toml               # D1 binding `DB` → pizza_lab_db ✅
├── content/knowledge/          # Markdown 記事 12 本 ✅
├── lib/
│   ├── die/                    # Dough Intelligence Engine ✅
│   ├── defaults/               # 補完層 ✅
│   ├── learning/               # Learning Engine ✅
│   ├── weather/                # 天気 API ✅
│   ├── knowledge/              # Knowledge loader / search ✅
│   ├── profile/                # profile-storage ✅
│   ├── db/                     # D1 Repository ✅
│   ├── sync/                   # sync Worker ✅
│   ├── calculator/             # Baker's % ✅
│   ├── ask/                    # Ask + mock RAG ✅
│   ├── ai/                     # ResearchContext / MockLLMAdapter ✅
│   ├── lab/                    # Lab Mode storage + validation ✅
│   └── api/                    # HTTP handlers ✅
├── types/
│   ├── lab.ts                  # Lab Mode 型 ✅
│   └── ai.ts                   # AI / ResearchContext 型 ✅
├── data/
└── docs/
    ├── ai/                     # Phase 5 AI 設計 + 実装状態 ✅
    ├── database/             # Phase 3 DB 設計（6 テーブル DDL）✅
    ├── lab-mode/             # Lab Mode 設計 + 実装状態 ✅
    ├── phase-4-summary.md    # Phase 4 完了サマリー ✅
    └── phase-5-summary.md    # Phase 5 完了サマリー ✅
```

---

## 開発の進め方

1. **Phase 0 / 0.5** — 設計 + Master JSON ✅
2. **Phase 1** — DIE Core + Quick UI + Profile ✅
3. **Phase 2** — Learning + Run 記録 + History + Weather + Knowledge ✅
4. **Phase 3 設計** — DB データモデル（`docs/database/`） ✅
5. **Phase 3a** — D1 local + Repository + API 土台 ✅
6. **Phase 3b** — sync Worker + Calculator + Ask ✅
7. **Phase 4** — Lab Mode 最小 UI（localStorage） ✅
8. **Phase 5** — Ask mock RAG / 研究パートナー土台 ✅
9. **Phase 6** — 本番公開準備（公開β設計） ✅ — [docs/deploy/](./docs/deploy/README.md)
10. **Phase 6h-W** — GitHub Actions staging deploy 経路 ✅
11. **Phase 6h-CI 以降** — Actions 手動 deploy / smoke test ← **次**

詳細は [ROADMAP.md](./ROADMAP.md) を参照。

---

## License

TBD
