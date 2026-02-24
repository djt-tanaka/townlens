# 指標カタログ — 全13指標の完全マッピング

## 全指標マッピングテーブル

| # | id | label | unit | direction | category | precision | merge ファイル | mapping キー |
|---|----|-------|------|-----------|----------|-----------|---------------|-------------|
| 1 | population_total | 総人口 | 人 | higher_better | childcare | 0 | (Phase 0 直接) | 除外(基本統計) |
| 2 | kids_ratio | 0-14歳比率 | % | higher_better | childcare | 1 | (Phase 0 直接) | 除外(基本統計) |
| 3 | condo_price_median | 中古マンション価格（中央値） | 万円 | lower_better | price | 0 | merge-scoring.ts (reinfo) | condoPriceMedian |
| 4 | crime_rate | 刑法犯認知件数（人口千人当たり） | 件/千人 | lower_better | safety | 2 | merge-crime-scoring.ts | crimeRate |
| 5 | flood_risk | 洪水・土砂災害リスク | リスクスコア | lower_better | disaster | 0 | merge-disaster-scoring.ts | floodRisk |
| 6 | evacuation_sites | 避難場所数 | 箇所 | higher_better | disaster | 0 | merge-disaster-scoring.ts | evacuationSiteCount |
| 7 | elementary_schools_per_capita | 小学校数（人口1万人あたり） | 校/万人 | higher_better | education | 2 | merge-education-scoring.ts | elementarySchoolsPerCapita |
| 8 | junior_high_schools_per_capita | 中学校数（人口1万人あたり） | 校/万人 | higher_better | education | 2 | merge-education-scoring.ts | juniorHighSchoolsPerCapita |
| 9 | station_count_per_capita | 鉄道駅数（人口1万人あたり） | 駅/万人 | higher_better | transport | 2 | merge-transport-scoring.ts | stationCountPerCapita |
| 10 | terminal_access_km | 最寄りターミナル駅距離 | km | lower_better | transport | 1 | merge-transport-scoring.ts | terminalAccessKm |
| 11 | hospitals_per_capita | 一般病院数（人口10万人あたり） | 施設/10万人 | higher_better | healthcare | 2 | merge-healthcare-scoring.ts | hospitalsPerCapita |
| 12 | clinics_per_capita | 一般診療所数（人口10万人あたり） | 施設/10万人 | higher_better | healthcare | 1 | merge-healthcare-scoring.ts | clinicsPerCapita |
| 13 | pediatrics_per_capita | 小児科標榜施設数（人口10万人あたり） | 施設/10万人 | higher_better | healthcare | 2 | merge-healthcare-scoring.ts | pediatricsPerCapita |

計: 13指標（7カテゴリ）

## 意図的除外

CategoryIndicatorCards.tsx の `groupByCategory` 関数で、以下のカテゴリはスキップされる:

- `childcare` カテゴリ（population_total, kids_ratio）— 基本統計として別コンポーネント（CityStats）で表示済み

よって、CategoryIndicatorCards の mapping には11個（13 - 2）の指標が含まれる。ただし mapping のキーは `evacuation_sites` → `evacuationSiteCount` のように CityRawData のフィールド名にマッピングされるため、presets.ts の `id` とは異なる場合がある。

## 既知の不整合

### 1. flood_risk の型不整合（優先度: HIGH）

**状態:**
- `presets.ts`: `unit: "リスクスコア"`, `precision: 0` — 数値を想定
- `types.ts` (ReportRow): `floodRisk?: boolean | null` — boolean 型
- `city-data.ts` (CityRawData): `floodRisk?: boolean | null` — boolean 型
- `merge-disaster-scoring.ts`: `rawValue: data?.riskScore ?? null` — number として merge
- `category-indicator-cards.tsx`: `typeof raw === "boolean"` で分岐 → `"あり"/"なし"` 表示

**問題:**
スコアリングパイプラインでは数値（riskScore: 0/1/2）として扱われるが、表示層では boolean として扱われる。`unit: "リスクスコア"` は実際の表示（"あり/なし"）と一致しない。

**影響:** 表示上は問題なく動作するが、precision=0 の意味が曖昧。

### 2. landslideRisk の未定義（優先度: MEDIUM）

**状態:**
- `types.ts` (ReportRow): `landslideRisk?: boolean | null` — フィールドは存在
- `presets.ts`: 対応する指標定義なし
- `CityRawData`: フィールドなし
- `CategoryIndicatorCards`: mapping なし

**問題:**
ReportRow に型定義はあるが、スコアリング・表示パイプラインに組み込まれていない。将来的に指標として追加するか、不要なら ReportRow から削除すべき。

### 3. clinics_per_capita の precision 不一致（優先度: LOW）

**状態:**
- `hospitals_per_capita`: precision = 2
- `clinics_per_capita`: precision = 1
- `pediatrics_per_capita`: precision = 2

**問題:**
同一カテゴリ（healthcare）の3指標で precision が不統一。clinics_per_capita の値域が他の2指標より大きい（一般診療所は病院より数が多い）ため、precision=1 は意図的な可能性もある。

## formatValue 関数の挙動仕様

```typescript
function formatValue(raw, def):
  if raw === null || raw === undefined → "-"
  if typeof raw === "boolean" → raw ? "あり" : "なし"
  if def.precision === 0 → Intl.NumberFormat("ja-JP").format(raw)  // "1,234"
  else → raw.toFixed(def.precision)                                 // "3.45"
```

| 指標 | 入力例 | precision | 出力例 |
|------|--------|-----------|--------|
| population_total | 1234567 | 0 | "1,234,567" |
| kids_ratio | 12.34 | 1 | "12.3" |
| condo_price_median | 5000 | 0 | "5,000" |
| crime_rate | 3.456 | 2 | "3.46" |
| flood_risk | true | 0 | "あり" |
| evacuation_sites | 42 | 0 | "42" |
| elementary_schools_per_capita | 0.852 | 2 | "0.85" |
| terminal_access_km | 2.53 | 1 | "2.5" |
| hospitals_per_capita | 6.25 | 2 | "6.25" |
| clinics_per_capita | 43.5 | 1 | "43.5" |
| 未取得 | null | - | "-" |

## 人口当たり単位の換算基準

| 基準人口 | 換算式 | 使用指標 |
|---------|--------|---------|
| 千人あたり | rawCount / population * 1000 | crime_rate |
| 万人あたり | rawCount / population * 10000 | education系, transport(駅数) |
| 10万人あたり | rawCount / population * 100000 | healthcare系 |

各 `build-*-data.ts`（`crime-data.ts` / `education-data.ts` / `healthcare-data.ts` / `transport-data.ts`）の perCapita 計算が上記換算式と一致することを検証する。

## カテゴリカラー定義

`packages/core/src/charts/colors.ts` の CATEGORY_COLORS:

| カテゴリ | 絵文字 | ラベル |
|---------|--------|--------|
| childcare | 👶 | 子育て |
| price | 🏠 | 住宅価格 |
| safety | 🛡️ | 安全 |
| disaster | 🌊 | 災害 |
| transport | 🚆 | 交通 |
| education | 🎓 | 教育 |
| healthcare | 🏥 | 医療 |

新カテゴリ追加時はここにもエントリを追加すること。
