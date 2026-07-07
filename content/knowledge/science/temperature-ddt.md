---
id: science-temperature-ddt
tier: 2
category: science/temperature
titleJa: DDT（生地仕上げ温度）4要素モデル
summaryType: parameter
tags: 温度,DDT,水温,摩擦
keywords: DDT,4要素,水温,粉温,室温,摩擦
aiUsable: true
---

# DDT 4要素モデル

Pizza-Lab の DIE は、次の関係を前提に推奨水温を逆算します。

```
目標DDT ≈ (粉温 + 有効水温 + 室温 + 摩擦) / 4
```

## 各要素

| 要素 | 典型ソース |
|------|------------|
| 粉温 | 実測 / 外気推定 |
| 有効水温 | 水温 ± 氷 |
| 室温 | 店舗室温 / 外気推定 |
| 摩擦 | ミキサー master + Learning |

## 注意

これは**参考モデル**です。実測生地温の記録が、最も信頼できる研究データになります。
