# e-Stat 指標カテゴリ追加 — 詳細実装手順

## テンプレートファイル一覧

新指標追加時に読み取るべきテンプレート:

| ステップ | テンプレートファイル | 用途 |
|---------|-------------------|------|
| Step 1 | `packages/core/src/estat/healthcare-data.ts` | データ取得モジュール |
| Step 2 | `packages/core/src/estat/merge-healthcare-scoring.ts` | マージ関数 |
| Step 9a | `packages/core/tests/estat/healthcare-data.test.ts` | データ取得テスト |
| Step 9b | `packages/core/tests/estat/merge-healthcare-scoring.test.ts` | マージテスト |

## Step 1 詳細: データ取得モジュール

### ファイル構造

```typescript
// packages/core/src/estat/{category}-data.ts

import type { EstatApiClient, GetStatsDataParams } from "./client";
import {
  extractClassObjects,
  resolveDefaultFilters,
  resolveTimeCandidates,
  resolveLatestTime,
  extractDataValues,
  valuesByArea,
} from "./meta";
import { expandAreaCodes, aggregateRawValues } from "./meta/ward-reorganization";
import { normalizeLabel } from "../normalize/label";

export interface {Category}DataConfig {
  readonly statsDataId: string;
  readonly timeCode?: string;
}

export interface {Category}Stats {
  readonly indicatorA?: number | null;
  readonly indicatorB?: number | null;
  readonly dataYear: string;
}

export async function build{Category}Data(
  client: EstatApiClient,
  areaCodes: ReadonlyArray<string>,
  config: {Category}DataConfig,
): Promise<ReadonlyMap<string, {Category}Stats>> {
  if (areaCodes.length === 0) return new Map();

  // 区再編対応: 新コード -> 旧コードに展開
  const { expandedCodes, newToOldMapping } = expandAreaCodes(areaCodes);

  const metaInfo = await client.getMetaInfo(config.statsDataId);
  const classObjs = extractClassObjects(metaInfo);
  const result = new Map<string, {Category}Stats>();

  // 年フォールバック: 最新年 -> 過去年
  const timeCandidates = config.timeCode
    ? [resolveLatestTime(classObjs, config.timeCode)]
    : resolveTimeCandidates(classObjs).slice(0, 5);

  for (const timeSelection of timeCandidates) {
    const excludeIds = new Set(["area", "time", timeSelection.classId]);
    const extraFilters = resolveDefaultFilters(classObjs, excludeIds);
    const extraParams = Object.fromEntries(
      extraFilters.map((f) => [f.paramName, f.code]),
    );

    // 指標自動検出（例: normalizeLabel で class item 名からマッチ）
    // const indicatorClass = classObjs.find(...)
    // const indicatorParamName = toCdParamName(indicatorClass.id)

    const queryParams: GetStatsDataParams = {
      statsDataId: config.statsDataId,
      cdArea: expandedCodes.join(","),
      cdTime: timeSelection.code,
      ...extraParams,
    };

    const response = await client.getStatsData(queryParams);
    const values = extractDataValues(response);
    const areaMap = valuesByArea(values, timeSelection.code);

    // 旧区コードの実数を新コードへ集約
    if (newToOldMapping.size > 0) {
      aggregateRawValues(areaMap, newToOldMapping);
    }

    // ... areaMap -> result へマッピング（perCapita 変換含む）
    // result.set(areaCode, { indicatorA, indicatorB, dataYear })

    if (result.size > 0) return result;
  }

  return result; // すべての候補年で0件なら空Map
}
```

### 重要パターン

**perCapita 変換**: 人口当たり指標を計算する場合、人口データを別途取得するか、既存の人口データを引数として受け取る。

```typescript
// 人口1万人当たりの例
const perCapita = population > 0 ? (rawCount / population) * 10000 : null;
```

**年フォールバック**: 最新年にデータがない場合、1年前→2年前とフォールバック。

```typescript
const timeCandidates = config.timeCode
  ? [resolveLatestTime(classObjs, config.timeCode)]
  : resolveTimeCandidates(classObjs).slice(0, 5);

for (const timeSelection of timeCandidates) {
  // 年ごとに取得して、データが見つかった時点で採用
}
```

## Step 2 詳細: マージ関数

### ファイル構造

```typescript
// packages/core/src/estat/merge-{category}-scoring.ts

import type { CityIndicators, IndicatorValue } from "../scoring/types";

export function merge{Category}IntoScoringInput(
  existing: ReadonlyArray<CityIndicators>,
  statsMap: ReadonlyMap<string, {Category}Stats>,
): ReadonlyArray<CityIndicators> {
  return existing.map((city) => {
    const stats = statsMap.get(city.areaCode);
    const newIndicators: IndicatorValue[] = [
      {
        indicatorId: "indicator_a_per_capita",
        rawValue: stats?.indicatorA ?? null,
        dataYear: stats?.dataYear ?? "",
        sourceId: "estat",
      },
      {
        indicatorId: "indicator_b_per_capita",
        rawValue: stats?.indicatorB ?? null,
        dataYear: stats?.dataYear ?? "",
        sourceId: "estat",
      },
    ];
    return {
      ...city,
      indicators: [...city.indicators, ...newIndicators],
    };
  });
}
```

### 重要ルール

- `indicatorId` は `presets.ts` の指標定義 `id` と**完全一致**させること
- `sourceId` は通常 `"estat"`（静的データの場合のみ `"static"`）
- 不変パターン: 既存の `city` オブジェクトを変更せず、新しいオブジェクトを返す
- データがない都市も `rawValue: null` で指標エントリを追加する

## Step 3 詳細: 型定義更新

### ReportRow への追加

`packages/core/src/types.ts` の `ReportRow` インターフェースに新フィールドを追加する。

```typescript
// packages/core/src/types.ts

export interface ReportRow {
  // ... 既存フィールド ...

  /** Phase N: {category} */
  readonly newIndicatorPerCapita?: number | null;
  readonly anotherIndicator?: number | null;
}
```

### 命名規約

- フィールド名は camelCase（例: `hospitalsPerCapita`）
- presets.ts の `id`（snake_case）とは異なる点に注意
- `CategoryIndicatorCards` の mapping で snake_case の id → camelCase のフィールド名にマッピングする

### 注意: boolean 型フィールド

`floodRisk` のように boolean 型として定義する場合は、`formatValue` 関数が `typeof raw === "boolean"` で分岐し `"あり"/"なし"` に変換する。数値型として定義する場合は precision に応じたフォーマットが適用される。

## Step 4 詳細: スコアリング更新

### IndicatorDefinition 構造

```typescript
interface IndicatorDefinition {
  readonly id: string;          // snake_case（merge の indicatorId と一致）
  readonly label: string;       // 日本語ラベル
  readonly unit: string;        // 表示単位
  readonly direction: "higher_better" | "lower_better";
  readonly category: IndicatorCategory;
  readonly precision: number;   // 小数桁数（0=整数, 1=小数1桁, 2=小数2桁）
}
```

### 単位の命名規約

| 基準人口 | 単位表記 | 使用例 |
|---------|---------|--------|
| 千人あたり | `"件/千人"` | crime_rate |
| 万人あたり | `"校/万人"`, `"駅/万人"` | education, transport |
| 10万人あたり | `"施設/10万人"` | healthcare |
| 絶対値 | `"人"`, `"箇所"`, `"万円"`, `"km"` | population, evacuation_sites |
| 比率 | `"%"` | kids_ratio |

### WeightPreset 更新ルール

全カテゴリの weights 合計が**必ず 1.0** になること。

現在の7カテゴリ:
```
childcare + price + safety + disaster + transport + education + healthcare = 1.0
```

新カテゴリ追加時は既存カテゴリの重みを**按分して削減**する。
例: 新カテゴリ `welfare` を 0.10 で追加する場合、他のカテゴリから均等に 0.10/7 ≒ 0.014 ずつ削減。

各プリセットの特徴を維持すること:
- `CHILDCARE_FOCUSED`: childcare が最大
- `PRICE_FOCUSED`: price が最大
- `SAFETY_FOCUSED`: safety + disaster が最大

## Step 5 詳細: データセット定義追加

### DATASETS への追加

`packages/core/src/config/datasets.ts` の `DATASETS` オブジェクトに新キーを追加する。

```typescript
// packages/core/src/config/datasets.ts

export const DATASETS = {
  // ... 既存キー ...
  newCategory: {
    statsDataId: "0003XXXXXX",
    label: "{カテゴリ}統計",
  },
} as const satisfies Record<string, DatasetPreset>;
```

e-Stat API の統計表 ID（statsDataId）は e-Stat のデータベースページから取得する。

## Step 6 詳細: パイプライン統合

### report-pipeline.ts の変更箇所

`packages/core/src/pipeline/report-pipeline.ts` に4つの変更を加える:

```typescript
// 1. import 追加
import { build{Category}Data } from "../estat/{category}-data";
import { merge{Category}IntoScoringInput } from "../estat/merge-{category}-scoring";
import { DATASETS } from "../config/datasets";

// 2. Phase N としてデータ取得を追加
// runReportPipeline 関数内の既存 Phase の後に追加
const categoryData = await build{Category}Data(
  estatClient,
  areaCodes,
  { statsDataId: DATASETS.newCategory.statsDataId },
);

// 3. マージ関数でスコアリング入力に統合
scoringInput = merge{Category}IntoScoringInput(scoringInput, categoryData);

// 4. enrichRows に新データのマッピングを追加
// enrichRows 関数内で ReportRow にデータを埋め込む
const categoryStats = categoryData.get(row.areaCode);
return {
  ...row,
  newIndicatorPerCapita: categoryStats?.indicatorA ?? null,
};
```

### 重要: Phase の順序

各 Phase の実行順序は `runReportPipeline` 関数内で定義される。新 Phase は既存の Phase の後に追加する。Phase 間のデータ依存関係がある場合（例: 人口データを使った perCapita 計算）は、依存する Phase が先に実行されるよう配置すること。

## Step 7 詳細: バレルエクスポート

### index.ts への追加

`packages/core/src/index.ts` に新モジュールの全エクスポートを追加する:

```typescript
// packages/core/src/index.ts

// ... 既存エクスポート ...

// Phase N: {category}
export { build{Category}Data } from "./estat/{category}-data";
export type {
  {Category}DataConfig,
  {Category}Stats,
} from "./estat/{category}-data";
export { merge{Category}IntoScoringInput } from "./estat/merge-{category}-scoring";
```

### チェックポイント

追加後に `pnpm --filter @townlens/core build` を実行して、エクスポートが正しいか確認する。web パッケージから `import { build{Category}Data } from "@townlens/core"` で参照できることを検証する。

## Step 8 詳細: Web 表示層更新

### category-indicator-cards.tsx

`getRawValue` 関数内の mapping オブジェクトに新指標を追加する:

```typescript
const mapping: Record<string, (d: CityRawData) => number | boolean | null | undefined> = {
  // ... 既存マッピング ...
  new_indicator_per_capita: (d) => d.newIndicatorPerCapita,
};
```

mapping のキーは presets.ts の指標 `id`（snake_case）、値は CityRawData のフィールド（camelCase）へのアクセサ関数。

### city-data.ts

`CityRawData` インターフェースに新フィールドを追加し、`fetchCityPageDataInternal` 関数でデータを取得する:

```typescript
export interface CityRawData {
  // ... 既存フィールド ...
  newIndicatorPerCapita?: number | null;
}
```

### colors.ts

`CATEGORY_COLORS` に新カテゴリを追加する:

```typescript
export const CATEGORY_COLORS = {
  // ... 既存カテゴリ ...
  new_category: {
    primary: "#2563eb",
    light: "#dbeafe",
    dark: "#1e3a8a",
    emoji: "🆕",
    label: "新カテゴリ",
  },
};
```

絵文字・ラベル・カラーコードはカテゴリの意味に合わせて選択する。

## Step 9 詳細: テストケース

### データ取得テスト（{category}-data.test.ts）

```typescript
describe("build{Category}Data", () => {
  // 1. 正常系: データ取得と perCapita 変換
  it("正常系: 指標値が正しく取得される");

  // 2. 空入力: areaCodes が空
  it("areaCodes が空のとき空 Map を返す");

  // 3. 部分データ: 一部指標のみ取得できた場合
  it("一部指標が欠損しても他の指標は取得される");

  // 4. 年フォールバック
  it("最新年にデータがない場合にフォールバックする");

  // 5. 区再編対応
  it("浜松市の旧区コードが新コードに集約される");
});
```

### マージテスト（merge-{category}-scoring.test.ts）

```typescript
describe("merge{Category}IntoScoringInput", () => {
  // 6. 不変マージ
  it("既存の indicators を変更せず新指標を追加する");

  // 7. null データ
  it("statsMap にない都市は rawValue: null になる");

  // 8. 空マップ
  it("空の statsMap でも全都市に null 指標が追加される");
});
```

### テストのモックパターン

```typescript
vi.mock("axios");

function createAxiosMock() {
  const instance = { get: vi.fn() };
  vi.mocked(axios.create).mockReturnValue(instance as any);
  return instance;
}

beforeEach(() => {
  vi.clearAllMocks();
});
```

## 既知の注意点

### 浜松市区再編

2024年の浜松市区再編対応。`expandAreaCodes` と `aggregateRawValues` / `aggregatePerCapitaValues` / `aggregateBooleanValues` で旧区コードと新区コードの変換・集約が行われる。新指標追加時も必ずこの変換を通すこと。

詳細: `packages/core/src/estat/meta/ward-reorganization.ts`

### バレルエクスポート忘れ

`packages/core/src/index.ts` のバレルエクスポート更新を忘れると、web パッケージから import できずビルドエラーになる。CLAUDE.md にも注意事項として記載済み。

### ALL_INDICATORS への追加

`presets.ts` の `ALL_INDICATORS` 配列に新指標定義をスプレッドで追加すること:

```typescript
export const ALL_INDICATORS: ReadonlyArray<IndicatorDefinition> = [
  ...POPULATION_INDICATORS,
  ...PRICE_INDICATORS,
  ...SAFETY_INDICATORS,
  ...DISASTER_INDICATORS,
  ...EDUCATION_INDICATORS,
  ...TRANSPORT_INDICATORS,
  ...HEALTHCARE_INDICATORS,
  ...NEW_CATEGORY_INDICATORS,  // ← 追加
];
```

### CATEGORY_COLORS への追加

`packages/core/src/charts/colors.ts` に新カテゴリの色・絵文字・ラベルを追加しないと、Web の表示でカテゴリヘッダーが表示されない。

### CategoryIndicatorCards の childcare スキップ

`category-indicator-cards.tsx` の `groupByCategory` 関数で `def.category === "childcare"` の場合はスキップされる（人口系指標は基本統計で別表示のため）。新カテゴリでは通常このスキップは不要だが、同様に別表示する場合はここに条件を追加する。
