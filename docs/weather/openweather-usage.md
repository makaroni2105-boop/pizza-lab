# OpenWeather 利用メモ（Pizza Lab）

**データソース:** [OpenWeather](https://openweathermap.org/) — Current Weather API 2.5  
**座標:** 呉市周辺（`KURE_WEATHER_COORDINATES`）

## 実装

- サーバー側のみ: `lib/weather/weather-client.ts` → `GET /api/weather`、仕込み記録 POST 時の自動取得
- シークレット: Worker / ホスティングに **`OPENWEATHER_API_KEY`**（リポジトリ・ブラウザに含めない）
- 未設定時: **外部通信なし**。記録は `weather.fetchStatus = unavailable` で保存
- キャッシュ: 30 分 TTL（`WEATHER_CACHE_TTL_MS`）— 過剰アクセス抑制
- タイムアウト: `WEATHER_FETCH_TIMEOUT_MS`（既定 8 秒）

## 無料プラン（One Call / Current Weather — 要アカウント）

| 項目 | 内容 |
|------|------|
| 取得 API | Current Weather Data 2.5（`units=metric` → 気温 ℃） |
| キー | ダッシュボードで発行。無料枠は **1 分あたり呼び出し数に上限**（公式ドキュメントで最新値を確認） |
| コール目安 | 仕込み 1 日 1 回保存 + Quick の手動取得 → **月数百回程度**（キャッシュでさらに削減） |

公式: [Terms](https://openweathermap.org/terms) / [FAQ](https://openweathermap.org/faq) / [License](https://openweathermap.org/storage/app/media/License_EN_od_04032023.pdf)

## 表示・帰属（必須）

- UI: `OpenWeatherAttribution` コンポーネント — 公式ロゴ・ [openweathermap.org](https://openweathermap.org/) へのリンク
- 仕込み記録スナップショットに `provider` / `fetchedAtIso` / `observationTimeIso` を保存

## 保存・派生利用

- D1 に保存するのは **スナップショット**（営業記録・グラフ・AI 検索用メタ）であり、OpenWeather の raw レスポンス全体の再配布ではない
- 記録の **編集（PATCH）では気象スナップショットを再取得しない** — 過去日の外気温を現在値で上書きしない
- 派生データ（グラフ等）は店内記録の一部として利用。再販 API・第三者への生データ提供は **Terms 違反になり得る** — 商用サービス化時は法務確認

## 将来の商用サービス提供時

- OpenWeather 無料キーは **商用 SaaS のバックエンドに無制限利用できない場合がある** — 利用者数・コール数に応じ **有料プラン** または **自店舗利用に限定** を確認
- NALIPO 店主専用ツールとしての利用と、不特定多数への気象 API 中継は **別リスク**
- Pizza Lab と NALIPO 予約の **シークレット共有禁止**（`OPENWEATHER_API_KEY` は Pizza Lab Worker のみ）

## Open-Meteo について

2026-11 以降、Pizza Lab コードベースから **Open-Meteo エンドポイントへの通信は削除**。旧メモ: [open-meteo-usage.md](./open-meteo-usage.md)