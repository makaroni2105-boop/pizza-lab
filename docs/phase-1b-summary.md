# Phase 1b 完了サマリー

> **完了日:** 2026-07-06  
> **スコープ:** Quick Mode UI / Profile CRUD（localStorage）/ API Route  
> **未スコープ:** DB / Learning Engine 実装 / AI / Lab Mode UI / 5分セットアップウィザード

---

## 1. 実装済みモジュール

| パス | 責務 |
|------|------|
| `app/api/die/quick/route.ts` | `POST /api/die/quick` — HTTP エントリポイント |
| `lib/api/die-quick-handler.ts` | リクエスト検証 → `computeDie()` → 安全な JSON レスポンス |
| `lib/profile/demo-profiles.ts` | デモ店舗 `shop-1`（DB 未実装時の fallback） |
| `lib/profile/profile-storage.ts` | localStorage CRUD + Quick 連携ヘルパー |
| `app/quick/` | Quick Mode UI（最小入力 → 結果表示） |
| `app/profile/` | 店舗プロファイル CRUD UI |

---

## 2. API: POST /api/die/quick

**リクエスト（JSON）:**

```json
{
  "mode": "quick",
  "shopId": "shop-1",
  "presetId": "preset-1",
  "batch": { "pizzaCount": 40, "ballWeightG": 250 },
  "environment": { "shopRoomTempC": 26 },
  "useTime": "2026-07-07T12:00:00.000Z",
  "profile": { "...": "ShopProfile（保存済み店舗の場合のみ）" }
}
```

**成功レスポンス:**

```json
{
  "success": true,
  "output": { "...": "DieOutput" },
  "incompleteBlocks": []
}
```

**エラーレスポンス:**

- `400` — `INVALID_REQUEST`（形式不正）
- `404` — `PROFILE_NOT_FOUND`（未知の shopId かつ profile なし）
- `200` + `{ success: false, error: { code, message } }` — 計算失敗等（HTTP 500 は返さない）

**profile の渡し方:**

| ケース | body |
|--------|------|
| サンプル店舗 | `shopId: "shop-1"` のみ → サーバーが demo profile を使用 |
| 保存済み店舗 | `shopId` + `profile`（`profile.id === shopId` 必須） |

---

## 3. Quick Mode UI（/quick）

**入力（最小）:**

- 店舗（サンプル + localStorage 保存済み）
- 用途プロファイル（`presetId` — 選択店舗の presets から動的生成）
- 作る枚数、1枚重量
- 店舗室温（任意）
- 使用予定時刻（`useTime`）

**出力（参考値として表示）:**

- 推奨水温、氷の要否・量
- 配合 g（粉・水・塩・酵母・合計）
- 酵母補正
- 仕込み開始時刻の目安
- confidence（高/中/低）

**連携:** `/profile` へのリンク。選択店舗 ID は `pizzalab-profiles-v1` の `selectedShopId` に保存。

---

## 4. Profile CRUD（/profile）

**永続化:** ブラウザ localStorage

**キー:** `pizzalab-profiles-v1`

**構造:**

```json
{
  "profiles": [ "...ShopProfile[]" ],
  "selectedShopId": "shop-xxx | null"
}
```

**操作:**

| 操作 | 内容 |
|------|------|
| 一覧 | 保存済み店舗の表示 |
| 新規作成 / 編集 | 店舗名、粉、ミキサー、配合・DDT・発酵の初期値 |
| 削除 | 確認ダイアログ付き |
| Quick で使う | `selectedShopId` を更新 |

**位置づけ:** その店の「100点」を学習する土台。Learning は Phase 2 で実装。

**設計との差分:** `docs/quick-mode-flow.md` の 3 ステップ・5 分ウィザードは未実装。Phase 1b では CRUD フォームのみ（最小 UI）。

---

## 5. デモ profile fallback

- `lib/profile/demo-profiles.ts` の `shop-1`（Demo Pizzeria）
- Quick Mode でサンプル店舗選択時は `body.profile` を送らず、API 側 `resolveShopProfile()` が demo を返す
- 保存済み店舗が 0 件でも Quick Mode は動作可能

---

## 6. 品質状態（2026-07-06 時点）

| コマンド | 結果 |
|---------|------|
| `npm test` | **94 tests passed** |
| `npm run build` | 成功（`/quick`, `/profile`, `/api/die/quick`） |
| `npm run lint` | No ESLint warnings or errors |

追加テスト: `lib/profile/profile-storage.test.ts`（6 tests）、`lib/api/die-quick-handler.test.ts`（4 tests）

---

## 7. Phase 1b で未実装

| 項目 | 予定フェーズ |
|------|-------------|
| DB 永続化（PostgreSQL） | Phase 3 |
| Learning Engine（`lib/learning/`） | Phase 2 |
| 実測記録 UI | Phase 2 |
| 天気 API | Phase 2 |
| AI（Ask 等） | Phase 3 以降 |
| Lab Mode UI | Phase 4 |
| 5 分セットアップウィザード | 将来（現状 `/profile` CRUD） |
| `/settings/profile` 統合 | 将来 |

---

## 8. 設計正本との整合

| 正本 | 整合 | 備考 |
|------|------|------|
| `PIZZALAB_MASTER.md` §2.1 Quick Mode | ✅ | 最小入力・参考出力・信頼度 |
| `PIZZALAB_MASTER.md` §3 プロファイル | ✅ | `ShopProfile` 型準拠 |
| `docs/quick-mode-flow.md` | △ | 30秒フローは実装済み。5分ウィザードは Phase 1b 外 |
| `docs/schemas/profile.schema.json` | ✅ | `types/profile.ts` 経由 |
| `docs/schemas/die-input.schema.json` | ✅ | `QuickModeRequest` / `DieOutput` |
| `docs/defaults-fallback.md` | ✅ | DIE Core 経由で変更なし |
| `lib/die/*` | ✅ | 変更なし |
| `lib/defaults/*` | ✅ | 変更なし |

---

## 9. 次のステップ（Phase 2）

1. Learning Engine（摩擦補正の移動平均）
2. 実測記録 UI（Quick から 1 タップ）
3. Run 履歴（`/die/history`）
4. 天気 API 連携

詳細は [ROADMAP.md](../ROADMAP.md) Phase 2 を参照。

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-06 | 初版（Phase 1b 完了記録） |
