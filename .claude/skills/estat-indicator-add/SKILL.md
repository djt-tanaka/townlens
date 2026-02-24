---
name: estat-indicator-add
description: >
  This skill should be used when the user asks to
  "新しい指標を追加", "指標カテゴリを追加",
  "e-Stat の新しいデータを取り込む",
  "環境指標を追加", "福祉指標を追加",
  or mentions adding a new indicator category to TownLens.
  Guides the 9-step process for adding a new e-Stat indicator category
  across core, web, and test packages.
---

# e-Stat 指標カテゴリ追加ガイド

TownLens に新しい指標カテゴリを追加する際の9ステップガイド。
healthcare（医療）カテゴリの実装をテンプレートとして使用する。

## 前提確認

実装を開始する前に以下を確認する:

1. `packages/core/src/scoring/types.ts` の `IndicatorCategory` を読み取り、追加するカテゴリ名が重複しないか確認
2. e-Stat API で追加する統計表の `statsDataId` を特定
3. 追加する指標の一覧（ID、ラベル、単位、方向、精度）を決定

## テンプレートファイルの読み取り

実装前に以下のテンプレートを読み取り、パターンを把握する:

- `packages/core/src/estat/healthcare-data.ts` — データ取得モジュール
- `packages/core/src/estat/merge-healthcare-scoring.ts` — マージ関数
- `packages/core/tests/estat/healthcare-data.test.ts` — データ取得テスト
- `packages/core/tests/estat/merge-healthcare-scoring.test.ts` — マージテスト

## 9ステップの概要

### Step 1: Core — データ取得モジュール新規作成

**ファイル:** `packages/core/src/estat/{category}-data.ts`

healthcare-data.ts をテンプレートとして:
- `{Category}DataConfig` インターフェースを定義（statsDataId, timeCode?）
- `{Category}Stats` インターフェースを定義（各指標フィールド: number | null, dataYear: string）
- 指標自動検出関数を実装（normalizeLabel で e-Stat 分類名から指標検出）
- `build{Category}Data` メイン関数を実装（expandAreaCodes で区再編対応、resolveTimeCandidates で最新年自動選択）

### Step 2: Core — マージ関数新規作成

**ファイル:** `packages/core/src/estat/merge-{category}-scoring.ts`

merge-healthcare-scoring.ts をテンプレートとして:
- `merge{Category}IntoScoringInput` 関数をエクスポート
- 各指標の `indicatorId` は presets.ts の `id` と一致させる（snake_case）
- `sourceId` は `"estat"` とする
- データがない都市は `rawValue: null` で追加（不変パターン）

### Step 3: Core — 型定義更新

**ファイル:** `packages/core/src/types.ts`

`ReportRow` インターフェースに新フィールドを追加:
```typescript
/** Phase N: {category} */
readonly newFieldPerCapita?: number | null;
```

### Step 4: Core — スコアリング更新

**ファイル:**
- `packages/core/src/scoring/types.ts` — `IndicatorCategory` に新カテゴリを追加
- `packages/core/src/scoring/presets.ts` — 新指標定義配列を追加 + `ALL_INDICATORS` に追加 + 全 `WeightPreset` の weights を更新

指標定義の構造:
```typescript
{
  id: "snake_case_id",
  label: "日本語ラベル",
  unit: "単位",
  direction: "higher_better" | "lower_better",
  category: "new_category",
  precision: N,
}
```

**重要:** 全 WeightPreset（CHILDCARE_FOCUSED, PRICE_FOCUSED, SAFETY_FOCUSED）の weights 合計が 1.0 になるよう調整すること。

### Step 5: Core — データセット定義追加

**ファイル:** `packages/core/src/config/datasets.ts`

DATASETS に新エントリを追加（statsDataId とラベル）。

### Step 6: Core — パイプライン統合

**ファイル:** `packages/core/src/pipeline/report-pipeline.ts`

- 新モジュールの import を追加
- 新 Phase として `build{Category}Data` を呼び出し
- `merge{Category}IntoScoringInput` でスコアリング入力にマージ
- `enrichRows` に新データのマッピングを追加

### Step 7: Core — バレルエクスポート

**ファイル:** `packages/core/src/index.ts`

新モジュールの全エクスポートを追加:
- `build{Category}Data` 関数
- `{Category}DataConfig`, `{Category}Stats` 型
- `merge{Category}IntoScoringInput` 関数
- 新 INDICATORS 配列

### Step 8: Web — 表示層更新

**ファイル:**
- `packages/web/src/components/city/category-indicator-cards.tsx` — `getRawValue` の mapping に新指標 ID → CityRawData フィールドのマッピングを追加
- `packages/web/src/lib/city-data.ts` — `CityRawData` インターフェースに新フィールドを追加、`fetchCityPageDataInternal` に新 Phase のデータ取得処理を追加
- `packages/core/src/charts/colors.ts` — `CATEGORY_COLORS` に新カテゴリの色・絵文字・ラベルを追加

### Step 9: テスト作成

**ファイル:**
- `packages/core/tests/estat/{category}-data.test.ts`
- `packages/core/tests/estat/merge-{category}-scoring.test.ts`

テンプレート: `healthcare-data.test.ts` / `merge-healthcare-scoring.test.ts`

必須テストケース: 正常系、空入力、部分データ、年フォールバック、区再編、不変マージ、null データ。

## 完了チェックリスト

- [ ] `pnpm build` が成功する
- [ ] `pnpm test:run` が成功する
- [ ] `pnpm test:coverage` で 80% 以上
- [ ] `IndicatorCategory` 型に新カテゴリが追加されている
- [ ] `WeightPreset` の weights 合計が各プリセットで 1.0
- [ ] `ALL_INDICATORS` に新指標が含まれている
- [ ] `index.ts` のバレルエクスポートが更新されている
- [ ] `DATASETS` に新 `statsDataId` が追加されている
- [ ] `CATEGORY_COLORS` に新カテゴリが追加されている
- [ ] `CategoryIndicatorCards` の mapping が更新されている

## 参考リソース

### リファレンスファイル

各ステップの詳細な実装指示とテンプレートコードは:
- **`references/implementation-steps.md`** — 全9ステップの詳細手順、IndicatorDefinition 構造、WeightPreset ルール、テストケースパターン、既知の注意点
