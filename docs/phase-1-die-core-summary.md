# Phase 1 DIE Core 完了サマリー

> **完了日:** 2026-07-06  
> **スコープ:** 型定義・defaults 補完層・DIE 純粋関数・オーケストレーター（計算のみ）  
> **未スコープ:** UI / API Routes / AI / DB / Learning Engine 実装

---

## 1. 実装済みモジュール

| パス | 責務 |
|------|------|
| `types/profile.ts` | 店舗プロファイル・Quick/Lab 入力 DTO |
| `types/die.ts` | DIE 入出力型（DieRequest, DieOutput, DieResolvedInput 等） |
| `lib/defaults/` | master JSON 読み込み + unknown/null 補完 + fieldResolution |
| `lib/die/friction.ts` | effectiveFrictionC = base + manual + learned |
| `lib/die/recommend.ts` | DDT 4要素モデルによる水温逆算 |
| `lib/die/ice.ts` | 推奨水温 < 4°C 時の氷量推奨 |
| `lib/die/recipe.ts` | Baker's % → g 換算 |
| `lib/die/yeast-adjust.ts` | 室温・生地温差・発酵時間に基づく酵母補正 |
| `lib/die/fermentation-adjust.ts` | 発酵時間補正・仕込み開始時刻逆算 |
| `lib/die/compute.ts` | `computeDie()` — defaults + 各モジュール → DieOutput |
| `lib/die/index.ts` | DIE 公開 API |

---

## 2. データフロー

```
DieRequest + ShopProfile
  → lib/defaults/resolveDefaults()
    → lib/die/computeDie()
      → friction → recommend → ice → recipe → yeast-adjust → fermentation-adjust
        → DieOutput
```

- 計算は **決定論的純粋関数のみ**（AI 不使用）
- 補完は `lib/defaults/`、加算・逆算は `lib/die/` — 責務分離を維持
- 不足入力時は該当ブロックをフォールバックし、全体はクラッシュしない

---

## 3. 品質状態（2026-07-06 時点）

| コマンド | 結果 |
|---------|------|
| `npm test` | **84 tests passed** |
| `npm run build` | 成功 |
| `npm run lint` | No ESLint warnings or errors |

テスト配置:

- `lib/defaults/*.test.ts`
- `lib/die/*.test.ts`
- `lib/smoke.test.ts`

---

## 4. Phase 1 で未実装（Phase 1b / Phase 2 以降）

| 項目 | 予定フェーズ |
|------|-------------|
| Quick Mode UI | Phase 1b |
| Lab Mode UI | Phase 4 |
| API Routes | Phase 1b |
| プロファイル CRUD / 初回セットアップ UI | Phase 1b |
| AI 処理（Ask 等） | Phase 3 以降 |
| DB 永続化 | Phase 3 |
| Learning Engine 実装（`lib/learning/`） | Phase 2 |
| 天気 API 連携 | Phase 2 |

---

## 5. 設計正本との整合

| 正本 | 整合 |
|------|------|
| `PIZZALAB_MASTER.md` §4 | DIE 入出力・計算式と一致 |
| `docs/schemas/die-input.schema.json` | `types/die.ts` が準拠 |
| `docs/schemas/profile.schema.json` | `types/profile.ts` が準拠 |
| `docs/defaults-fallback.md` | `lib/defaults/` が準拠 |
| `data/*.json` | 読み取り専用参照（変更なし） |
| `.cursor/rules/dough-intelligence.mdc` | モジュール分割と一致 |

---

## 6. 次のステップ（Phase 1b）

1. プロファイル CRUD（localStorage）
2. Quick Mode UI（`/quick`）
3. API Route（`computeDie` を呼ぶ薄い層）
4. 信頼度バッジ・推定値表示

詳細は [ROADMAP.md](../ROADMAP.md) Phase 1b を参照。

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-06 | 初版（Phase 1 DIE Core 完了記録） |
