# Open-Meteo 利用メモ（Pizza Lab）

**データソース:** [Open-Meteo](https://open-meteo.com/)（仕込み記録の呉市周辺外気温）

## 商用利用

- Open-Meteo は **非商用利用を無償** とし、**商用利用は利用規約・API プランの確認が必要** です。
- 公式: [Terms](https://open-meteo.com/en/terms) / [Pricing](https://open-meteo.com/en/pricing)
- NALIPO 営業前に、店主利用・記録保存件数に見合うプランまたは代替データソースを **人手で確認** すること。

## 実装方針

- API キー不要の Forecast API（`api.open-meteo.com`）をプロキシ経由で使用。
- **取得失敗時も仕込み記録は保存**し、`weather.fetchStatus = unavailable` を保存する。
- 欠測時はグラフで 0℃ と表示しない。