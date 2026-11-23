# 環境変数

> **Phase 6 方針:** 外部 LLM **未接続**。公開βでは最小構成。

---

## 1. 現状（v1.4）

| 変数 | 必須 | 用途 | 公開β |
|------|------|------|-------|
| （なし） | — | 現行コードは `process.env` 未使用 | ✅ |

**確認:** リポジトリに `.env` / API キーを **コミットしない**。

---

## 2. 外部 LLM — 未接続方針

| 変数（将来） | 公開β | 方針 |
|-------------|-------|------|
| `OPENAI_API_KEY` | **設定禁止** | Phase 6 以降・別 ADR |
| `ANTHROPIC_API_KEY` | **設定禁止** | 同上 |
| `LLM_PROVIDER` | **設定禁止** | mock のみ |

**Ask AI:** MockLLMAdapter のみ。`useLlm: true` でも外部 API は呼ばない。

**確認ゲート（デプロイ前）:**
- [ ] Cloudflare / Vercel / ホスティングの secrets に LLM キーが **ない**
- [ ] `npm run build` ログに API キーが出力されない

---

## 3. Cloudflare / Next.js（公開β候補）

| 変数 | 必須 | 用途 | 備考 |
|------|------|------|------|
| `NODE_ENV` | 自動 | `production` | ホスティング側 |
| D1 binding `DB` | API 使用時 | wrangler.toml | Worker / Pages Functions |

**Next.js on Cloudflare Pages の場合:** D1 は `wrangler.toml` binding 経由。追加 env は公開β開始時に最小限のみ。

---

## 4. 天気 API

| 変数 | 必須 | 用途 |
|------|------|------|
| `OPENWEATHER_API_KEY` | 本番で外気取得する場合 | Cloudflare **Secret** のみ。git / ブラウザに載せない |

| サービス | 方針 |
|----------|------|
| OpenWeather Current Weather 2.5 | サーバー側プロキシ（`lib/weather/`） |
| キー未設定 | 外向き通信なし・記録は `unavailable` で保存可 |

詳細: [docs/weather/openweather-usage.md](../weather/openweather-usage.md)

---

## 5. 認証（公開β候補 — 未決定）

| 変数（候補） | 用途 | 状態 |
|-------------|------|------|
| `BETA_ACCESS_TOKEN` | 招待トークン検証 | 設計のみ |
| `CF_ACCESS_*` | Cloudflare Access | 設計のみ |

詳細: [security.md](./security.md) §4

---

## 6. localStorage → D1 切替（Phase 6b 以降）

| 方針 | 内容 |
|------|------|
| 公開β初期 | UI **localStorage 継続** — env フラグ不要 |
| 将来 | `NEXT_PUBLIC_STORAGE_MODE=local|d1` 等 — **未実装** |
| dual write | **実装しない**（別 ADR） |

**確認ゲート:** UI 切替 feature flag を有効にする前に、別チェックリストを作成する。

---

## 7. secrets 管理

| ルール | 内容 |
|--------|------|
| 保存場所 | Cloudflare Dashboard Secrets / ホスティング secrets のみ |
| git | `.env*` は `.gitignore` |
| ローテーション | LLM キー導入時に手順追加（Phase 6 以降） |
| NALIPO | Pizza-Lab secrets と **共有しない** |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 |
