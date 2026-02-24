---
name: indicator-display-verify
description: >
  This skill should be used when the user asks to
  "指標の表示を確認", "指標の整合性を検証",
  "表示されない指標がないかチェック", "単位が正しいか確認",
  or after adding a new indicator category,
  or when modifying presets.ts, CategoryIndicatorCards, merge-*-scoring files,
  or city-data.ts.
  Verifies consistency between indicator definitions and display components across
  the full pipeline from presets to UI.
---

# 指標表示の整合性検証

presets.ts の全指標定義から、データ取得（merge-*.ts）、型定義（types.ts）、表示コンポーネント（CategoryIndicatorCards.tsx）まで、指標データの一貫性を検証する。

## 検証対象ファイル

以下のファイルを全て読み取ること:

**定義層:**
1. `packages/core/src/scoring/presets.ts` — 全指標定義（ALL_INDICATORS）
2. `packages/core/src/scoring/types.ts` — IndicatorDefinition, IndicatorCategory

**データ層:**
3. `packages/core/src/estat/merge-crime-scoring.ts` — 犯罪統計マージ
4. `packages/core/src/estat/merge-education-scoring.ts` — 教育統計マージ
5. `packages/core/src/estat/merge-healthcare-scoring.ts` — 医療統計マージ
6. `packages/core/src/estat/merge-transport-scoring.ts` — 交通利便性マージ
7. `packages/core/src/reinfo/merge-scoring.ts` — 不動産価格マージ
8. `packages/core/src/reinfo/merge-disaster-scoring.ts` — 災害リスクマージ

**型定義層:**
9. `packages/core/src/types.ts` — ReportRow

**表示層:**
10. `packages/web/src/lib/city-data.ts` — CityRawData インターフェース
11. `packages/web/src/components/city/category-indicator-cards.tsx` — getRawValue mapping, formatValue
12. `packages/core/src/charts/colors.ts` — CATEGORY_COLORS

## 検証手順

### Step 1: 全指標をテーブル形式で列挙

`presets.ts` の `ALL_INDICATORS` を読み取り、以下のテーブルを生成する:

```markdown
| # | id | label | unit | direction | category | precision |
|---|-----|-------|------|-----------|----------|-----------|
```

指標数が期待値（現在13個）と一致するか確認する。

### Step 2: CategoryIndicatorCards の mapping との突合

`category-indicator-cards.tsx` の `getRawValue` 関数内の mapping オブジェクトから全キーを抽出し、presets.ts の全指標 id と突合する。

**意図的除外:**
- `population_total` — childcare カテゴリ、基本統計で別表示
- `kids_ratio` — childcare カテゴリ、基本統計で別表示

チェック項目:
- mapping に存在するが presets.ts にない id
- presets.ts に存在するが mapping にない id（意図的除外を除く）

### Step 3: merge-*-scoring.ts の indicatorId 一致確認

各 merge ファイルから `indicatorId` の値を抽出し、presets.ts の対応する指標 id と一致するか確認する。

期待されるマッピングは `references/indicator-catalog.md` を参照。

### Step 4: 型定義の一貫性

`types.ts` の `ReportRow` フィールドと `city-data.ts` の `CityRawData` フィールドを比較する。

チェック項目:
- ReportRow にあって CityRawData にないフィールド（レポート専用は許容）
- CityRawData にあって ReportRow にないフィールド
- presets.ts に指標定義があるが型定義に対応フィールドがないもの

### Step 5: 単位・precision・direction の検証

各指標について:
- **単位の適切さ**: 「千人あたり」「万人あたり」「10万人あたり」の使い分けが `build-*-data.ts` の計算ロジックと一致するか
- **precision の一貫性**: 同一カテゴリ内で精度が揃っているか
- **direction の正しさ**: 値が大きい/小さいほうが良い判定が意味的に正しいか

### Step 6: null/未取得データのフォールバック確認

`formatValue` 関数を確認:
- `null` → `"-"` にフォールバックされるか
- `undefined` → `"-"` にフォールバックされるか
- `boolean` → `"あり"/"なし"` に変換されるか
- `flood_risk` の型変換パス: merge では `riskScore`(number)、表示では `floodRisk`(boolean) — 変換が正しいか

### Step 7: CATEGORY_COLORS の完全性チェック

`colors.ts` の `CATEGORY_COLORS` に `IndicatorCategory` の全カテゴリのエントリがあるか確認する。

## レポート出力

以下の形式で結果を報告する:

```markdown
## 指標表示の整合性検証レポート

### 指標一覧 (presets.ts: N 個)
| # | id | label | unit | direction | category | precision |
|---|-----|-------|------|-----------|----------|-----------|

### mapping 突合 (CategoryIndicatorCards)
| presets.ts の id | mapping に存在 | 備考 |
|-----------------|--------------|------|
（意図的除外は "除外(基本統計で表示)" と記載）

### merge ファイル indicatorId 突合
| merge ファイル | indicatorId | presets.ts 一致 |
|-------------|-------------|---------------|

### 型定義の一貫性
| フィールド | ReportRow | CityRawData | 状態 |
|----------|-----------|-------------|------|

### 単位・precision・direction
| id | unit | precision | direction | 問題 |
|----|------|-----------|-----------|------|

### CATEGORY_COLORS 完全性
| カテゴリ | colors.ts に存在 |
|---------|----------------|

### 発見された問題
1. [問題の説明と影響範囲]

### 推奨アクション
1. [具体的な修正提案]
```

## 参考リソース

### リファレンスファイル

全13指標の完全カタログと既知の不整合は:
- **`references/indicator-catalog.md`** — 全指標マッピングテーブル、意図的除外、既知の不整合（flood_risk, landslideRisk, clinics_per_capita）、formatValue 挙動仕様、人口当たり単位の換算基準
