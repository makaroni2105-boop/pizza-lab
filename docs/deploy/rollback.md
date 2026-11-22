# ロールバック・バックアップ

> **原則:** D1 migration は **forward-only**。ロールバック = バックアップから **リストア**。

---

## 1. バックアップ — 必須タイミング

| タイミング | 方法 | ゲート |
|-----------|------|--------|
| remote D1 作成直後 | 初回 export | migration 前 |
| migration 適用前 | `wrangler d1 export` | **必須** |
| 公開β Go-Live 前 | export + git tag | checklist §8 |
| スキーマ変更前 | export | 毎回 |

```bash
# ⚠️ まだ実行しない — remote 作成後のみ
npx wrangler d1 export pizza_lab_db --remote --output=backup/pizza_lab_db_YYYYMMDD.sql
```

**保存:** `backup/` は gitignore（ローカル or 安全なストレージのみ）。

---

## 2. D1 バックアップ手順

1. export 実行（上記）
2. ファイルサイズ・テーブル数を記録
3. 別環境で import テスト（**staging のみ**）

```bash
# ⚠️ まだ実行しない
npx wrangler d1 execute pizza_lab_db --remote --file=backup/pizza_lab_db_YYYYMMDD.sql
```

---

## 3. localStorage バックアップ（店主向け）

公開β初期は UI データが localStorage にある。

| キー | 内容 |
|------|------|
| `pizzalab-profiles-v1` | 店舗プロファイル |
| `pizzalab-learning-runs-v1` | Run 記録 |
| `pizzalab-lab-*` | Lab 5 キー |

**案内（任意）:** ブラウザ DevTools → Application → Local Storage → エクスポート。  
**将来:** Profile 画面から JSON エクスポート UI（Phase 6b 以降）。

---

## 4. アプリロールバック

| 手段 | 手順 |
|------|------|
| Cloudflare Pages | 前デプロイメントに Rollback（Dashboard） |
| git | 前リリース tag に checkout → 再 deploy |

**確認ゲート:**
- [ ] ロールバック対象バージョンで `npm test` 通過済み
- [ ] ロールバック後 smoke test（Quick / Ask / Lab）

**⚠️ 本番 deploy 前はロールバック手順を staging で 1 回 rehearsal する。**

### 4.1 `pizza-lab-staging` 緊急停止（NALIPO 営業・/daily）

認証不具合や誤公開の疑い。**Access Application の Disable / Worker Access 解除のみを「外部遮断」とみなさない。** 先に **公開経路** を止める。

| 優先 | 操作 |
|------|------|
| 1 | `pizza-lab-staging` → Settings → Domains & Routes → **workers.dev Disable** |
| 2 | `preview_urls = false` を維持した再 deploy、または Dashboard で Preview 無効 |
| 3 | Access で **Deny（Block）** を有効化（認証層の補助） |
| 4 | Deployments **Rollback** |
| 5 | 最終: **`pizza-lab-staging` のみ削除**（NALIPO 他 Worker・本番 `pizza-lab` 禁止） |

詳細: [staging-nalipo-daily-go-live.md](./staging-nalipo-daily-go-live.md) §5.

---

## 5. D1 migration ロールバック

D1 は **down migration 非対応**（Wrangler forward-only）。

| 事故 | 対応 |
|------|------|
| 誤 migration | 直前 export から **新 DB 作成 → import → binding 切替** |
| データ破損 | export リストア + アプリロールバック |
| テーブル誤削除 | export リストアのみ |

**禁止:** 本番 D1 で `DROP TABLE` を手動実行。

---

## 6. インシデント連絡

| 役割 | 担当 | 連絡先 |
|------|------|--------|
| 開発責任者 | （記入） | — |
| NALIPO 運用 | （記入） | — |
| 店主サポート | （記入） | — |

**エスカレーション:** API 全断 / データ消失疑い → 即ロールバック検討 + 店主通知。

---

## 7. 公開βロールバック判断基準

| 条件 | アクション |
|------|-----------|
| Ask が外部 LLM を呼んだ疑い | **即 deploy 停止** + env 監査 |
| DIE 計算結果が変わった | 前バージョン deploy + 原因調査 |
| 他店 shopId データ漏洩 | **即アクセス停止** + セキュリティ review |
| D1 migration 失敗 | deploy 中止 + export 確認 |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 |
