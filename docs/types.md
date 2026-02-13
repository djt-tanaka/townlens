# 型定義

全型定義は `readonly` を徹底し、不変性を保証している。

## ReportRow（共通データ行）

**ファイル**: `src/types.ts`

e-Stat から取得した基本データと、各Phaseで追加されるオプショナルフィールドを持つ。

| フィールド | 型 | Phase | 説明 |
|-----------|-----|-------|------|
| `cityInput` | `string` | 0 | ユーザー入力の都市名 |
| `cityResolved` | `string` | 0 | APIで解決された正式名称 |
| `areaCode` | `string` | 0 | 地域コード |
| `total` | `number` | 0 | 総人口 |
| `kids` | `number` | 0 | 0-14歳人口 |
| `ratio` | `number` | 0 | 0-14歳比率 |
| `totalRank` | `number` | 0 | 総人口ランク |
| `ratioRank` | `number` | 0 | 比率ランク |
| `condoPriceMedian` | `number \| null` | 1 | 取引価格中央値（万円） |
| `condoPriceQ25` | `number \| null` | 1 | 第1四分位（万円） |
| `condoPriceQ75` | `number \| null` | 1 | 第3四分位（万円） |
| `condoPriceCount` | `number \| null` | 1 | 取引件数 |
| `affordabilityRate` | `number \| null` | 1 | 予算内取引割合（%） |
| `propertyTypeLabel` | `string \| null` | 1 | 物件タイプラベル |
| `crimeRate` | `number \| null` | 2a | 刑法犯認知件数（千人当たり） |
| `floodRisk` | `boolean \| null` | 2b | 洪水浸水リスクの有無 |
| `landslideRisk` | `boolean \| null` | 2b | 土砂災害リスクの有無 |
| `evacuationSiteCount` | `number \| null` | 2b | 指定緊急避難場所数 |

## 不動産API型定義

**ファイル**: `src/reinfo/types.ts`

### ReinfoTradeRecord

XIT001 API レスポンスの取引レコード。`Type`, `TradePrice`, `Municipality` 等のフィールドを持つ。

### CondoPriceStats

取引価格の統計結果。中央値・四分位・件数・年度・予算内割合を含む。

### PropertyType

物件タイプの列挙: `"condo" | "house" | "land" | "all"`

対応ラベル（`PROPERTY_TYPE_LABELS`）:

| 値 | ラベル |
|-----|--------|
| `condo` | 中古マンション等 |
| `house` | 中古戸建住宅 |
| `land` | 宅地(土地) |
| `all` | 全種別 |

## スコアリング型定義

**ファイル**: `src/scoring/types.ts`

### CityIndicators

都市ごとの全指標データ。`cityName`, `areaCode`, `indicators: ReadonlyArray<IndicatorValue>` を持つ。

### IndicatorDefinition

指標のメタ定義。`id`, `label`, `unit`, `direction`（higher_better / lower_better）, `category`, `precision` を持つ。

### IndicatorValue

単一の指標データポイント。`indicatorId`, `rawValue`（null許容）, `dataYear`, `sourceId` を持つ。

### CityScoreResult

都市ごとのスコアリング結果。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `cityName` | `string` | 都市名 |
| `areaCode` | `string` | 地域コード |
| `baseline` | `ReadonlyArray<BaselineScore>` | パーセンタイルスコア |
| `choice` | `ReadonlyArray<ChoiceScore>` | 候補内正規化スコア |
| `compositeScore` | `number` | 重み付き総合スコア |
| `confidence` | `ConfidenceResult` | 信頼度評価 |
| `rank` | `number` | 総合ランク |
| `notes` | `ReadonlyArray<string>` | 注記 |

### WeightPreset

重みプリセット。`name`, `label`, `weights: Record<IndicatorCategory, number>` を持つ。

### IndicatorCategory

指標カテゴリの列挙: `"childcare" | "price" | "safety" | "disaster" | "transport"`
